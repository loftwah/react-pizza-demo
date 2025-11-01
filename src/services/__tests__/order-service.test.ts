import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { getPizzaById } from '../../domain/menu';
import { priceForConfiguration, sizeLabels } from '../../domain/pizza';
import { setupNodeEnv } from '../../../scripts/setup-node-env';
import { OrderService, type OrderRunInput } from '../order-service';
import { useCartStore } from '../../stores/cart';
import { useOrderHistory } from '../../stores/orders';
import { ok, err } from '../../shared-utils/result';
import { getIngredientById } from '../../domain/ingredients';

vi.mock('../mock-backend', () => ({
  submitOrderToKitchen: vi.fn(),
}));

vi.mock('../../shared-utils/telemetry', async () => {
  const actual = await vi.importActual<
    typeof import('../../shared-utils/telemetry')
  >('../../shared-utils/telemetry');
  return {
    ...actual,
    emitEvent: vi.fn(),
    createCorrelationId: () => 'corr-test',
  };
});

const mockedSubmit = vi.mocked(
  await import('../mock-backend').then((m) => m.submitOrderToKitchen),
);

const mockedEmitEvent = vi.mocked(
  await import('../../shared-utils/telemetry').then((m) => m.emitEvent),
);

const buildInput = (): OrderRunInput => {
  const pizza = getPizzaById('pepperoni-classic');
  if (!pizza) {
    throw new Error('Expected pepperoni-classic menu item');
  }
  const size = 'medium';
  const unitPrice = priceForConfiguration(pizza, size);
  return {
    customer: 'Test Customer',
    contact: 'test@example.com',
    instructions: 'Leave at the door.',
    cartDetails: [
      {
        id: `${pizza.id}-${size}`,
        pizzaId: pizza.id,
        size,
        name: pizza.displayName,
        sizeLabel: sizeLabels[size],
        quantity: 1,
        unitPrice,
        lineTotal: unitPrice,
        customization: undefined,
      },
    ],
    cartTotal: unitPrice,
  };
};

beforeAll(async () => {
  process.env.PUBLIC_BASE_URL =
    process.env.PUBLIC_BASE_URL ?? 'http://localhost/';
  await setupNodeEnv();
});

beforeEach(() => {
  mockedSubmit.mockReset();
  mockedEmitEvent.mockReset();
  const cart = useCartStore.getState();
  cart.clear();
  const history = useOrderHistory.getState();
  history.clearOrders();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OrderService.run', () => {
  it('completes successfully when all steps succeed', async () => {
    mockedSubmit.mockResolvedValue({
      status: 'ok',
      message: 'Accepted',
      kitchenReference: 'K-123',
      estimatedPrepMinutes: 18,
      receivedAt: new Date().toISOString(),
    });
    mockedEmitEvent.mockResolvedValue(ok(true));

    const input = buildInput();
    const cart = useCartStore.getState();
    cart.addItem(input.cartDetails[0].pizzaId!, 'medium');

    const service = new OrderService();
    const result = await service.run(input);

    if (!result.ok) {
      throw new Error(
        `Pipeline failed unexpectedly: ${result.error?.message ?? 'unknown'}`,
      );
    }

    expect(result.degraded).toHaveLength(0);
    expect(result.timeline.map((step) => step.step)).toEqual(
      expect.arrayContaining(OrderService.describe()),
    );

    const history = useOrderHistory.getState();
    expect(history.orders[0]?.id).toBe(result.value.id);
    expect(useCartStore.getState().totalItems()).toBe(0);
  });

  it('records degradations when submission and telemetry fail', async () => {
    mockedSubmit.mockRejectedValueOnce(new Error('Mock kitchen offline'));
    mockedSubmit.mockRejectedValueOnce(new Error('Mock kitchen offline'));
    mockedEmitEvent.mockResolvedValue(
      err({
        kind: 'SendFailed',
        message: 'No transport',
        retryable: true,
      }),
    );

    vi.useFakeTimers();

    const input = buildInput();
    const cart = useCartStore.getState();
    cart.addItem(input.cartDetails[0].pizzaId!, 'medium');

    const service = new OrderService();
    const runPromise = service.run(input);
    await vi.runAllTimersAsync();
    const result = await runPromise;

    if (!result.ok) {
      throw new Error(
        `Pipeline failed unexpectedly: ${result.error?.message ?? 'unknown'}`,
      );
    }
    const degradedSteps = result.degraded.map((entry) => entry.step);
    expect(degradedSteps).toContain('persistOrder');
    expect(degradedSteps).toContain('emitAnalytics');

    const persistLog = result.degraded.find(
      (entry) => entry.step === 'persistOrder',
    );
    expect(persistLog?.attempts).toBeGreaterThan(1);

    expect(useCartStore.getState().totalItems()).toBe(0);
    expect(useOrderHistory.getState().orders[0]?.id).toBe(result.value.id);
  });

  it('persists customization metadata with order records', async () => {
    mockedSubmit.mockResolvedValue({
      status: 'ok',
      message: 'Accepted',
      kitchenReference: 'K-202',
      estimatedPrepMinutes: 16,
      receivedAt: new Date().toISOString(),
    });
    mockedEmitEvent.mockResolvedValue(ok(true));

    const input = buildInput();
    const pizza = getPizzaById(input.cartDetails[0]?.pizzaId ?? '');
    if (!pizza) {
      throw new Error('Expected pepperoni-classic menu item');
    }

    const extra = getIngredientById('truffle-oil');
    if (!extra) {
      throw new Error('Expected truffle-oil ingredient');
    }
    const customization = {
      removedIngredients: ['Mozzarella'],
      addedIngredients: [extra],
    };

    const unitPrice = priceForConfiguration(pizza, 'medium', {
      removedIngredients: customization.removedIngredients,
      addedIngredients: customization.addedIngredients.map(
        (ingredient) => ingredient.id,
      ),
    });

    input.cartDetails[0] = {
      ...input.cartDetails[0]!,
      unitPrice,
      lineTotal: unitPrice,
      customization: {
        removedIngredients: [...customization.removedIngredients],
        addedIngredients: customization.addedIngredients.map((ingredient) => ({
          ...ingredient,
        })),
      },
    };
    input.cartTotal = unitPrice;

    const cart = useCartStore.getState();
    cart.addItem(pizza.id, 'medium', {
      removedIngredients: customization.removedIngredients,
      addedIngredients: customization.addedIngredients.map(
        (ingredient) => ingredient.id,
      ),
    });

    const service = new OrderService();
    const result = await service.run(input);

    if (!result.ok) {
      throw new Error(
        `Pipeline failed unexpectedly: ${result.error?.message ?? 'unknown'}`,
      );
    }

    const savedOrder = useOrderHistory.getState().orders[0];
    expect(savedOrder?.items[0]?.customization?.removedIngredients).toEqual([
      'Mozzarella',
    ]);
    expect(
      savedOrder?.items[0]?.customization?.addedIngredients.map(
        (ingredient) => ingredient.id,
      ),
    ).toEqual(['truffle-oil']);
  });
});
