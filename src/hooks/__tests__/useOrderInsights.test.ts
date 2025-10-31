import { describe, expect, it } from 'vitest';
import type { OrderRecord } from '../../stores/orders';
import { computeOrderInsights } from '../useOrderInsights';

const buildOrder = (
  overrides: Partial<OrderRecord> & Pick<OrderRecord, 'id'>,
): OrderRecord => ({
  id: overrides.id,
  customer: overrides.customer ?? 'Customer',
  contact: overrides.contact ?? 'customer@example.com',
  instructions: overrides.instructions ?? '',
  total: overrides.total ?? 0,
  createdAt: overrides.createdAt ?? new Date().toISOString(),
  items: overrides.items ?? [],
  submission: overrides.submission,
});

describe('computeOrderInsights', () => {
  it('calculates summary, recent orders, and derived telemetry', () => {
    const oldest = buildOrder({
      id: 'order-1',
      total: 32.5,
      createdAt: '2025-01-07T10:00:00+11:00',
      submission: {
        status: 'ok',
        message: 'Accepted',
        kitchenReference: 'K-100',
        estimatedPrepMinutes: 18,
        receivedAt: '2025-01-07T10:01:00+11:00',
      },
    });

    const mid = buildOrder({
      id: 'order-2',
      total: 28.75,
      createdAt: '2025-01-07T11:30:00+11:00',
      submission: {
        status: 'ok',
        message: 'Accepted',
        kitchenReference: 'K-101',
        estimatedPrepMinutes: 16,
        receivedAt: '2025-01-07T11:31:00+11:00',
      },
    });

    const newest = buildOrder({
      id: 'order-3',
      total: 41.25,
      createdAt: '2025-01-07T12:45:00+11:00',
    });

    const result = computeOrderInsights([newest, mid, oldest], {
      recentLimit: 2,
    });

    expect(result.summary.totalOrders).toBe(3);
    expect(result.summary.totalRevenue).toBeCloseTo(102.5);
    expect(result.summary.averagePrep).toBeCloseTo(17);
    expect(result.summary.latestOrder?.id).toBe('order-3');
    expect(result.summary.latestSubmission?.id).toBe('order-2');

    expect(result.recentOrders.map((order) => order.id)).toEqual([
      'order-3',
      'order-2',
    ]);

    expect(result.sparkline).toHaveLength(3);
    expect(result.sparkline.at(-1)?.value).toBe(3);

    expect(result.hourlyBuckets).toEqual([
      { hour: '10:00', orders: 1 },
      { hour: '11:00', orders: 1 },
      { hour: '12:00', orders: 1 },
    ]);
  });

  it('handles empty or malformed input gracefully', () => {
    const invalid = buildOrder({
      id: 'invalid-order',
      createdAt: 'not-a-date',
      total: 12,
    });

    const result = computeOrderInsights([invalid]);
    expect(result.summary.totalOrders).toBe(1);
    expect(result.summary.latestOrder?.id).toBe('invalid-order');
    expect(result.hourlyBuckets).toEqual([]);
    expect(result.sparkline).toEqual([]);
  });
});
