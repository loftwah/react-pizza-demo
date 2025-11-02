import { describe, expect, it } from 'vitest';
import {
  composeCartItemKey,
  createDefaultCustomization,
  extrasForPizza,
  formatCurrency,
  hasCustomizations,
  hasFilterMatch,
  normalizeCustomization,
  priceForConfiguration,
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
  vegan: false,
  spicy: false,
  image: '/pizzas/margherita.jpg',
  category: 'savoury',
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
    expect(hasFilterMatch(samplePizza, 'vegan')).toBe(false);
  });

  it('applies customization pricing when extras are selected', () => {
    const customization = normalizeCustomization({
      addedIngredients: [{ id: 'truffle-oil', quantity: 1 }],
    });
    expect(priceForConfiguration(samplePizza, 'medium', customization)).toBe(
      14.7,
    );
  });

  it('builds cart item keys that incorporate customization details', () => {
    const baseKey = composeCartItemKey(
      samplePizza.id,
      'medium',
      createDefaultCustomization(),
    );
    const modifiedKey = composeCartItemKey(samplePizza.id, 'medium', {
      removedIngredients: ['mozzarella'],
      addedIngredients: [{ id: 'truffle-oil', quantity: 1 }],
    });

    expect(baseKey).toBe('margherita-medium');
    expect(modifiedKey).toContain('rm-');
    expect(modifiedKey).not.toBe(baseKey);
  });

  it('provides dessert-only extras for sweet pizzas', () => {
    const dessertPizza: Pizza = {
      ...samplePizza,
      id: 'sweetie',
      category: 'dessert',
      toppings: [],
    };
    const extras = extrasForPizza(dessertPizza);
    expect(extras.some((ingredient) => ingredient.id === 'biscoff-crumb')).toBe(
      true,
    );
    expect(
      extras.some((ingredient) => ingredient.id === 'crispy-prosciutto'),
    ).toBe(false);
  });

  it('detects when a pizza has no customizations applied', () => {
    expect(hasCustomizations()).toBe(false);
    expect(
      hasCustomizations({
        removedIngredients: ['basil'],
      }),
    ).toBe(true);
  });
});
