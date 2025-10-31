import type { AnalyticsMetric } from '../domain/analytics';
import { formatCurrency } from '../domain/pizza';

const percentFormatter = new Intl.NumberFormat('en-AU', {
  style: 'percent',
  maximumFractionDigits: 0,
});

export const formatPercent = (value: number) => percentFormatter.format(value);

export const formatMetricValue = (metric: AnalyticsMetric) => {
  if (metric.unit === 'currency') {
    return formatCurrency(metric.value);
  }
  if (metric.unit === 'percent') {
    return formatPercent(metric.value / 100);
  }
  if (metric.unit === 'minutes') {
    return `${metric.value.toFixed(1)} min`;
  }
  return metric.value.toLocaleString();
};

export const formatMetricChange = (metric: AnalyticsMetric) => {
  if (metric.unit === 'percent') {
    const prefix = metric.change > 0 ? '+' : '';
    return `${prefix}${formatPercent(metric.change / 100)} vs yesterday`;
  }
  if (metric.unit === 'currency') {
    const prefix = metric.change > 0 ? '+' : '';
    return `${prefix}${metric.change}% vs yesterday`;
  }
  if (metric.unit === 'minutes') {
    const prefix = metric.change > 0 ? '+' : '';
    return `${prefix}${metric.change.toFixed(1)} min vs avg`;
  }
  const prefix = metric.change > 0 ? '+' : '';
  return `${prefix}${metric.change} vs yesterday`;
};
