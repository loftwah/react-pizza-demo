export type IngredientId =
  | 'extra-mozzarella'
  | 'vegan-mozzarella'
  | 'cashew-parmesan'
  | 'fresh-basil'
  | 'roasted-garlic'
  | 'pickled-chilli'
  | 'sicilian-olives'
  | 'crispy-prosciutto'
  | 'smoked-bacon'
  | 'truffle-oil'
  | 'caramelised-onion'
  | 'charred-mushroom'
  | 'wild-rocket'
  | 'crispy-sage'
  | 'macadamia-crumble'
  | 'biscoff-crumb'
  | 'toasted-marshmallow'
  | 'strawberry-compote'
  | 'dark-chocolate-shard'
  | 'candied-hazelnut';

export type IngredientCategory = 'savoury' | 'dessert';

export type IngredientDefinition = {
  id: IngredientId;
  name: string;
  price: number;
  category: IngredientCategory;
  dietary?: {
    vegetarian?: boolean;
    vegan?: boolean;
  };
};

export type IngredientSelection = IngredientDefinition;

const RAW_INGREDIENTS: IngredientDefinition[] = [
  {
    id: 'extra-mozzarella',
    name: 'Extra mozzarella',
    price: 2,
    category: 'savoury',
    dietary: { vegetarian: true },
  },
  {
    id: 'vegan-mozzarella',
    name: 'Vegan mozzarella',
    price: 2.3,
    category: 'savoury',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'cashew-parmesan',
    name: 'Cashew parmesan',
    price: 2.4,
    category: 'savoury',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'fresh-basil',
    name: 'Fresh basil',
    price: 1.2,
    category: 'savoury',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'roasted-garlic',
    name: 'Roasted garlic',
    price: 1.3,
    category: 'savoury',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'pickled-chilli',
    name: 'Pickled chilli',
    price: 1.3,
    category: 'savoury',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'sicilian-olives',
    name: 'Sicilian olives',
    price: 1.4,
    category: 'savoury',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'crispy-prosciutto',
    name: 'Crispy prosciutto',
    price: 2.8,
    category: 'savoury',
    dietary: { vegetarian: false, vegan: false },
  },
  {
    id: 'smoked-bacon',
    name: 'Smoked bacon crumble',
    price: 2.6,
    category: 'savoury',
    dietary: { vegetarian: false, vegan: false },
  },
  {
    id: 'truffle-oil',
    name: 'Truffle oil drizzle',
    price: 2.2,
    category: 'savoury',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'caramelised-onion',
    name: 'Caramelised onion',
    price: 1.5,
    category: 'savoury',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'charred-mushroom',
    name: 'Charred mushrooms',
    price: 1.8,
    category: 'savoury',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'wild-rocket',
    name: 'Wild rocket',
    price: 1.4,
    category: 'savoury',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'crispy-sage',
    name: 'Crispy sage',
    price: 1.4,
    category: 'savoury',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'macadamia-crumble',
    name: 'Macadamia crumble',
    price: 1.7,
    category: 'dessert',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'biscoff-crumb',
    name: 'Biscoff crumb',
    price: 1.5,
    category: 'dessert',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'toasted-marshmallow',
    name: 'Toasted marshmallow',
    price: 1.8,
    category: 'dessert',
    dietary: { vegetarian: true, vegan: false },
  },
  {
    id: 'strawberry-compote',
    name: 'Strawberry compote',
    price: 1.6,
    category: 'dessert',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'dark-chocolate-shard',
    name: 'Dark chocolate shards',
    price: 1.7,
    category: 'dessert',
    dietary: { vegetarian: true, vegan: true },
  },
  {
    id: 'candied-hazelnut',
    name: 'Candied hazelnut',
    price: 1.9,
    category: 'dessert',
    dietary: { vegetarian: true, vegan: false },
  },
];

const ingredientMap = new Map<IngredientId, IngredientDefinition>(
  RAW_INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]),
);

export const ingredientCatalog: IngredientDefinition[] = [...RAW_INGREDIENTS];

export const getIngredientById = (id: IngredientId) =>
  ingredientMap.get(id) ?? null;

export const isIngredientId = (value: string): value is IngredientId =>
  ingredientMap.has(value as IngredientId);

export const resolveIngredientSelections = (
  ids: IngredientId[],
): IngredientSelection[] =>
  ids
    .map((id) => ingredientMap.get(id))
    .filter((ingredient): ingredient is IngredientDefinition =>
      Boolean(ingredient),
    );

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
