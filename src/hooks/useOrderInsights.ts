import { useMemo } from 'react';
import { useOrderHistory } from '../stores/orders';
import type { OrderRecord } from '../stores/orders';

const HOUR_FORMATTER = new Intl.DateTimeFormat('en-AU', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Australia/Melbourne',
});

type ComputeOptions = {
  recentLimit?: number;
  sparklineWindow?: number;
};

export type OrderInsightsSummary = {
  totalOrders: number;
  totalRevenue: number;
  averagePrep: number | null;
  latestOrder: OrderRecord | null;
  latestSubmission: OrderRecord | null;
};

export type OrderHourlyBucket = {
  hour: string;
  orders: number;
};

export type OrderSparklinePoint = {
  timestamp: string;
  value: number;
};

export type OrderInsightsPayload = {
  summary: OrderInsightsSummary;
  recentOrders: OrderRecord[];
  hourlyBuckets: OrderHourlyBucket[];
  sparkline: OrderSparklinePoint[];
};

const DEFAULT_RECENT_LIMIT = 5;
const DEFAULT_SPARKLINE_WINDOW = 12;

const toHourBucket = (
  iso: string,
): {
  label: string | null;
  timestamp: number | null;
} => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { label: null, timestamp: null };
  }
  date.setMinutes(0, 0, 0);
  return {
    label: HOUR_FORMATTER.format(date),
    timestamp: date.getTime(),
  };
};

export const computeOrderInsights = (
  orders: OrderRecord[],
  options: ComputeOptions = {},
): OrderInsightsPayload => {
  const recentLimit = options.recentLimit ?? DEFAULT_RECENT_LIMIT;
  const sparklineWindow = options.sparklineWindow ?? DEFAULT_SPARKLINE_WINDOW;

  if (orders.length === 0) {
    return {
      summary: {
        totalOrders: 0,
        totalRevenue: 0,
        averagePrep: null,
        latestOrder: null,
        latestSubmission: null,
      },
      recentOrders: [],
      hourlyBuckets: [],
      sparkline: [],
    };
  }

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const submissions = orders.filter((order) => Boolean(order.submission));
  const averagePrep =
    submissions.length > 0
      ? submissions.reduce(
          (sum, order) => sum + (order.submission?.estimatedPrepMinutes ?? 0),
          0,
        ) / submissions.length
      : null;

  const sortedOrdersAsc = [...orders].sort((a, b) => {
    const left = new Date(a.createdAt).getTime();
    const right = new Date(b.createdAt).getTime();
    if (Number.isNaN(left) && Number.isNaN(right)) return 0;
    if (Number.isNaN(left)) return 1;
    if (Number.isNaN(right)) return -1;
    return left - right;
  });

  const sparkline: OrderSparklinePoint[] = [];
  let cumulative = 0;
  for (const order of sortedOrdersAsc.slice(-sparklineWindow)) {
    const timestamp = new Date(order.createdAt);
    if (Number.isNaN(timestamp.getTime())) {
      continue;
    }
    cumulative += 1;
    sparkline.push({
      timestamp: timestamp.toISOString(),
      value: cumulative,
    });
  }

  const bucketMap = new Map<string, { orders: number; timestamp: number }>();

  orders.forEach((order) => {
    const { label, timestamp } = toHourBucket(order.createdAt);
    if (!label || timestamp === null) {
      return;
    }
    const existing = bucketMap.get(label);
    if (existing) {
      existing.orders += 1;
    } else {
      bucketMap.set(label, { orders: 1, timestamp });
    }
  });

  const hourlyBuckets = Array.from(bucketMap.entries())
    .map(([hour, details]) => ({
      hour,
      orders: details.orders,
      timestamp: details.timestamp,
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(({ hour, orders }) => ({ hour, orders }));

  return {
    summary: {
      totalOrders: orders.length,
      totalRevenue,
      averagePrep,
      latestOrder: orders[0] ?? null,
      latestSubmission: submissions[0] ?? null,
    },
    recentOrders: orders.slice(0, recentLimit),
    hourlyBuckets,
    sparkline,
  };
};

export const useOrderInsights = (
  options: ComputeOptions = {},
): OrderInsightsPayload => {
  const orders = useOrderHistory((state) => state.orders);
  const { recentLimit, sparklineWindow } = options;

  const insights = useMemo(
    () =>
      computeOrderInsights(orders, {
        recentLimit,
        sparklineWindow,
      }),
    [orders, recentLimit, sparklineWindow],
  );

  return insights;
};
