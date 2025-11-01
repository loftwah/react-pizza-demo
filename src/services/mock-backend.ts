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
  const origin =
    typeof window !== 'undefined' && window.location
      ? window.location.origin
      : 'http://localhost';
  const resolvedEndpoint = new URL(endpoint, origin);
  resolvedEndpoint.searchParams.set('orderId', order.id);
  resolvedEndpoint.searchParams.set('items', order.items.length.toString());
  resolvedEndpoint.searchParams.set('total', order.total.toFixed(2));

  const response = await fetch(resolvedEndpoint.toString(), {
    cache: 'no-store',
  });

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
