import { z } from 'zod';
import { isDevEnvironment } from '../shared-utils/env';
import ingredientsJson from '../../public/api/ingredients.json?raw';

const IngredientCategorySchema = z.union([
  z.literal('savoury'),
  z.literal('dessert'),
]);

const IngredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  category: IngredientCategorySchema,
  dietary: z
    .object({
      vegetarian: z.boolean().optional(),
      vegan: z.boolean().optional(),
    })
    .optional(),
});

const IngredientListSchema = z.array(IngredientSchema);

export type IngredientDefinition = z.infer<typeof IngredientSchema>;
export type IngredientCategory = z.infer<typeof IngredientCategorySchema>;
export type IngredientId = IngredientDefinition['id'];

export type IngredientSelection = IngredientDefinition & {
  quantity: number;
};

const loadIngredientCatalog = (): IngredientDefinition[] => {
  try {
    const parsed = IngredientListSchema.parse(JSON.parse(ingredientsJson));
    return parsed;
  } catch (error) {
    if (isDevEnvironment()) {
      console.warn('[ingredients] Failed to load ingredient catalog', error);
    }
    return [];
  }
};

const catalog = loadIngredientCatalog();

export const ingredientCatalog: IngredientDefinition[] = [...catalog];

const ingredientMap = new Map<IngredientId, IngredientDefinition>(
  ingredientCatalog.map((ingredient) => [ingredient.id, ingredient]),
);

export const getIngredientById = (id: IngredientId) =>
  ingredientMap.get(id) ?? null;

export const isIngredientId = (value: string): value is IngredientId =>
  ingredientMap.has(value as IngredientId);

export const resolveIngredientSelections = (
  additions: { id: IngredientId; quantity: number }[],
): IngredientSelection[] => {
  const selections: IngredientSelection[] = [];
  additions.forEach(({ id, quantity }) => {
    const base = ingredientMap.get(id);
    if (!base) return;
    const normalizedQuantity = Number.isFinite(quantity)
      ? Math.max(0, Math.trunc(quantity))
      : 0;
    if (normalizedQuantity <= 0) return;
    selections.push({
      ...base,
      quantity: normalizedQuantity,
    });
  });
  return selections;
};

export const filterExtrasForContext = ({
  category,
  vegetarian,
  vegan,
}: {
  category: IngredientCategory;
  vegetarian: boolean;
  vegan: boolean;
}): IngredientDefinition[] =>
  ingredientCatalog.filter((ingredient) => {
    if (ingredient.category !== category) return false;
    if (vegan) {
      return ingredient.dietary?.vegan ?? false;
    }
    if (vegetarian) {
      return (
        ingredient.dietary?.vegetarian ?? ingredient.dietary?.vegan ?? false
      );
    }
    return true;
  });

if (import.meta.env.DEV) {
  Object.defineProperty(ingredientCatalog, 'displayName', {
    value: 'Station.IngredientCatalog',
  });
}
