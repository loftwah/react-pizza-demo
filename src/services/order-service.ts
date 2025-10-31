import { getPizzaById } from '../domain/menu';
import { sizeLabels, priceForSize } from '../domain/pizza';
import type { OrderLineItem, OrderRecord } from '../stores/orders';
import { useOrderHistory } from '../stores/orders';
import { useCartStore } from '../stores/cart';
import {
  err,
  ok,
  type PipelineResult,
  type StepError,
  type StepLog,
  type StepResult,
} from '../shared-utils/result';
import { retryWithBackoff } from '../shared-utils/retry-with-backoff';
import { createCorrelationId, emitEvent } from '../shared-utils/telemetry';
import { submitOrderToKitchen } from './mock-backend';

const generateOrderId = () =>
  `LP-${Date.now().toString(36).toUpperCase().slice(-5)}`;

export type OrderRunInput = {
  customer: string;
  contact: string;
  instructions: string;
  cartDetails: OrderLineItem[];
  cartTotal: number;
};

type OrderRunContext = OrderRunInput & {
  correlationId: string;
  orderId?: string;
  order?: OrderRecord;
};

type StepHandler = (
  context: OrderRunContext,
) => Promise<StepResult<Partial<OrderRunContext>>>;

const unknownError = (message: string): StepError => ({
  kind: 'Unknown',
  message,
  retryable: false,
});

export class OrderService {
  static steps = [
    'validateCustomer',
    'validateCart',
    'generateOrderReference',
    'persistOrder',
    'clearCart',
    'emitAnalytics',
  ] as const;

  static describe() {
    return [...OrderService.steps];
  }

  private readonly handlers: Record<
    (typeof OrderService)['steps'][number],
    StepHandler
  > = {
    validateCustomer: this.validateCustomer,
    validateCart: this.validateCart,
    generateOrderReference: this.generateOrderReference,
    persistOrder: this.persistOrder,
    clearCart: this.clearCart,
    emitAnalytics: this.emitAnalytics,
  };

  async run(input: OrderRunInput): Promise<PipelineResult<OrderRecord>> {
    const correlationId = createCorrelationId();
    let context: OrderRunContext = { ...input, correlationId };
    const timeline: StepLog[] = [];
    const degraded: StepLog[] = [];

    for (const step of OrderService.steps) {
      const handler = this.handlers[step];
      const result = await handler.call(this, context);
      const log: StepLog = {
        step,
        status: result.status,
        attempts: result.attempts,
        error: result.error,
        nextStep: result.nextStep,
      };
      timeline.push(log);

      if (result.status === 'degraded') {
        degraded.push(log);
      }

      if (result.status === 'failed') {
        return {
          ...err(
            result.error ?? {
              kind: 'StepFailed',
              message: `Order pipeline failed during ${step}.`,
              retryable: false,
            },
          ),
          timeline,
          degraded,
          correlationId,
        };
      }

      if (result.value) {
        context = { ...context, ...result.value };
      }
    }

    if (!context.order) {
      return {
        ...err(
          unknownError(
            'Order pipeline finished without an order payload. Please retry.',
          ),
        ),
        timeline,
        degraded,
        correlationId,
      };
    }

    return {
      ...ok(context.order),
      timeline,
      degraded,
      correlationId,
    };
  }

  private async validateCustomer(
    context: OrderRunContext,
  ): Promise<StepResult<Partial<OrderRunContext>>> {
    if (!context.customer || !context.contact) {
      return {
        status: 'failed',
        attempts: 1,
        error: {
          kind: 'CustomerDetailsMissing',
          message: 'Customer name and contact details are required.',
          retryable: false,
        },
        nextStep: 'Provide customer name and contact information.',
      };
    }

    return { status: 'ok', attempts: 1 };
  }

  private async validateCart(
    context: OrderRunContext,
  ): Promise<StepResult<Partial<OrderRunContext>>> {
    if (context.cartDetails.length === 0) {
      return {
        status: 'failed',
        attempts: 1,
        error: {
          kind: 'EmptyCart',
          message: 'Add pizzas to your cart before submitting an order.',
          retryable: false,
        },
        nextStep: 'Navigate to the menu and add at least one pizza.',
      };
    }

    const missingDetails = context.cartDetails.filter(
      (item) => !item.name || !item.sizeLabel,
    );
    if (missingDetails.length > 0) {
      return {
        status: 'degraded',
        attempts: 1,
        error: {
          kind: 'LineItemIncomplete',
          message:
            'Some line items were missing metadata. They will be rehydrated from menu data.',
          retryable: false,
        },
        nextStep: 'Verify the menu data contains names and size labels.',
        value: {
          cartDetails: context.cartDetails.map((lineItem) => {
            if (lineItem.name && lineItem.sizeLabel) return lineItem;
            const menuItem = getPizzaById(lineItem.pizzaId ?? '');
            if (!menuItem) return lineItem;
            const resolvedSize = lineItem.size ?? 'medium';
            const hydrated: OrderLineItem = {
              ...lineItem,
              name: menuItem.displayName,
              sizeLabel: sizeLabels[resolvedSize],
              unitPrice: priceForSize(menuItem, resolvedSize),
              lineTotal:
                Math.round(
                  priceForSize(menuItem, resolvedSize) *
                    lineItem.quantity *
                    100,
                ) / 100,
            };
            return hydrated;
          }),
        },
      };
    }

    return { status: 'ok', attempts: 1 };
  }

