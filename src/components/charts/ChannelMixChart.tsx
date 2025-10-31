import type { FC } from 'react';
import { useMemo } from 'react';
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
  type TooltipProps,
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

const tooltipFormatter: TooltipProps<number, string>['formatter'] = (
  value,
  name,
  { payload },
) => {
  if (!payload) return value;
  const share =
    typeof payload.share === 'number'
      ? formatPercent(payload.share)
      : undefined;
  return [
    `${value?.toLocaleString?.() ?? value} orders${share ? ` • ${share}` : ''}`,
    name,
  ];
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
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Tooltip
          cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
          formatter={tooltipFormatter}
          labelFormatter={(label) => label}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.35)',
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            color: '#f8fafc',
            fontSize: 12,
          }}
        />
        <Pie
          data={chartData}
          dataKey="share"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius="45%"
          outerRadius="70%"
          paddingAngle={2}
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
