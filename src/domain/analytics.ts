import { z } from 'zod';
import { getBaseUrl } from '../shared-utils/base-url';
import { isDevEnvironment } from '../shared-utils/env';
import { analyticsSeed } from '../data/mock-data';

export type MetricTrend = 'up' | 'down' | 'steady';

export type AnalyticsMetric = {
  id: string;
  label: string;
  value: number;
  unit: 'orders' | 'currency' | 'minutes' | 'percent';
  change: number;
  trend: MetricTrend;
};

export type PizzaPerformance = {
  pizzaId: string;
  name: string;
  orders: number;
  share: number;
  trend: MetricTrend;
};

export type HourlyOrders = {
  hour: string;
  orders: number;
};

export type ChannelBreakdown = {
  channel: string;
  orders: number;
  share: number;
};

export type AnalyticsEvent = {
  timestamp: string;
  label: string;
  details: string;
};

export type AnalyticsSnapshot = {
  generatedAt: string;
  metrics: AnalyticsMetric[];
  topPizzas: PizzaPerformance[];
  hourlyOrders: HourlyOrders[];
  channelBreakdown: ChannelBreakdown[];
  insights: string[];
  recentEvents: AnalyticsEvent[];
};

const clampShare = (value: number) =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

const MetricTrendSchema = z.union([
  z.literal('up'),
  z.literal('down'),
  z.literal('steady'),
]);

const AnalyticsMetricSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.number(),
  unit: z.union([
    z.literal('orders'),
    z.literal('currency'),
    z.literal('minutes'),
    z.literal('percent'),
  ]),
  change: z.number(),
  trend: MetricTrendSchema,
});

const PizzaPerformanceSchema = z.object({
  pizzaId: z.string().min(1),
  name: z.string().min(1),
  orders: z.number().nonnegative(),
  share: z.number().nonnegative(),
  trend: MetricTrendSchema,
});

const HourlyOrdersSchema = z.object({
  hour: z.string().min(1),
  orders: z.number().nonnegative(),
});

const ChannelBreakdownSchema = z.object({
  channel: z.string().min(1),
  orders: z.number().nonnegative(),
  share: z.number().nonnegative(),
});

const AnalyticsEventSchema = z.object({
  timestamp: z.string().min(1),
  label: z.string().min(1),
  details: z.string().min(1),
});

const AnalyticsSnapshotSchema = z.object({
  generatedAt: z.string().min(1),
  metrics: z.array(AnalyticsMetricSchema),
  topPizzas: z.array(PizzaPerformanceSchema),
  hourlyOrders: z.array(HourlyOrdersSchema),
  channelBreakdown: z.array(ChannelBreakdownSchema),
  insights: z.array(z.string().min(1)),
  recentEvents: z.array(AnalyticsEventSchema),
});

export const analyticsSnapshot: AnalyticsSnapshot = {
  ...analyticsSeed,
  topPizzas: analyticsSeed.topPizzas.map((pizza) => ({
    ...pizza,
    share: clampShare(pizza.share),
  })),
};

(() => {
  const validation = AnalyticsSnapshotSchema.safeParse(analyticsSnapshot);
  if (!validation.success && isDevEnvironment()) {
    console.warn(
      '[analytics] Embedded analytics snapshot failed validation',
      validation.error,
    );
  }
})();

export const fetchAnalytics = async (): Promise<AnalyticsSnapshot> => {
  const endpoint = `${getBaseUrl()}api/analytics.json`;
  try {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(
        `Analytics request failed with status ${response.status}`,
      );
    }
    const payload = await response.json();
    const parsed = AnalyticsSnapshotSchema.parse(payload);
    return {
      ...parsed,
      topPizzas: parsed.topPizzas.map((pizza) => ({
        ...pizza,
        share: clampShare(pizza.share),
      })),
    };
  } catch (error) {
    if (isDevEnvironment()) {
      console.warn(
        '[analytics] Falling back to embedded analytics snapshot after fetch error:',
        error,
      );
    }
    return analyticsSnapshot;
  }
};
