import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  hasFilterMatch,
  priceForSize,
  sizeLabels,
  type Pizza,
} from '../pizza';

const samplePizza: Pizza = {
  id: 'margherita',
  displayName: 'Margherita',
  description: 'Classic tomato, mozzarella, and basil.',
  basePrice: 12.5,
  toppings: ['mozzarella', 'basil'],
  vegetarian: true,
  spicy: false,
  image: '/pizzas/margherita.jpg',
};

describe('pizza domain helpers', () => {
  it('formats currency in Australian dollars', () => {
    expect(formatCurrency(18)).toMatch(/(A\$|AU\$|\$)18\.00/);
    expect(formatCurrency(18.5)).toMatch(/(A\$|AU\$|\$)18\.50/);
  });

  it('computes size-specific price with the configured multiplier', () => {
    expect(priceForSize(samplePizza, 'small')).toBe(10.63);
    expect(priceForSize(samplePizza, 'medium')).toBe(12.5);
    expect(priceForSize(samplePizza, 'large')).toBe(16.88);
  });

  it('labels sizes for checkout display', () => {
    expect(sizeLabels.small).toBe('Small 9″');
    expect(sizeLabels.medium).toBe('Medium 12″');
    expect(sizeLabels.large).toBe('Large 16″');
  });

  it('matches pizzas against filter selections', () => {
    expect(hasFilterMatch(samplePizza, 'all')).toBe(true);
    expect(hasFilterMatch(samplePizza, 'vegetarian')).toBe(true);
    expect(hasFilterMatch(samplePizza, 'spicy')).toBe(false);
  });
});
