import type { FC } from 'react';
import { useMemo } from 'react';
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
  type TooltipContentProps,
} from 'recharts';
import type { ChannelBreakdown } from '../../domain/analytics';
import { formatPercent } from '../../pages/analytics-formatters';

type ChannelMixChartProps = {
  data: ChannelBreakdown[];
};

const PALETTE = [
  '#38bdf8',
  '#22d3ee',
  '#a855f7',
  '#fb923c',
  '#34d399',
  '#f472b6',
];

const renderChannelTooltip = ({
  active,
  payload,
}: TooltipContentProps<number, string>) => {
  if (!active || !payload?.[0]) return null;
  const datum = payload[0].payload as ChannelBreakdown;
  const shareLabel =
    typeof datum.share === 'number' ? formatPercent(datum.share) : null;
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white/95 px-4 py-3 text-sm shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/95 dark:text-white/80">
      <p className="font-semibold text-slate-900 dark:text-white">
        {datum.channel}
      </p>
      <p className="mt-1 text-slate-600 dark:text-white/70">
        {datum.orders.toLocaleString()} orders
        {shareLabel ? ` • ${shareLabel}` : ''}
      </p>
    </div>
  );
};

export const ChannelMixChart: FC<ChannelMixChartProps> = ({ data }) => {
  const chartData = useMemo(
    () =>
      data.map((entry) => ({
        ...entry,
        label: entry.channel,
      })),
    [data],
  );

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 flex-col justify-center gap-2 rounded-3xl border border-dashed border-slate-200/70 bg-slate-50 p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-white/70">
        <span className="text-xs font-semibold tracking-[0.25em] uppercase">
          Channel mix
        </span>
        <span>
          Once orders flow in, this chart will visualise the split across sales
          channels.
        </span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Tooltip
          cursor={{ fill: 'rgba(56, 189, 248, 0.12)' }}
          wrapperStyle={{ outline: 'none' }}
          content={renderChannelTooltip}
        />
        <Pie
          data={chartData}
          dataKey="share"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          startAngle={90}
          endAngle={-270}
          cornerRadius={14}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={entry.channel}
              fill={PALETTE[index % PALETTE.length]}
              stroke="rgba(15, 23, 42, 0.08)"
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};

if (import.meta.env.DEV) {
  Object.defineProperty(ChannelMixChart, 'displayName', {
    value: 'Station.ChannelMixer',
  });
}