  private async generateOrderReference(): Promise<
    StepResult<{ orderId: string }>
  > {
    return {
      status: 'ok',
      attempts: 1,
      value: { orderId: generateOrderId() },
    };
  }

  private async persistOrder(
    context: OrderRunContext,
  ): Promise<StepResult<{ order: OrderRecord }>> {
    if (!context.orderId) {
      return {
        status: 'failed',
        attempts: 1,
        error: unknownError('Cannot persist order without an ID.'),
      };
    }

    const order: OrderRecord = {
      id: context.orderId,
      customer: context.customer,
      contact: context.contact,
      instructions: context.instructions,
      total: context.cartTotal,
      createdAt: new Date().toISOString(),
      items: context.cartDetails.map((item) => ({ ...item })),
    };

    const submissionAttempt = await retryWithBackoff(
      () => submitOrderToKitchen(order),
      { tries: 2, baseMs: 400 },
    );

    const submissionError =
      'value' in submissionAttempt ? undefined : submissionAttempt.error;

    const submission =
      'value' in submissionAttempt ? submissionAttempt.value : undefined;

    const withSubmission = submission ? { ...order, submission } : order;

    try {
      useOrderHistory.getState().addOrder(withSubmission);
    } catch (error) {
      return {
        status: 'failed',
        attempts: submissionAttempt.attempts,
        error: {
          kind: 'PersistFailed',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to persist order to history.',
          retryable: true,
        },
      };
    }

    if (submissionError) {
      return {
        status: 'degraded',
        attempts: submissionAttempt.attempts,
        error: {
          kind: 'OrderSubmissionFailed',
          message:
            submissionError instanceof Error
              ? submissionError.message
              : 'Submitting the order to the kitchen mock API failed.',
          retryable: true,
        },
        nextStep:
          'Retry when connectivity returns or inspect the mock API stub.',
        value: { order: withSubmission },
      };
    }

    return {
      status: 'ok',
      attempts: submissionAttempt.attempts,
      value: { order: withSubmission },
    };
  }

  private async clearCart(): Promise<StepResult<Partial<OrderRunContext>>> {
    try {
      useCartStore.getState().clear();
      return { status: 'ok', attempts: 1 };
    } catch (error) {
      return {
        status: 'degraded',
        attempts: 1,
        error: {
          kind: 'CartClearFailed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to clear cart after order completion.',
          retryable: true,
        },
        nextStep: 'Manually clear the cart if it still contains items.',
      };
    }
  }

  private async emitAnalytics(
    context: OrderRunContext,
  ): Promise<StepResult<Partial<OrderRunContext>>> {
    if (!context.order) {
      return {
        status: 'degraded',
        attempts: 1,
        error: unknownError('Analytics step skipped—order is missing.'),
        nextStep: 'Review order creation step for failures.',
      };
    }

    try {
      const attempt = await retryWithBackoff(
        async () => {
          const result = await emitEvent({
            component: 'order-service',
            action: 'emitAnalytics',
            status: 'ok',
            correlationId: context.correlationId,
            payload: {
              orderId: context.order?.id,
              total: context.order?.total,
              itemCount: context.order?.items.length,
            },
          });
          if (!result.ok) {
            throw result.error;
          }
          return true;
        },
        { tries: 2, baseMs: 250 },
      );

      if ('value' in attempt && attempt.value) {
        return { status: 'ok', attempts: attempt.attempts };
      }

      const telemetryError =
        'error' in attempt
          ? (attempt.error as {
              kind?: string;
              message?: string;
              retryable?: boolean;
            })
          : undefined;

      return {
        status: 'degraded',
        attempts: attempt.attempts,
        error: {
          kind: telemetryError?.kind ?? 'AnalyticsFailed',
          message:
            telemetryError?.message ??
            'Failed to emit analytics telemetry payload.',
          retryable: telemetryError?.retryable ?? true,
        },
        nextStep: 'Retry analytics emission when connectivity is restored.',
      };
    } catch (error) {
      return {
        status: 'degraded',
        attempts: 1,
        error: {
          kind: 'AnalyticsFailed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to emit analytics event.',
          retryable: true,
        },
        nextStep: 'Retry analytics emission when connectivity is restored.',
      };
    }
  }
}
