import {
  filterExtrasForContext,
  getIngredientById,
  isIngredientId,
  resolveIngredientSelections,
  type IngredientDefinition,
  type IngredientId,
} from './ingredients';

export type PizzaSize = 'small' | 'medium' | 'large';

export type PizzaCategory = 'savoury' | 'dessert' | 'drink';

export const sizeLabels: Record<PizzaSize, string> = {
  small: 'Small 9″',
  medium: 'Medium 12″',
  large: 'Large 16″',
};

export const sizeMultipliers: Record<PizzaSize, number> = {
  small: 0.85,
  medium: 1,
  large: 1.35,
};

export type PizzaCustomization = {
  removedIngredients: string[];
  addedIngredients: IngredientId[];
};

export const createDefaultCustomization = (): PizzaCustomization => ({
  removedIngredients: [],
  addedIngredients: [],
});

const sanitizeIngredient = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\u{2019}/gu, "'"); // normalise curly apostrophes

export const normalizeCustomization = (
  customization?: Partial<PizzaCustomization>,
): PizzaCustomization => {
  if (!customization) return createDefaultCustomization();
  const removed = Array.from(
    new Set(
      (customization.removedIngredients ?? [])
        .map((ingredient) => sanitizeIngredient(ingredient))
        .filter(Boolean),
    ),
  );
  const added = Array.from(
    new Set(
      (customization.addedIngredients ?? []).filter((ingredient) =>
        isIngredientId(ingredient),
      ),
    ),
  );
  return {
    removedIngredients: removed,
    addedIngredients: added,
  };
};

export const hasCustomizations = (
  customization?: Partial<PizzaCustomization>,
): boolean => {
  const normalized = normalizeCustomization(customization);
  return (
    normalized.removedIngredients.length > 0 ||
    normalized.addedIngredients.length > 0
  );
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildCustomizationKey = (customization: PizzaCustomization) => {
  const removed =
    customization.removedIngredients.length > 0
      ? customization.removedIngredients.map(slugify).sort().join('_')
      : 'base';
  const added =
    customization.addedIngredients.length > 0
      ? [...customization.addedIngredients].sort().join('_')
      : 'base';
  return `rm-${removed}__add-${added}`;
};

export const composeCartItemKey = (
  pizzaId: string,
  size: PizzaSize,
  customization?: Partial<PizzaCustomization>,
): string => {
  const normalized = normalizeCustomization(customization);
  if (!hasCustomizations(normalized)) {
    return `${pizzaId}-${size}`;
  }
  const key = buildCustomizationKey(normalized);
  return `${pizzaId}-${size}::${key}`;
};

export const resolveAddedIngredients = (
  customization?: Partial<PizzaCustomization>,
): IngredientDefinition[] => {
  const normalized = normalizeCustomization(customization);
  return resolveIngredientSelections(normalized.addedIngredients);
};

export const customizationUpcharge = (
  customization?: Partial<PizzaCustomization>,
): number => {
  const ingredients = resolveAddedIngredients(customization);
  const upcharge = ingredients.reduce((sum, ingredient) => {
    const price = Number.isFinite(ingredient.price) ? ingredient.price : 0;
    return sum + price;
  }, 0);
  return Math.round(upcharge * 100) / 100;
};

export type Pizza = {
  id: string;
  displayName: string;
  description: string;
  basePrice: number;
  toppings: string[];
  vegetarian: boolean;
  vegan?: boolean;
  spicy: boolean;
  image: string;
  category?: PizzaCategory;
  allowCustomization?: boolean;
  sizeLabelsOverride?: Partial<Record<PizzaSize, string>>;
};

export type PizzaFilter = 'all' | 'vegetarian' | 'spicy' | 'vegan';

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-AU', {
    currency: 'AUD',
    style: 'currency',
    minimumFractionDigits: 2,
  }).format(value);

export const priceForSize = (pizza: Pizza, size: PizzaSize) =>
  Math.round(pizza.basePrice * sizeMultipliers[size] * 100) / 100;

export const priceForConfiguration = (
  pizza: Pizza,
  size: PizzaSize,
  customization?: Partial<PizzaCustomization>,
) => {
  const base = priceForSize(pizza, size);
  const upcharge = customizationUpcharge(customization);
  return Math.round((base + upcharge) * 100) / 100;
};

export const hasFilterMatch = (pizza: Pizza, filter: PizzaFilter) => {
  if (filter === 'vegan') return Boolean(pizza.vegan);
  if (filter === 'vegetarian') return pizza.vegetarian;
  if (filter === 'spicy') return pizza.spicy;
  return true;
};

export const extrasForPizza = (pizza: Pizza) => {
  if (pizza.allowCustomization === false || pizza.category === 'drink') {
    return [];
  }
  const category =
    pizza.category === 'dessert' ? 'dessert' : ('savoury' as const);
  return filterExtrasForContext({
    category,
    vegetarian: pizza.vegetarian,
    vegan: Boolean(pizza.vegan),
  });
};

export const resolveRemovedIngredients = (
  pizza: Pizza,
  customization?: Partial<PizzaCustomization>,
): string[] => {
  const normalized = normalizeCustomization(customization);
  return normalized.removedIngredients.filter((ingredient) =>
    pizza.toppings.includes(ingredient),
  );
};

export const hydrateCustomizationDetails = (
  pizza: Pizza,
  customization?: Partial<PizzaCustomization>,
) => {
  const normalized = normalizeCustomization(customization);
  const removed = resolveRemovedIngredients(pizza, normalized);
  const added = resolveAddedIngredients(normalized);
  return { removed, added };
};

export const getIngredientLabel = (id: IngredientId) =>
  getIngredientById(id)?.name ?? id;

if (import.meta.env.DEV) {
  Object.defineProperty(priceForConfiguration, 'displayName', {
    value: 'Station.PizzaPriceCalculator',
  });
}
