import { getBaseUrl } from '../shared-utils/base-url';
import { isDevEnvironment } from '../shared-utils/env';

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

export const analyticsSnapshot: AnalyticsSnapshot = {
  generatedAt: '2025-01-07T13:15:00.000Z',
  metrics: [
    {
      id: 'ordersToday',
      label: 'Orders today',
      value: 128,
      unit: 'orders',
      change: 18,
      trend: 'up',
    },
    {
      id: 'revenueToday',
      label: 'Revenue today',
      value: 3124.5,
      unit: 'currency',
      change: 12,
      trend: 'up',
    },
    {
      id: 'avgPrepTime',
      label: 'Avg prep time',
      value: 17.8,
      unit: 'minutes',
      change: -1.4,
      trend: 'down',
    },
    {
      id: 'returningCustomers',
      label: 'Returning customers',
      value: 54,
      unit: 'percent',
      change: 6,
      trend: 'up',
    },
  ],
  topPizzas: [
    {
      pizzaId: 'pepperoni-classic',
      name: 'Pepperoni Classic',
      orders: 52,
      share: clampShare(0.27),
      trend: 'up',
    },
    {
      pizzaId: 'firecracker',
      name: 'Firecracker',
      orders: 34,
      share: clampShare(0.18),
      trend: 'up',
    },
    {
      pizzaId: 'wild-mushroom',
      name: 'Wild Mushroom',
      orders: 29,
      share: clampShare(0.15),
      trend: 'steady',
    },
    {
      pizzaId: 'green-garden',
      name: 'Green Garden',
      orders: 21,
      share: clampShare(0.11),
      trend: 'down',
    },
  ],
  hourlyOrders: [
    { hour: '11:00', orders: 8 },
    { hour: '12:00', orders: 24 },
    { hour: '13:00', orders: 19 },
    { hour: '14:00', orders: 11 },
    { hour: '15:00', orders: 10 },
    { hour: '16:00', orders: 13 },
    { hour: '17:00', orders: 17 },
    { hour: '18:00', orders: 26 },
  ],
  channelBreakdown: [
    { channel: 'In-store', orders: 48, share: clampShare(0.38) },
    { channel: 'Mobile app', orders: 41, share: clampShare(0.32) },
    { channel: 'Web', orders: 25, share: clampShare(0.2) },
    { channel: 'Delivery partners', orders: 14, share: clampShare(0.1) },
  ],
  insights: [
    'Lunch rush peaked at 12:00 with 24 orders.',
    'Firecracker promo lifted spicy segment share by 5 percentage points.',
    'Average prep time improved 1.4 minutes after oven calibration.',
    'Mobile app reorders grew 11% versus the prior day.',
  ],
  recentEvents: [
    {
      timestamp: '2025-01-07T12:45:00.000Z',
      label: 'Promo applied',
      details:
        'Firecracker lunch promo boosted orders by 14% during the window.',
    },
    {
      timestamp: '2025-01-07T12:20:00.000Z',
      label: 'Kitchen alert cleared',
      details: 'Station B backlog resolved, prep time normalised.',
    },
    {
      timestamp: '2025-01-07T11:15:00.000Z',
      label: 'New loyalty enrolments',
      details: 'Six customers opted into VIP lunch list at the counter.',
    },
  ],
};

export const fetchAnalytics = async (): Promise<AnalyticsSnapshot> => {
  const endpoint = `${getBaseUrl()}api/analytics.json`;
  try {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(
        `Analytics request failed with status ${response.status}`,
      );
    }
    const payload = (await response.json()) as AnalyticsSnapshot;
    return {
      ...payload,
      topPizzas: payload.topPizzas.map((pizza) => ({
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
