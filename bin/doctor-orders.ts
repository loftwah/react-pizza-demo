#!/usr/bin/env tsx

import { setupNodeEnv } from '../scripts/setup-node-env';

const buildOrder = (index: number) => {
  const id = `LP-DOCTOR-${index}`;
  const createdAt = new Date(Date.now() - index * 60_000).toISOString();
  return {
    id,
    customer: `Doctor ${index}`,
    contact: `doctor${index}@loftwah.pizza`,
    instructions: index % 2 === 0 ? 'Slice into squares.' : '',
    total: 20 + index,
    createdAt,
    items: [],
  };
};

const main = async () => {
  try {
    await setupNodeEnv();

    const { useOrderHistory } = await import('../src/stores/orders');

    const history = useOrderHistory.getState();
    history.clearOrders();

    Array.from({ length: 12 }).forEach((_, index) => {
      history.addOrder(buildOrder(index));
    });

    const orders = history.orders;
    const latest = orders.at(0);
    const oldest = orders.at(-1);

    console.log(
      JSON.stringify(
        {
          ok: true,
          maxRetained: orders.length,
          latestOrderId: latest?.id ?? null,
          oldestOrderId: oldest?.id ?? null,
          persistKey: 'loftwah-pizza-orders',
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error while running orders doctor.',
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
};

void main();
