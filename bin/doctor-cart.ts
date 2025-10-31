#!/usr/bin/env tsx

import { setupNodeEnv } from '../scripts/setup-node-env';
import type { OrderRecord } from '../src/stores/orders';

const main = async () => {
  try {
    await setupNodeEnv();

    const [{ getPizzaById }, { priceForSize, sizeLabels }, { useCartStore }] =
      await Promise.all([
        import('../src/domain/menu'),
        import('../src/domain/pizza'),
        import('../src/stores/cart'),
      ]);

    const store = useCartStore.getState();
    store.clear();

    store.addItem('pepperoni-classic', 'medium');
    store.addItem('pepperoni-classic', 'medium');
    store.addItem('firecracker', 'large');

    const totalItems = store.totalItems();
    const totalPrice = Number(store.totalPrice().toFixed(2));

    const samplePizza = getPizzaById('pepperoni-classic');
    const sampleHydratedOrder: OrderRecord = {
      id: 'LP-DEBUG',
      customer: 'Doctor Script',
      contact: 'doctor@loftwah.pizza',
      instructions: 'Sample hydration',
      total: priceForSize(samplePizza!, 'medium'),
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'pepperoni-classic-medium',
          pizzaId: 'pepperoni-classic',
          size: 'medium',
          name: samplePizza!.displayName,
          sizeLabel: sizeLabels.medium,
          quantity: 1,
          unitPrice: priceForSize(samplePizza!, 'medium'),
          lineTotal: priceForSize(samplePizza!, 'medium'),
        },
      ],
    };

    store.hydrateFromOrder(sampleHydratedOrder);

    console.log(
      JSON.stringify(
        {
          ok: true,
          totalItems,
          totalPrice,
          cacheKey: 'loftwah-pizza-cart',
          sampleItem: store.items.at(0) ?? null,
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
              : 'Unknown error while running cart doctor.',
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
};

void main();
