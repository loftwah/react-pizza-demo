import { z } from 'zod';
import { getBaseUrl } from '../shared-utils/base-url';
import { isDevEnvironment } from '../shared-utils/env';
import type { OrderRecord, OrderSubmissionReceipt } from '../stores/orders';
const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const OrderSubmissionReceiptSchema = z.object({
  status: z.string().min(1),
  message: z.string().min(1),
  kitchenReference: z.string().min(1),
  estimatedPrepMinutes: z.number().int().nonnegative(),
});

export const submitOrderToKitchen = async (
  order: OrderRecord,
): Promise<OrderSubmissionReceipt> => {
  // Simulate a network round-trip
  await delay(650 + Math.random() * 400);

  const endpoint = `${getBaseUrl()}api/order-response.json`;
  let response: Response | null = null;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: order.id,
        total: order.total,
        itemCount: order.items.length,
      }),
      cache: 'no-store',
    });
  } catch (error) {
    if (isDevEnvironment()) {
      console.warn(
        '[mock-backend] POST request failed, retrying with GET fallback.',
        error,
      );
    }
  }

  if (!response || !response.ok) {
    response = await fetch(endpoint, { cache: 'no-store' });
  }

  if (!response.ok) {
    throw new Error(`Mock order API failed with status ${response.status}`);
  }

  const rawPayload: unknown = await response.json();
  const parsed = OrderSubmissionReceiptSchema.safeParse(rawPayload);
  if (!parsed.success) {
    if (isDevEnvironment()) {
      console.warn(
        '[mock-backend] Invalid submission payload received from mock API',
        parsed.error,
      );
    }
    throw new Error('Mock order API returned invalid payload.');
  }

  return {
    ...parsed.data,
    receivedAt: new Date().toISOString(),
  };
};
