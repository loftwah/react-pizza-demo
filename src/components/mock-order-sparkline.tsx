import type { FC } from 'react';
import clsx from 'clsx';
import type { HourlyOrders } from '../domain/analytics';
import type {
  OrderHourlyBucket,
  OrderSparklinePoint,
} from '../hooks/useOrderInsights';

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 52;

type MockOrderSparklineProps = {
  baseline: HourlyOrders[];
  localBuckets: OrderHourlyBucket[];
  sparkline: OrderSparklinePoint[];
};

const parseHour = (label: string): number | null => {
  const [hoursRaw, minutesRaw] = label.split(':');
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

export const MockOrderSparkline: FC<MockOrderSparklineProps> = ({
  baseline,
  localBuckets,
  sparkline,
}) => {
  const baselineMap = new Map(
    baseline.map((entry) => [entry.hour, entry.orders]),
  );
  const localMap = new Map(
    localBuckets.map((entry) => [entry.hour, entry.orders]),
  );

  const combinedHours = new Map<string, number>();
  baseline.forEach((entry) => {
    const parsed = parseHour(entry.hour);
    if (parsed !== null) combinedHours.set(entry.hour, parsed);
  });
  localBuckets.forEach((entry) => {
    const parsed = parseHour(entry.hour);
    if (parsed !== null) combinedHours.set(entry.hour, parsed);
  });

  const hours = Array.from(combinedHours.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([hour]) => hour);

  const series = hours.map((hour) => ({
    hour,
    baseline: baselineMap.get(hour) ?? 0,
    local: localMap.get(hour) ?? 0,
  }));

  const maxValue = series.reduce(
    (max, entry) => Math.max(max, entry.baseline, entry.local),
    0,
  );

  if (hours.length === 0 || maxValue === 0) {
    return (
      <div className="flex h-40 flex-col justify-center gap-2 rounded-2xl border border-dashed border-slate-200/70 bg-slate-50 px-6 py-4 text-sm text-slate-500 dark:border-white/15 dark:bg-white/10 dark:text-white/70">
        <p className="font-semibold tracking-[0.2em] uppercase">
          Mock order sparkline
        </p>
        <p>
          Run the checkout locally to generate a mock runtime trend that sits
          alongside the snapshot.
        </p>
      </div>
    );
  }

  const step =
    hours.length <= 1 ? VIEWBOX_WIDTH : VIEWBOX_WIDTH / (hours.length - 1);

  const areaPath = series.reduce((path, entry, index) => {
    const x = Number((index * step).toFixed(2));
    const y =
      VIEWBOX_HEIGHT -
      Number.parseFloat(((entry.local / maxValue) * VIEWBOX_HEIGHT).toFixed(2));
    if (index === 0) {
      return `${path} L ${x} ${y}`;
    }
    return `${path} L ${x} ${y}`;
  }, `M 0 ${VIEWBOX_HEIGHT}`);

  const areaClosed = `${areaPath} L ${(hours.length - 1) * step} ${VIEWBOX_HEIGHT} Z`;

  const baselinePath = series
    .map((entry, index) => {
      const x = Number((index * step).toFixed(2));
      const y =
        VIEWBOX_HEIGHT -
        Number.parseFloat(
          ((entry.baseline / maxValue) * VIEWBOX_HEIGHT).toFixed(2),
        );
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div
      className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4 dark:border-white/10 dark:bg-white/5"
      role="presentation"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between text-xs font-semibold tracking-[0.25em] text-slate-500 uppercase dark:text-white/60">
        <span>Mock runtime vs snapshot</span>
        <span>
          {sparkline.length} recent run{sparkline.length === 1 ? '' : 's'}
        </span>
      </div>
      <svg
        className="mt-4 h-36 w-full"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sparkline-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(56,189,248,0.5)" />
            <stop offset="100%" stopColor="rgba(45,212,191,0.12)" />
          </linearGradient>
        </defs>
        <path
          d={areaClosed}
          fill="url(#sparkline-fill)"
          stroke="rgba(45,212,191,0.45)"
          strokeWidth={1}
        />
        <path
          d={baselinePath}
          fill="none"
          stroke="rgba(148,163,184,0.7)"
          strokeWidth={1.2}
          strokeDasharray="4 4"
        />
        {series.map((entry, index) => {
          const x = Number((index * step).toFixed(2));
          const y =
            VIEWBOX_HEIGHT -
            Number.parseFloat(
              ((entry.local / maxValue) * VIEWBOX_HEIGHT).toFixed(2),
            );
          return (
            <circle
              key={`${entry.hour}-${index}`}
              cx={x}
              cy={y}
              r={1.6}
              fill="rgba(56,189,248,1)"
              stroke="rgba(14,165,233,0.75)"
              className={clsx(entry.local === 0 && 'opacity-0')}
            />
          );
        })}
      </svg>
      <div className="mt-3 flex items-center justify-between text-[11px] tracking-[0.25em] text-slate-400 uppercase dark:text-white/40">
        <span>Snapshot baseline</span>
        <span>Local runtime</span>
      </div>
    </div>
  );
};
