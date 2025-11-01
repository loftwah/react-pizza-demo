import { z } from 'zod';
import { getPizzaById } from '../domain/menu';
import { isIngredientId } from '../domain/ingredients';
import {
  normalizeCustomization,
  priceForConfiguration,
  sizeLabels,
} from '../domain/pizza';
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

const PizzaSizeEnum = z.enum(['small', 'medium', 'large']);

const IngredientSelectionSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  price: z.number().finite().nonnegative(),
  category: z.enum(['savoury', 'dessert']).optional(),
  dietary: z
    .object({
      vegetarian: z.boolean().optional(),
      vegan: z.boolean().optional(),
    })
    .optional(),
});

const LineItemCustomizationSchema = z
  .object({
    removedIngredients: z.array(z.string().trim().min(1)).optional(),
    addedIngredients: z.array(IngredientSelectionSchema).optional(),
  })
  .optional();

const OrderLineItemSchema = z.object({
  id: z.string().trim().min(1),
  pizzaId: z.string().trim().min(1),
  size: PizzaSizeEnum,
  name: z.string().trim().min(1),
  sizeLabel: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().finite().nonnegative(),
  lineTotal: z.number().finite().nonnegative(),
  customization: LineItemCustomizationSchema,
});

const OrderRunInputSchema = z.object({
  customer: z.string().trim().min(1),
  contact: z.string().trim().min(1),
  instructions: z
    .string()
    .trim()
    .max(500, 'Instructions must be 500 characters or fewer.')
    .optional(),
  cartDetails: z.array(OrderLineItemSchema).min(1),
  cartTotal: z.number().finite().nonnegative(),
});

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

const sanitizeCustomization = (
  customization: z.infer<typeof LineItemCustomizationSchema>,
): OrderLineItem['customization'] => {
  if (!customization) return undefined;
  const removedIngredients = Array.from(
    new Set(
      (customization.removedIngredients ?? [])
        .map((ingredient) => ingredient.trim())
        .filter(Boolean),
    ),
  );
  const addedIngredients =
    customization.addedIngredients?.map((ingredient) => ({
      ...ingredient,
      name: ingredient.name.trim(),
      price: Math.round(Math.max(0, ingredient.price) * 100) / 100,
    })) ?? [];
  if (removedIngredients.length === 0 && addedIngredients.length === 0) {
    return undefined;
  }
  return { removedIngredients, addedIngredients };
};

const toPizzaCustomization = (customization: OrderLineItem['customization']) =>
  customization
    ? normalizeCustomization({
        removedIngredients: customization.removedIngredients,
        addedIngredients: customization.addedIngredients
          .map((ingredient) => ingredient.id)
          .filter(isIngredientId),
      })
    : undefined;

export class OrderService {
  static steps = [
    'validateInput',
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
    Exclude<(typeof OrderService)['steps'][number], 'validateInput'>,
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
    const timeline: StepLog[] = [];
    const degraded: StepLog[] = [];

    const validation = await this.validateInput(input);

    timeline.push({
      step: 'validateInput',
      status: validation.status,
      attempts: validation.attempts,
      error: validation.error,
      nextStep: validation.nextStep,
    });

    if (validation.status === 'failed') {
      return {
        ...err(
          validation.error ?? {
            kind: 'InputInvalid',
            message: 'Order input failed validation.',
            retryable: false,
          },
        ),
        timeline,
        degraded,
        correlationId,
      };
    }

    let context: OrderRunContext = {
      ...input,
      instructions: input.instructions?.trim?.() ?? '',
      correlationId,
    };

    if (validation.value) {
      context = {
        ...context,
        ...validation.value,
        instructions: validation.value.instructions ?? '',
      };
    }

    const pipelineSteps = OrderService.steps.slice(1) as Exclude<
      (typeof OrderService)['steps'][number],
      'validateInput'
    >[];

    for (const step of pipelineSteps) {
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

  private async validateInput(
    input: OrderRunInput,
  ): Promise<StepResult<Partial<OrderRunContext>>> {
    const validation = OrderRunInputSchema.safeParse(input);
    if (!validation.success) {
      const message =
        validation.error.issues.map((issue) => issue.message).join(', ') ||
        'Order input failed validation.';
      return {
        status: 'failed',
        attempts: 1,
        error: {
          kind: 'InputInvalid',
          message,
          retryable: false,
        },
        nextStep:
          'Ensure customer name, contact, and at least one cart item are provided before submitting.',
      };
    }

    const sanitized = {
      ...validation.data,
      instructions: validation.data.instructions ?? '',
      cartDetails: validation.data.cartDetails.map((item) => {
        const customization = sanitizeCustomization(item.customization);
        return {
          ...item,
          name: item.name.trim(),
          sizeLabel: item.sizeLabel.trim(),
          unitPrice: Math.round(item.unitPrice * 100) / 100,
          lineTotal: Math.round(item.lineTotal * 100) / 100,
          customization,
        };
      }),
    };

    return {
      status: 'ok',
      attempts: 1,
      value: sanitized,
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
            const sizeLabel =
              menuItem.sizeLabelsOverride?.[resolvedSize] ??
              sizeLabels[resolvedSize];
            const configuration = toPizzaCustomization(lineItem.customization);
            const unitPrice = priceForConfiguration(
              menuItem,
              resolvedSize,
              configuration,
            );
            const hydrated: OrderLineItem = {
              ...lineItem,
              name: menuItem.displayName,
              sizeLabel,
              unitPrice,
              lineTotal: Math.round(unitPrice * lineItem.quantity * 100) / 100,
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
