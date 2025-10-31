import { useEffect, useMemo } from 'react';
import {
  Activity,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import clsx from 'clsx';
import { useAnalytics } from '../hooks/useAnalytics';
import { useOrderInsights } from '../hooks/useOrderInsights';
import type { AnalyticsMetric } from '../domain/analytics';
import { formatCurrency } from '../domain/pizza';
import {
  formatMetricChange,
  formatMetricValue,
  formatPercent,
} from './analytics-formatters';
import { MockOrderSparkline } from '../components/mock-order-sparkline';

const timeFormatter = new Intl.DateTimeFormat('en-AU', {
  hour: 'numeric',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('en-AU', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});

const TrendIcon = ({ trend }: { trend: AnalyticsMetric['trend'] }) => {
  if (trend === 'up') {
    return <TrendingUp className="h-4 w-4" aria-hidden="true" />;
  }
  if (trend === 'down') {
    return <TrendingDown className="h-4 w-4" aria-hidden="true" />;
  }
  return <Minus className="h-4 w-4" aria-hidden="true" />;
};

export const AnalyticsPage = () => {
  const { data, isFetching, refetch } = useAnalytics();
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
  }, [data?.generatedAt]);

  const maxHourlyOrders = useMemo(() => {
    if (!data?.hourlyOrders?.length) return 0;
    return Math.max(...data.hourlyOrders.map((entry) => entry.orders));
  }, [data?.hourlyOrders]);

  const formatOrderTimestamp = (value: string | null | undefined) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${timeFormatter.format(parsed)} • ${dateFormatter.format(parsed)}`;
  };

  return (
    <section className="flex flex-col gap-10">
      <header className="flex flex-col-reverse items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.35em] text-slate-500 uppercase dark:text-white/60">
            Signal Room • Dough Ops
          </p>
          <h1 className="font-display text-4xl font-semibold text-slate-900 sm:text-5xl dark:text-white">
            Analytics
          </h1>
          {generatedAt && (
            <p className="mt-2 text-sm text-slate-500 dark:text-white/70">
              Snapshot from {generatedAt.date} at {generatedAt.time}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white px-5 py-2 text-sm font-semibold tracking-[0.25em] text-slate-700 uppercase transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-white/15 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:disabled:border-white/10 dark:disabled:bg-white/5 dark:disabled:text-white/30"
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
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {data?.metrics.map((metric) => (
          <article
            key={metric.id}
            className={clsx(
              'rounded-3xl border px-5 py-6 shadow-sm transition dark:border-white/10 dark:bg-white/5',
              metric.trend === 'up' &&
                'border-emerald-200/70 bg-emerald-50 shadow-emerald-200/30 dark:border-emerald-400/30 dark:bg-emerald-400/10',
              metric.trend === 'down' &&
                'border-orange-200/70 bg-orange-50 shadow-orange-200/30 dark:border-orange-300/30 dark:bg-orange-300/10',
              metric.trend === 'steady' &&
                'border-slate-200/70 bg-white shadow-slate-200/30 dark:border-white/15 dark:bg-white/5',
            )}
          >
            <div className="flex items-center justify-between text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase dark:text-white/60">
              <span>{metric.label}</span>
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
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition dark:border-white/10 dark:bg-white/5">
          <header>
            <h2 className="font-display text-xl text-slate-900 dark:text-white">
              Mock order telemetry
            </h2>
            <p className="text-sm text-slate-500 dark:text-white/70">
              Live signals derived from your local checkout runs.
            </p>
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
              {recentOrders.map((order) => {
                const createdAt = formatOrderTimestamp(order.createdAt);
                const receiptTimestamp = formatOrderTimestamp(
                  order.submission?.receivedAt,
                );
                return (
                  <li
                    key={order.id}
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
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
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
          <div className="mt-6 grid h-64 grid-cols-8 items-end gap-3 rounded-3xl border border-dashed border-slate-200/70 p-6 dark:border-white/10">
            {data?.hourlyOrders.map((entry) => {
              const height =
                maxHourlyOrders === 0
                  ? 0
                  : Math.round((entry.orders / maxHourlyOrders) * 100);
              return (
                <div key={entry.hour} className="flex h-full flex-col-reverse">
                  <div className="text-center text-xs font-semibold text-slate-400 dark:text-white/50">
                    {entry.hour}
                  </div>
                  <div className="relative mb-3 flex-1">
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
                      <div
                        className="bg-brand-500 dark:bg-brand-400 w-8 rounded-t-2xl shadow-[0_8px_16px_rgba(234,88,12,0.25)] transition-colors"
                        style={{ height: `${Math.max(height, 8)}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <div className="text-center text-xs font-semibold text-slate-500 dark:text-white/70">
                    {entry.orders}
                  </div>
                </div>
              );
            })}
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
          <ul className="mt-6 flex flex-col gap-4">
            {data?.channelBreakdown.map((channel) => (
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
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
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
            {data?.topPizzas.map((pizza) => (
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
                    {formatPercent(pizza.share)} of orders · Trend {pizza.trend}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm transition dark:border-white/10 dark:bg-white/5">
          <header>
            <h2 className="font-display text-xl text-slate-900 dark:text-white">
              Key insights
            </h2>
            <p className="text-sm text-slate-500 dark:text-white/70">
              Observations surfaced from the latest telemetry pull.
            </p>
          </header>
          <ul className="mt-5 space-y-4">
            {data?.insights.map((insight, index) => (
              <li
                key={insight}
                className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white/75"
              >
                <span className="bg-brand-500/10 font-display text-brand-600 dark:bg-brand-500/20 dark:text-brand-200 mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                {insight}
              </li>
            ))}
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
          {data?.recentEvents.map((event) => {
            const timestamp = new Date(event.timestamp);
            const formatted =
              Number.isNaN(timestamp.getTime()) || !generatedAt
                ? event.timestamp
                : `${timeFormatter.format(timestamp)} • ${dateFormatter.format(timestamp)}`;
            return (
              <li
                key={`${event.timestamp}-${event.label}`}
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
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
};

export default AnalyticsPage;
