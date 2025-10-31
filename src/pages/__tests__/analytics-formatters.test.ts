import { describe, expect, it } from 'vitest';
import type { AnalyticsMetric } from '../../domain/analytics';
import { formatCurrency } from '../../domain/pizza';
import {
  formatMetricChange,
  formatMetricValue,
  formatPercent,
} from '../analytics-formatters';

const buildMetric = (overrides: Partial<AnalyticsMetric>): AnalyticsMetric => ({
  id: 'test',
  label: 'Test metric',
  value: 0,
  unit: 'orders',
  change: 0,
  trend: 'steady',
  ...overrides,
});

describe('analytics formatters', () => {
  describe('formatMetricValue', () => {
    it('formats currency values using locale currency', () => {
      const metric = buildMetric({ unit: 'currency', value: 3124.5 });
      expect(formatMetricValue(metric)).toEqual(formatCurrency(3124.5));
    });

    it('formats percent values with no decimals', () => {
      const metric = buildMetric({ unit: 'percent', value: 54 });
      expect(formatMetricValue(metric)).toBe('54%');
    });

    it('formats minutes with one decimal precision', () => {
      const metric = buildMetric({ unit: 'minutes', value: 17.83 });
      expect(formatMetricValue(metric)).toBe('17.8 min');
    });

    it('formats order counts with grouping', () => {
      const metric = buildMetric({ unit: 'orders', value: 1234 });
      expect(formatMetricValue(metric)).toBe('1,234');
    });
  });

  describe('formatMetricChange', () => {
    it('adds prefix for positive percent deltas', () => {
      const metric = buildMetric({ unit: 'percent', change: 6 });
      expect(formatMetricChange(metric)).toBe('+6% vs yesterday');
    });

    it('appends percent symbol for currency deltas', () => {
      const metric = buildMetric({ unit: 'currency', change: 12 });
      expect(formatMetricChange(metric)).toBe('+12% vs yesterday');
    });

    it('formats minutes deltas with unit suffix', () => {
      const metric = buildMetric({ unit: 'minutes', change: -1.4 });
      expect(formatMetricChange(metric)).toBe('-1.4 min vs avg');
    });

    it('handles order deltas without units', () => {
      const metric = buildMetric({ unit: 'orders', change: -3 });
      expect(formatMetricChange(metric)).toBe('-3 vs yesterday');
    });
  });

  describe('formatPercent', () => {
    it('formats share values', () => {
      expect(formatPercent(0.27)).toBe('27%');
    });
  });
});
