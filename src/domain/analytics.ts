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
  generatedAt: '2025-01-07T18:45:00.000Z',
  metrics: [
    {
      id: 'ordersToday',
      label: 'Orders today',
      value: 214,
      unit: 'orders',
      change: 24,
      trend: 'up',
    },
    {
      id: 'revenueToday',
      label: 'Revenue today',
      value: 4872.9,
      unit: 'currency',
      change: 15,
      trend: 'up',
    },
    {
      id: 'avgPrepTime',
      label: 'Avg prep time',
      value: 16.4,
      unit: 'minutes',
      change: -1.9,
      trend: 'down',
    },
    {
      id: 'returningCustomers',
      label: 'Returning customers',
      value: 62,
      unit: 'percent',
      change: 8,
      trend: 'up',
    },
    {
      id: 'avgBasket',
      label: 'Avg basket size',
      value: 27.8,
      unit: 'currency',
      change: 6,
      trend: 'up',
    },
    {
      id: 'deliveryOnTime',
      label: 'On-time deliveries',
      value: 91,
      unit: 'percent',
      change: 4,
      trend: 'up',
    },
    {
      id: 'kitchenBacklog',
      label: 'Kitchen backlog',
      value: 7,
      unit: 'orders',
      change: -3,
      trend: 'down',
    },
  ],
  topPizzas: [
    {
      pizzaId: 'pepperoni-classic',
      name: 'Pepperoni Classic',
      orders: 72,
      share: clampShare(0.22),
      trend: 'up',
    },
    {
      pizzaId: 'calabrian-scorcher',
      name: 'Calabrian Scorcher',
      orders: 58,
      share: clampShare(0.18),
      trend: 'up',
    },
    {
      pizzaId: 'firecracker',
      name: 'Firecracker',
      orders: 54,
      share: clampShare(0.17),
      trend: 'steady',
    },
    {
      pizzaId: 'sunrise-margherita',
      name: 'Sunrise Margherita',
      orders: 46,
      share: clampShare(0.14),
      trend: 'up',
    },
    {
      pizzaId: 'green-garden',
      name: 'Green Garden',
      orders: 35,
      share: clampShare(0.11),
      trend: 'down',
    },
    {
      pizzaId: 'wild-mushroom',
      name: 'Wild Mushroom',
      orders: 33,
      share: clampShare(0.1),
      trend: 'steady',
    },
    {
      pizzaId: 'smoked-maple-bacon',
      name: 'Smoked Maple Bacon',
      orders: 28,
      share: clampShare(0.09),
      trend: 'up',
    },
  ],
  hourlyOrders: [
    { hour: '11:00', orders: 12 },
    { hour: '12:00', orders: 29 },
    { hour: '13:00', orders: 26 },
    { hour: '14:00', orders: 18 },
    { hour: '15:00', orders: 17 },
    { hour: '16:00', orders: 22 },
    { hour: '17:00', orders: 28 },
    { hour: '18:00', orders: 34 },
    { hour: '19:00', orders: 31 },
    { hour: '20:00', orders: 24 },
    { hour: '21:00', orders: 14 },
    { hour: '22:00', orders: 9 },
  ],
  channelBreakdown: [
    { channel: 'In-store', orders: 68, share: clampShare(0.32) },
    { channel: 'Mobile app', orders: 55, share: clampShare(0.26) },
    { channel: 'Web', orders: 41, share: clampShare(0.19) },
    { channel: 'Delivery partners', orders: 29, share: clampShare(0.14) },
    { channel: 'Catering', orders: 14, share: clampShare(0.06) },
    { channel: 'Pop-up events', orders: 7, share: clampShare(0.03) },
  ],
  insights: [
    'Dinner window peaked at 18:00 with 34 combined orders.',
    'Calabrian Scorcher overtook Firecracker as the top spicy pie.',
    'On-time deliveries hit 91% after the new runner checklist.',
    'Average basket climbed to $27.80 thanks to bundle upsells.',
    'Catering trays added 14 lunchtime orders from nearby offices.',
    'Prep time remains at 16.4 minutes after the station shuffle.',
  ],
  recentEvents: [
    {
      timestamp: '2025-01-07T18:05:00.000Z',
      label: 'Pre-order surge',
      details:
        'Mobile push campaign locked in 22 dinner pickups in 15 minutes.',
    },
    {
      timestamp: '2025-01-07T17:40:00.000Z',
      label: 'Menu highlight',
      details: 'Sunrise Margherita feature drove a 26% lift in veg orders.',
    },
    {
      timestamp: '2025-01-07T16:15:00.000Z',
      label: 'Catering drop',
      details: 'Corporate trays dispatched to Hub Co-working for 38 servings.',
    },
    {
      timestamp: '2025-01-07T14:10:00.000Z',
      label: 'Driver shift optimised',
      details: 'Prep queue trimmed by 6 minutes after reassigning runs.',
    },
    {
      timestamp: '2025-01-07T12:55:00.000Z',
      label: 'Inventory restock',
      details: 'Flour and mozzarella restocked, raising reserves to 2.5 days.',
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
