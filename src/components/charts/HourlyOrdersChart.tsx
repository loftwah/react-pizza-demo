import { useMemo } from 'react';
import type { FC } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import type { HourlyOrders } from '../../domain/analytics';
import type { OrderHourlyBucket } from '../../hooks/useOrderInsights';

type HourlyOrdersChartProps = {
  blended: HourlyOrders[];
  snapshot: HourlyOrders[];
  local: OrderHourlyBucket[];
};

type ChartDatum = {
  hour: string;
  snapshot: number;
  local: number;
  total: number;
};

const parseHourLabel = (label: string): number | null => {
  const [hoursRaw, minutesRaw = '0'] = label.split(':');
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const formatTooltip: TooltipProps<number, string>['formatter'] = (
  value,
  name,
) => {
  if (typeof value !== 'number') return value;
  if (name === 'snapshot') {
    return [`${value} snapshot`, 'Snapshot'];
  }
  if (name === 'local') {
    return [`${value} local`, 'Local runtime'];
  }
  return value;
};

const labelFormatter: TooltipProps<number, string>['labelFormatter'] = (
  label,
) => `Hour ${label}`;

export const HourlyOrdersChart: FC<HourlyOrdersChartProps> = ({
  blended,
  snapshot,
  local,
}) => {
  const data = useMemo<ChartDatum[]>(() => {
    const map = new Map<string, ChartDatum>();
    snapshot.forEach((entry) => {
      map.set(entry.hour, {
        hour: entry.hour,
        snapshot: entry.orders,
        local: 0,
        total: entry.orders,
      });
    });
    local.forEach((entry) => {
      const existing =
        map.get(entry.hour) ??
        ({
          hour: entry.hour,
          snapshot: 0,
          local: 0,
          total: 0,
        } as ChartDatum);
      existing.local += entry.orders;
      existing.total += entry.orders;
      map.set(entry.hour, existing);
    });
    blended.forEach((entry) => {
      const existing =
        map.get(entry.hour) ??
        ({
          hour: entry.hour,
          snapshot: 0,
          local: 0,
          total: 0,
        } as ChartDatum);
      existing.total = entry.orders;
      map.set(entry.hour, existing);
    });
    return Array.from(map.values()).sort((a, b) => {
      const left = parseHourLabel(a.hour);
      const right = parseHourLabel(b.hour);
      if (left === null || right === null) {
        return a.hour.localeCompare(b.hour);
      }
      return left - right;
    });
  }, [blended, snapshot, local]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 flex-col justify-center gap-2 rounded-3xl border border-dashed border-slate-200/70 bg-slate-50 p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-white/70">
        <span className="text-xs font-semibold tracking-[0.25em] uppercase">
          Hourly order velocity
        </span>
        <span>
          Live data will appear here once the mock checkout has run at least
          once.
        </span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        margin={{
          top: 12,
          right: 8,
          left: -16,
          bottom: 8,
        }}
      >
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 6" />
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 12, fill: 'rgba(71, 85, 105, 0.9)' }}
          axisLine={{ stroke: 'rgba(148, 163, 184, 0.6)' }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: 'rgba(71, 85, 105, 0.9)' }}
          axisLine={{ stroke: 'rgba(148, 163, 184, 0.6)' }}
          tickLine={false}
          width={36}
        />
        <Tooltip
          cursor={{ fill: 'rgba(56, 189, 248, 0.12)' }}
          formatter={formatTooltip}
          labelFormatter={labelFormatter}
          wrapperStyle={{ outline: 'none' }}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.25)',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            color: '#0f172a',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
            fontSize: 12,
          }}
          labelStyle={{
            color: '#475569',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontSize: 11,
          }}
          itemStyle={{ color: '#0f172a' }}
        />
        <Legend
          formatter={(value) =>
            value === 'snapshot' ? 'Snapshot' : 'Local runtime'
          }
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Bar
          dataKey="snapshot"
          stackId="orders"
          fill="rgba(148, 163, 184, 0.85)"
          maxBarSize={42}
          radius={[10, 10, 0, 0]}
        />
        <Bar
          dataKey="local"
          stackId="orders"
          fill="url(#hourly-local-fill)"
          maxBarSize={42}
          radius={[10, 10, 0, 0]}
        />
        <defs>
          <linearGradient id="hourly-local-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.95)" />
            <stop offset="100%" stopColor="rgba(45, 212, 191, 0.75)" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
};

if (import.meta.env.DEV) {
  Object.defineProperty(HourlyOrdersChart, 'displayName', {
    value: 'Station.HourlyBoard',
  });
}
