import { z } from 'zod';
import { getBaseUrl } from '../shared-utils/base-url';
import { isDevEnvironment } from '../shared-utils/env';
import type { Pizza } from './pizza';
import menuJson from '../../public/api/menu.json?raw';

const withBasePath = (file: string) => `${getBaseUrl()}${file}`;
const imageWithBasePath = (image: string) =>
  image.startsWith('http') ? image : withBasePath(image.replace(/^\//, ''));

const PriceTableSchema = z.object({
  small: z.number().nonnegative(),
  medium: z.number().nonnegative(),
  large: z.number().nonnegative(),
});

const PizzaSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1),
  toppings: z.array(z.string().min(1)),
  vegetarian: z.boolean(),
  vegan: z.boolean().optional(),
  spicy: z.boolean(),
  image: z.string().min(1),
  prices: PriceTableSchema,
  category: z.enum(['savoury', 'dessert', 'drink']).optional(),
  allowCustomization: z.boolean().optional(),
  sizeLabelsOverride: z
    .object({
      small: z.string().min(1).optional(),
      medium: z.string().min(1).optional(),
      large: z.string().min(1).optional(),
    })
    .optional(),
});

const MenuSchema = z.array(PizzaSchema);

const loadStaticMenu = (): Pizza[] => {
  try {
    const raw = JSON.parse(menuJson) as unknown;
    const parsed = MenuSchema.parse(raw);
    return parsed.map((pizza) => ({
      ...pizza,
      image: imageWithBasePath(pizza.image),
    }));
  } catch (error) {
    if (isDevEnvironment()) {
      console.warn('[menu] Failed to load static menu data', error);
    }
    return [];
  }
};

export const menu: Pizza[] = loadStaticMenu();

// Validate at module load; parse throws in dev if data drifts.
(() => {
  const validation = MenuSchema.safeParse(menu);
  if (!validation.success && isDevEnvironment()) {
    console.warn('[menu] Static menu data failed validation', validation.error);
  }
})();

export const fetchMenu = async (): Promise<Pizza[]> => {
  const endpoint = `${getBaseUrl()}api/menu.json`;
  try {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Menu request failed with status ${response.status}`);
    }
    const data = await response.json();
    const parsed = MenuSchema.parse(data);
    return parsed.map((pizza) => ({
      ...pizza,
      image: imageWithBasePath(pizza.image),
    }));
  } catch (error) {
    if (isDevEnvironment()) {
      console.warn(
        '[menu] Falling back to embedded pizza data after fetch error:',
        error,
      );
    }
    return menu;
  }
};

export const getPizzaById = (id: string) =>
  menu.find((pizza) => pizza.id === id);
