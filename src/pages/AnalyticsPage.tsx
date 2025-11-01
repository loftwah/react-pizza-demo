import { useCallback, useEffect, useMemo } from 'react';
import {
  Activity,
  BadgeDollarSign,
  ChefHat,
  Clock3,
  Download,
  Loader2,
  Minus,
  Pizza,
  Radar,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalytics } from '../hooks/useAnalytics';
import { useOrderInsights } from '../hooks/useOrderInsights';
import type {
  AnalyticsMetric,
  AnalyticsSnapshot,
  ChannelBreakdown,
  HourlyOrders,
  PizzaPerformance,
  AnalyticsEvent,
} from '../domain/analytics';
import { formatCurrency } from '../domain/pizza';
import {
  formatMetricChange,
  formatMetricValue,
  formatPercent,
} from './analytics-formatters';
import { MockOrderSparkline } from '../components/mock-order-sparkline';
import { useOrderHistory } from '../stores/orders';
import { HourlyOrdersChart } from '../components/charts/HourlyOrdersChart';
import { ChannelMixChart } from '../components/charts/ChannelMixChart';

const timeFormatter = new Intl.DateTimeFormat('en-AU', {
  hour: 'numeric',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('en-AU', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});

const metricIcons: Record<string, LucideIcon> = {
  ordersToday: Pizza,
  revenueToday: BadgeDollarSign,
  avgPrepTime: Timer,
  returningCustomers: Users,
  mockOrdersRuntime: Pizza,
  mockRevenueRuntime: BadgeDollarSign,
  avgBasket: ShoppingBag,
  deliveryOnTime: Clock3,
  kitchenBacklog: ChefHat,
};

const metricBadgeTones: Record<AnalyticsMetric['trend'], string> = {
  up: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-50',
  down: 'bg-orange-500/15 text-orange-700 dark:bg-orange-400/20 dark:text-orange-50',
  steady: 'bg-slate-500/10 text-slate-600 dark:bg-white/10 dark:text-white/70',
};

const clampShareSafe = (value: number) =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

const parseHourLabel = (label: string): number | null => {
  const [hoursRaw, minutesRaw = '0'] = label.split(':');
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const TrendIcon = ({ trend }: { trend: AnalyticsMetric['trend'] }) => {
  if (trend === 'up') {
    return <TrendingUp className="h-4 w-4" aria-hidden="true" />;
  }
  if (trend === 'down') {
    return <TrendingDown className="h-4 w-4" aria-hidden="true" />;
  }
  return <Minus className="h-4 w-4" aria-hidden="true" />;
};

const escapeCsvCell = (value: unknown) => {
  if (value === null || typeof value === 'undefined') return '';
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildAnalyticsCsv = (snapshot: AnalyticsSnapshot): string => {
  const rows: string[] = [];
  rows.push('Section,Id,Label,Value,Unit,Change,Trend');
  snapshot.metrics.forEach((metric) => {
    rows.push(
      [
        escapeCsvCell('metrics'),
        escapeCsvCell(metric.id),
        escapeCsvCell(metric.label),
        escapeCsvCell(metric.value),
        escapeCsvCell(metric.unit),
        escapeCsvCell(metric.change),
        escapeCsvCell(metric.trend),
      ].join(','),
    );
  });

  rows.push('', 'Section,Pizza Id,Name,Orders,Share,Trend');
  snapshot.topPizzas.forEach((pizza) => {
    rows.push(
      [
        escapeCsvCell('topPizzas'),
        escapeCsvCell(pizza.pizzaId),
        escapeCsvCell(pizza.name),
        escapeCsvCell(pizza.orders),
        escapeCsvCell(pizza.share),
        escapeCsvCell(pizza.trend),
      ].join(','),
    );
  });

  rows.push('', 'Section,Hour,Orders');
  snapshot.hourlyOrders.forEach((entry) => {
    rows.push(
      [
        escapeCsvCell('hourlyOrders'),
        escapeCsvCell(entry.hour),
        escapeCsvCell(entry.orders),
      ].join(','),
    );
  });

  rows.push('', 'Section,Channel,Orders,Share');
  snapshot.channelBreakdown.forEach((entry) => {
    rows.push(
      [
        escapeCsvCell('channelBreakdown'),
        escapeCsvCell(entry.channel),
        escapeCsvCell(entry.orders),
        escapeCsvCell(entry.share),
      ].join(','),
    );
  });

  rows.push('', 'Section,Index,Insight');
  snapshot.insights.forEach((insight, index) => {
    rows.push(
      [
        escapeCsvCell('insights'),
        escapeCsvCell(index + 1),
        escapeCsvCell(insight),
      ].join(','),
    );
  });

  rows.push('', 'Section,Timestamp,Label,Details');
  snapshot.recentEvents.forEach((event) => {
    rows.push(
      [
        escapeCsvCell('recentEvents'),
        escapeCsvCell(event.timestamp),
        escapeCsvCell(event.label),
        escapeCsvCell(event.details),
      ].join(','),
    );
  });

  return rows.join('\n');
};

export const AnalyticsPage = () => {
  const { data, isFetching, refetch } = useAnalytics();
  const orders = useOrderHistory((state) => state.orders);
  const {
    summary: orderInsights,
    recentOrders,
    hourlyBuckets: localBuckets,
    sparkline,
  } = useOrderInsights();

  useEffect(() => {
    document.title = 'Loftwah Pizza • Analytics';
  }, []);

  const generatedAt = useMemo(() => {
    if (!data?.generatedAt) return null;
    const timestamp = new Date(data.generatedAt);
    if (Number.isNaN(timestamp.getTime())) return null;
    return {
      date: dateFormatter.format(timestamp),
      time: timeFormatter.format(timestamp),
    };
  }, [data]);

  const blendedHourlyOrders = useMemo<HourlyOrders[]>(() => {
    const hourMap = new Map<string, number>();
    data?.hourlyOrders.forEach((entry) => {
      hourMap.set(entry.hour, entry.orders);
    });
    localBuckets.forEach((entry) => {
      hourMap.set(entry.hour, (hourMap.get(entry.hour) ?? 0) + entry.orders);
    });
    return Array.from(hourMap.entries())
      .map(([hour, orders]) => ({ hour, orders }))
      .sort((a, b) => {
        const left = parseHourLabel(a.hour);
        const right = parseHourLabel(b.hour);
        if (left === null || right === null) {
          return a.hour.localeCompare(b.hour);
        }
        return left - right;
      });
  }, [data?.hourlyOrders, localBuckets]);

  const blendedMetrics = useMemo<AnalyticsMetric[]>(() => {
    if (!data) return [];
    const localOrdersCount = orderInsights.totalOrders;
    const localRevenue = orderInsights.totalRevenue;
    const localAvgPrep = orderInsights.averagePrep;
    const remoteOrdersMetric = data.metrics.find(
      (metric) => metric.id === 'ordersToday',
    );
    const remoteOrders = remoteOrdersMetric?.value ?? 0;
    const remoteAvgPrep =
      data.metrics.find((metric) => metric.id === 'avgPrepTime')?.value ?? null;

    const merged = data.metrics.map((metric) => {
      if (metric.id === 'ordersToday' && localOrdersCount > 0) {
        return {
          ...metric,
          value: metric.value + localOrdersCount,
          change: metric.change + Math.min(localOrdersCount, 18),
        };
      }
      if (metric.id === 'revenueToday' && localRevenue > 0) {
        const updatedValue = Number((metric.value + localRevenue).toFixed(2));
        const baseline = metric.value <= 0 ? 1 : metric.value;
        const deltaPercent = Math.min(
          25,
          Math.round((localRevenue / baseline) * 100),
        );
        return {
          ...metric,
          value: updatedValue,
          change: metric.change + deltaPercent,
        };
      }
      if (
        metric.id === 'avgPrepTime' &&
        localAvgPrep !== null &&
        remoteAvgPrep !== null &&
        remoteOrders + localOrdersCount > 0
      ) {
        const weighted =
          (remoteAvgPrep * remoteOrders + localAvgPrep * localOrdersCount) /
          (remoteOrders + localOrdersCount);
        const delta = Number((weighted - remoteAvgPrep).toFixed(1));
        return {
          ...metric,
          value: Number(weighted.toFixed(1)),
          change: delta,
          trend: delta < -0.2 ? 'up' : delta > 0.2 ? 'down' : metric.trend,
        };
      }
      if (
        metric.id === 'avgBasket' &&
        localOrdersCount > 0 &&
        localRevenue > 0 &&
        remoteOrders + localOrdersCount > 0
      ) {
        const combinedAverage =
          (metric.value * remoteOrders + localRevenue) /
          (remoteOrders + localOrdersCount);
        const liftPercent =
          metric.value > 0
            ? ((combinedAverage - metric.value) / metric.value) * 100
            : 0;
        const clampedLift = Math.round(liftPercent);
        const trend =
          combinedAverage > metric.value + 0.2
            ? 'up'
            : combinedAverage < metric.value - 0.2
              ? 'down'
              : metric.trend;
        return {
          ...metric,
          value: Number(combinedAverage.toFixed(2)),
          change: Math.max(-25, Math.min(25, metric.change + clampedLift)),
          trend,
        };
      }
      return metric;
    });

    if (localOrdersCount > 0) {
      merged.push({
        id: 'mockOrdersRuntime',
        label: 'Runtime mock orders',
        value: localOrdersCount,
        unit: 'orders',
        change: Math.max(1, localOrdersCount),
        trend: localOrdersCount > 2 ? 'up' : 'steady',
      });
    }

    if (localRevenue > 0) {
      merged.push({
        id: 'mockRevenueRuntime',
        label: 'Runtime revenue',
        value: Number(localRevenue.toFixed(2)),
        unit: 'currency',
        change:
          remoteOrders > 0
            ? Math.min(25, Math.round((localOrdersCount / remoteOrders) * 100))
            : localOrdersCount,
        trend: localRevenue > 50 ? 'up' : 'steady',
      });
    }

    return merged;
  }, [
    data,
    orderInsights.averagePrep,
    orderInsights.totalOrders,
    orderInsights.totalRevenue,
  ]);

  const blendedTopPizzas = useMemo<PizzaPerformance[]>(() => {
    if (!data) return [];
    const map = new Map<string, PizzaPerformance>();
    data.topPizzas.forEach((pizza) => map.set(pizza.pizzaId, { ...pizza }));
    const localCounts = new Map<
      string,
      {
        name: string;
        orders: number;
      }
    >();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (!item.pizzaId) return;
        const existing = localCounts.get(item.pizzaId) ?? {
          name: item.name,
          orders: 0,
        };
        existing.orders += item.quantity;
        if (!existing.name) {
          existing.name = item.name;
        }
        localCounts.set(item.pizzaId, existing);
      });
    });

    const remoteTotal = data.topPizzas.reduce(
      (sum, pizza) => sum + pizza.orders,
      0,
    );
    const localTotal = Array.from(localCounts.values()).reduce(
      (sum, entry) => sum + entry.orders,
      0,
    );
    const combinedTotal = remoteTotal + localTotal;

    const results: PizzaPerformance[] = [];

    map.forEach((pizza, pizzaId) => {
      const localOrdersForPizza = localCounts.get(pizzaId)?.orders ?? 0;
      const totalOrders = pizza.orders + localOrdersForPizza;
      results.push({
        ...pizza,
        orders: totalOrders,
        share:
          combinedTotal === 0
            ? pizza.share
            : clampShareSafe(totalOrders / combinedTotal),
        trend:
          localOrdersForPizza > 0
            ? pizza.trend === 'down'
              ? 'steady'
              : 'up'
            : pizza.trend,
      });
      localCounts.delete(pizzaId);
    });

    localCounts.forEach((value, pizzaId) => {
      results.push({
        pizzaId,
        name: value.name,
        orders: value.orders,
        share:
          combinedTotal === 0
            ? clampShareSafe(value.orders / Math.max(value.orders, 1))
            : clampShareSafe(value.orders / combinedTotal),
        trend: 'up',
      });
    });

    return results.sort((a, b) => b.orders - a.orders).slice(0, 6);
  }, [data, orders]);

  const blendedChannelBreakdown = useMemo<ChannelBreakdown[]>(() => {
    if (!data) return [];
    const remoteTotal = data.channelBreakdown.reduce(
      (sum, entry) => sum + entry.orders,
      0,
    );
    const localOrdersCount = orderInsights.totalOrders;
    const combinedTotal = remoteTotal + localOrdersCount;
    const recalculated = data.channelBreakdown.map((entry) => ({
      ...entry,
      share:
        combinedTotal === 0
          ? entry.share
          : clampShareSafe(entry.orders / combinedTotal),
    }));
    if (localOrdersCount > 0) {
      recalculated.push({
        channel: 'Local demo',
        orders: localOrdersCount,
        share:
          combinedTotal === 0
            ? clampShareSafe(1)
            : clampShareSafe(localOrdersCount / combinedTotal),
      });
    }
    return recalculated.sort((a, b) => b.share - a.share);
  }, [data, orderInsights.totalOrders]);

  const blendedInsights = useMemo(() => {
    const base = data?.insights ?? [];
    const dynamic: string[] = [];
    if (orderInsights.totalOrders > 0) {
      dynamic.push(
        `${orderInsights.totalOrders.toLocaleString()} mock ${
          orderInsights.totalOrders === 1 ? 'order' : 'orders'
        } captured locally during this session.`,
      );
    }
    if (orderInsights.averagePrep !== null) {
      dynamic.push(
        `Local prep time is averaging ${orderInsights.averagePrep.toFixed(1)} minutes.`,
      );
    }
    if (recentOrders.length > 0) {
      const latest = recentOrders[0];
      dynamic.push(
        `Most recent mock checkout rang up ${formatCurrency(latest.total)} with ${
          latest.items.length
        } ${latest.items.length === 1 ? 'item' : 'items'}.`,
      );
    }
    return [...base, ...dynamic];
  }, [
    data?.insights,
    orderInsights.averagePrep,
    orderInsights.totalOrders,
    recentOrders,
  ]);

  const blendedRecentEvents = useMemo<AnalyticsEvent[]>(() => {
    const remote = data?.recentEvents ?? [];
    const localEvents = recentOrders.map<AnalyticsEvent>((order) => ({
      timestamp: order.createdAt,
      label: 'Local mock order',
      details: `${order.items.length} ${
        order.items.length === 1 ? 'item' : 'items'
      } • ${formatCurrency(order.total)}${
        order.submission
          ? ` · Kitchen ref ${order.submission.kitchenReference}`
          : ' · Awaiting mock receipt'
      }`,
    }));
    return [...localEvents, ...remote]
      .filter((event) => Boolean(event.timestamp))
      .sort((a, b) => {
        const left = new Date(a.timestamp).getTime();
        const right = new Date(b.timestamp).getTime();
        if (Number.isNaN(left) || Number.isNaN(right)) {
          return Number.isNaN(right) ? 0 : 1;
        }
        return right - left;
      })
      .slice(0, 7);
  }, [data?.recentEvents, recentOrders]);
  const formatOrderTimestamp = (value: string | null | undefined) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${timeFormatter.format(parsed)} • ${dateFormatter.format(parsed)}`;
  };

  const handleExportCsv = useCallback(() => {
    if (!data) return;
    const csv = buildAnalyticsCsv(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const timestamp = data.generatedAt
      ? new Date(data.generatedAt).toISOString().slice(0, 10)
      : 'snapshot';
    anchor.download = `loftwah-analytics-${timestamp}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <motion.section
      className="flex flex-col gap-10"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="flex flex-col-reverse items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.35em] text-slate-500 uppercase dark:text-white/60">
            Signal Room • Dough Ops
          </p>
          <h1 className="font-display text-4xl font-semibold text-slate-900 sm:text-5xl dark:text-white">
            <span className="text-aurora">Analytics</span>
          </h1>
          {generatedAt && (
            <p className="mt-2 text-sm text-slate-500 dark:text-white/70">
              Snapshot from {generatedAt.date} at {generatedAt.time}
            </p>
          )}
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!data}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200/70 bg-white px-5 py-2 text-sm font-semibold tracking-[0.25em] text-slate-700 uppercase transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-white/15 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:disabled:border-white/10 dark:disabled:bg-white/5 dark:disabled:text-white/30"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200/70 bg-white px-5 py-2 text-sm font-semibold tracking-[0.25em] text-slate-700 uppercase transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-white/15 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:disabled:border-white/10 dark:disabled:bg-white/5 dark:disabled:text-white/30"
          >
            {isFetching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Refreshing
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Refresh data
              </>
            )}
          </button>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <AnimatePresence initial={false}>
          {blendedMetrics.map((metric) => {
            const MetricIcon = metricIcons[metric.id] ?? Activity;
            return (
              <motion.article
                key={metric.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6 }}
                className={clsx(
                  'group relative overflow-hidden rounded-3xl border px-5 py-6 shadow-sm backdrop-blur-sm transition-all duration-300 dark:border-white/10 dark:bg-white/5',
                  metric.trend === 'up' &&
                    'border-emerald-200/70 bg-emerald-50/90 shadow-emerald-200/30 dark:border-emerald-400/30 dark:bg-emerald-400/10',
                  metric.trend === 'down' &&
                    'border-orange-200/70 bg-orange-50/90 shadow-orange-200/30 dark:border-orange-300/30 dark:bg-orange-300/10',
                  metric.trend === 'steady' &&
                    'border-slate-200/70 bg-white/90 shadow-slate-200/30 dark:border-white/15 dark:bg-white/5',
                )}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.2em] text-slate-500 uppercase dark:text-white/60">
                  <span className="flex items-center gap-3">
                    <span
                      className={clsx(
                        'flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors dark:text-white/80',
                        metricBadgeTones[metric.trend],
                      )}
                    >
                      <MetricIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    {metric.label}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendIcon trend={metric.trend} />
                  </span>
                </div>
                <p className="font-display mt-5 text-3xl text-slate-900 dark:text-white">
                  {formatMetricValue(metric)}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-white/70">
                  {formatMetricChange(metric)}
                </p>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </section>

      <section className="flex flex-col gap-6">
        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition dark:border-white/10 dark:bg-white/5">
          <header className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-200">
              <Radar className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white">
                Mock order telemetry
              </h2>
              <p className="text-sm text-slate-500 dark:text-white/70">
                Live signals derived from your local checkout runs.
              </p>
            </div>
          </header>

          {orderInsights.totalOrders === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-200/70 bg-slate-50 p-6 text-sm text-slate-500 dark:border-white/15 dark:bg-white/10 dark:text-white/70">
              Place a mock order to see local telemetry blend with the
              dashboard.
            </p>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/10">
                  <p className="text-xs font-semibold tracking-[0.25em] text-slate-500 uppercase dark:text-white/60">
                    Total mock orders
                  </p>
                  <p className="font-display mt-3 text-2xl text-slate-900 dark:text-white">
                    {orderInsights.totalOrders.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
                    Stored locally across this device.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/10">
                  <p className="text-xs font-semibold tracking-[0.25em] text-slate-500 uppercase dark:text-white/60">
                    Lifetime mock revenue
                  </p>
                  <p className="font-display mt-3 text-2xl text-slate-900 dark:text-white">
                    {formatCurrency(orderInsights.totalRevenue)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
                    Cart totals captured from each run.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/10">
                  <p className="text-xs font-semibold tracking-[0.25em] text-slate-500 uppercase dark:text-white/60">
                    Avg prep estimate
                  </p>
                  <p className="font-display mt-3 text-2xl text-slate-900 dark:text-white">
                    {orderInsights.averagePrep !== null
                      ? `${orderInsights.averagePrep.toFixed(1)} min`
                      : 'Awaiting receipts'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
                    Based on kitchen submission responses.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/10">
                  <p className="text-xs font-semibold tracking-[0.25em] text-slate-500 uppercase dark:text-white/60">
                    Latest kitchen ref
                  </p>
                  <p className="mt-3 font-mono text-lg text-slate-900 dark:text-white">
                    {orderInsights.latestSubmission?.submission
                      ?.kitchenReference ?? 'Pending'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
                    {formatOrderTimestamp(
                      orderInsights.latestSubmission?.submission?.receivedAt ??
                        orderInsights.latestOrder?.createdAt ??
                        null,
                    ) ?? 'No receipt timestamp available'}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <MockOrderSparkline
                  baseline={data?.hourlyOrders ?? []}
                  localBuckets={localBuckets}
                  sparkline={sparkline}
                />
              </div>
            </>
          )}
        </article>

        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition dark:border-white/10 dark:bg-white/5">
          <header>
            <h2 className="font-display text-xl text-slate-900 dark:text-white">
              Latest mock orders
            </h2>
            <p className="text-sm text-slate-500 dark:text-white/70">
              Recent submissions captured from the checkout flow.
            </p>
          </header>
          {recentOrders.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-200/70 bg-slate-50 p-6 text-sm text-slate-500 dark:border-white/15 dark:bg-white/10 dark:text-white/70">
              Checkout an order to populate this activity feed.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              <AnimatePresence initial={false}>
                {recentOrders.map((order) => {
                  const createdAt = formatOrderTimestamp(order.createdAt);
                  const receiptTimestamp = formatOrderTimestamp(
                    order.submission?.receivedAt,
                  );
                  return (
                    <motion.li
                      key={order.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/10"
                    >
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-white/80">
                        <span className="font-mono tracking-wide">
                          {order.id}
                        </span>
                        <span>{formatCurrency(order.total)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
                        {createdAt ?? 'Created timestamp unavailable'}
                      </p>
                      <div className="mt-3 flex flex-col gap-2 text-xs text-slate-600 dark:text-white/70">
                        <span>
                          {order.items.length}{' '}
                          {order.items.length === 1 ? 'item' : 'items'} •{' '}
                          {order.items.map((item) => item.name).join(', ')}
                        </span>
                        {order.submission ? (
                          <span>
                            Kitchen ref{' '}
                            <span className="font-mono">
                              {order.submission.kitchenReference}
                            </span>{' '}
                            · ETA {order.submission.estimatedPrepMinutes} min
                            {receiptTimestamp ? ` • ${receiptTimestamp}` : ''}
                          </span>
                        ) : (
                          <span className="text-orange-600 dark:text-orange-300">
                            Mock API receipt missing — order persisted locally.
                          </span>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </article>
      </section>

      <section className="flex flex-col gap-6">
        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition dark:border-white/10 dark:bg-white/5">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white">
                Hourly order velocity
              </h2>
              <p className="text-sm text-slate-500 dark:text-white/70">
                Tracks order count per hour across the latest trading window.
              </p>
            </div>
            <Activity className="text-brand-500 dark:text-brand-300 h-5 w-5" />
          </header>
          <div className="mt-6 h-[280px]">
            <HourlyOrdersChart
              blended={blendedHourlyOrders}
              snapshot={data?.hourlyOrders ?? []}
              local={localBuckets}
            />
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition dark:border-white/10 dark:bg-white/5">
          <header>
            <h2 className="font-display text-xl text-slate-900 dark:text-white">
              Channel mix
            </h2>
            <p className="text-sm text-slate-500 dark:text-white/70">
              Share of orders by channel for the current snapshot.
            </p>
          </header>
          <div className="mt-6 h-[280px]">
            <ChannelMixChart data={blendedChannelBreakdown} />
          </div>
          {blendedChannelBreakdown.length > 0 ? (
            <ul className="mt-6 flex flex-col gap-4">
              {blendedChannelBreakdown.map((channel) => (
                <li
                  key={channel.channel}
                  className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/10"
                >
                  <div className="flex items-baseline justify-between text-sm font-semibold text-slate-700 dark:text-white/80">
                    <span>{channel.channel}</span>
                    <span>{channel.orders.toLocaleString()} orders</span>
                  </div>
                  <div className="mt-2 h-3 rounded-full bg-white/60 dark:bg-white/20">
                    <div
                      className="bg-brand-500 dark:bg-brand-400 h-full rounded-full transition-colors"
                      style={{ width: `${Math.round(channel.share * 100)}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-white/60">
                    {formatPercent(channel.share)}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      </section>

      <section className="flex flex-col gap-6">
        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition dark:border-white/10 dark:bg-white/5">
          <header>
            <h2 className="font-display text-xl text-slate-900 dark:text-white">
              Top performing pizzas
            </h2>
            <p className="text-sm text-slate-500 dark:text-white/70">
              Volume share by product, ordered by velocity.
            </p>
          </header>
          <div className="mt-6 space-y-4">
            {blendedTopPizzas.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200/70 bg-slate-50 p-6 text-sm text-slate-500 dark:border-white/15 dark:bg-white/10 dark:text-white/70">
                No product telemetry available yet. Place a mock order to seed
                local velocity data.
              </p>
            ) : (
              blendedTopPizzas.map((pizza) => (
                <div
                  key={pizza.pizzaId}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-slate-50 p-4 transition dark:border-white/10 dark:bg-white/10"
                >
                  <div className="font-display flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white/80">
                    {pizza.name
                      .split(' ')
                      .map((token) => token[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-white/80">
                      <span>{pizza.name}</span>
                      <span>{pizza.orders.toLocaleString()} orders</span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-white/70 dark:bg-white/20">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all',
                          pizza.trend === 'up'
                            ? 'bg-emerald-500 dark:bg-emerald-400'
                            : pizza.trend === 'down'
                              ? 'bg-orange-500 dark:bg-orange-400'
                              : 'bg-slate-400 dark:bg-white/40',
                        )}
                        style={{ width: `${Math.round(pizza.share * 100)}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-white/60">
                      {formatPercent(pizza.share)} of orders · Trend{' '}
                      {pizza.trend}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition dark:border-white/10 dark:bg-white/5">
          <header className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:bg-purple-400/15 dark:text-purple-200">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl text-slate-900 dark:text-white">
                Key insights
              </h2>
              <p className="text-sm text-slate-500 dark:text-white/70">
                Observations surfaced from the latest telemetry pull.
              </p>
            </div>
          </header>
          <ul className="mt-5 space-y-4">
            <AnimatePresence initial={false}>
              {blendedInsights.map((insight, index) => (
                <motion.li
                  key={`${insight}-${index}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white/75"
                >
                  <span className="bg-brand-500/10 font-display text-brand-600 dark:bg-brand-500/20 dark:text-brand-200 mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold">
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  {insight}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition dark:border-white/10 dark:bg-white/5">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-slate-900 dark:text-white">
              Recent telemetry events
            </h2>
            <p className="text-sm text-slate-500 dark:text-white/70">
              Stream of the latest analytics events ingested by the mock API.
            </p>
          </div>
        </header>
        <ul className="mt-6 space-y-4">
          <AnimatePresence initial={false}>
            {blendedRecentEvents.map((event) => {
              const timestamp = new Date(event.timestamp);
              const formatted =
                Number.isNaN(timestamp.getTime()) || !generatedAt
                  ? event.timestamp
                  : `${timeFormatter.format(timestamp)} • ${dateFormatter.format(timestamp)}`;
              return (
                <motion.li
                  key={`${event.timestamp}-${event.label}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200/60 bg-slate-50 p-4 transition dark:border-white/10 dark:bg-white/10"
                >
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-white/80">
                    <span>{event.label}</span>
                    <span className="text-xs tracking-[0.25em] text-slate-400 uppercase dark:text-white/50">
                      {formatted}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-white/70">
                    {event.details}
                  </p>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </section>
    </motion.section>
  );
};

export default AnalyticsPage;

if (import.meta.env.DEV) {
  Object.defineProperty(AnalyticsPage, 'displayName', {
    value: 'Station.SignalRoom',
  });
}
