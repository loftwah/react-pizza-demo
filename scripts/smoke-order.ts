import { setupNodeEnv } from './setup-node-env';
import type { Pizza, PizzaSize } from '../src/domain/pizza';
import type { OrderRunInput } from '../src/services/order-service';

type Args = {
  base?: string;
};

const parseArgs = (): Args => {
  const args = process.argv.slice(2);
  const result: Args = {};
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--base') {
      result.base = args[index + 1];
      index += 1;
    }
  }
  return result;
};

const pickSize = (index: number): PizzaSize => {
  if (index % 3 === 0) return 'medium';
  if (index % 3 === 1) return 'large';
  return 'small';
};

const buildCartDetails = (
  selections: Pizza[],
  priceForSize: (pizza: Pizza, size: PizzaSize) => number,
  sizeLabels: Record<PizzaSize, string>,
): OrderRunInput['cartDetails'] =>
  selections.map((pizza, index) => {
    const size = pickSize(index);
    const unitPrice = priceForSize(pizza, size);
    const lineTotal = Math.round(unitPrice * 1 * 100) / 100;
    return {
      id: `${pizza.id}-${size}`,
      pizzaId: pizza.id,
      size,
      name: pizza.displayName,
      sizeLabel: sizeLabels[size],
      quantity: 1,
      unitPrice,
      lineTotal,
    };
  });

const main = async () => {
  const { base } = parseArgs();
  if (!base) {
    throw new Error('Smoke order script requires --base URL');
  }

  process.env.PUBLIC_BASE_URL = base.endsWith('/') ? base : `${base}/`;

  await setupNodeEnv();

  const [
    { fetchMenu },
    { priceForSize, sizeLabels },
    { OrderService },
    { useCartStore },
    { useOrderHistory },
  ] = await Promise.all([
    import('../src/domain/menu'),
    import('../src/domain/pizza'),
    import('../src/services/order-service'),
    import('../src/stores/cart'),
    import('../src/stores/orders'),
  ]);

  const menu = await fetchMenu();
  const selections = menu.slice(0, 2);
  if (selections.length === 0) {
    throw new Error('No menu items available for smoke test.');
  }

  const cartStore = useCartStore.getState();
  cartStore.clear();
  selections.forEach((pizza, index) => {
    cartStore.addItem(pizza.id, pickSize(index));
  });

  const cartDetails = buildCartDetails(selections, priceForSize, sizeLabels);

  const cartTotal = cartDetails.reduce(
    (sum, detail) => sum + detail.lineTotal,
    0,
  );

  const service = new OrderService();
  const result = await service.run({
    customer: 'Smoke Test',
    contact: 'smoke@loftwah.pizza',
    instructions: 'Ensure pipeline integrity.',
    cartDetails,
    cartTotal,
  });

  const history = useOrderHistory.getState();
  const latestOrder = history.orders.at(0) ?? null;
  const persistedOrderMatches =
    result.ok && latestOrder?.id === result.value.id;

  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        correlationId: result.correlationId,
        degradedSteps: result.degraded.map((step) => step.step),
        timeline: result.timeline,
        latestOrderId: latestOrder?.id ?? null,
        persistedOrderMatches,
      },
      null,
      2,
    ),
  );

  if (!result.ok) {
    process.exit(1);
  }
};

void main();
