import { z } from 'zod';
import { getBaseUrl } from '../shared-utils/base-url';
import { isDevEnvironment } from '../shared-utils/env';
import type { Pizza } from './pizza';

const withBasePath = (file: string) => `${getBaseUrl()}${file}`;
const imageWithBasePath = (image: string) =>
  image.startsWith('http') ? image : withBasePath(image.replace(/^\//, ''));

const PizzaSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1),
  basePrice: z.number().nonnegative(),
  toppings: z.array(z.string().min(1)),
  vegetarian: z.boolean(),
  vegan: z.boolean().optional(),
  spicy: z.boolean(),
  image: z.string().min(1),
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

export const menu: Pizza[] = [
  {
    id: 'pepperoni-classic',
    displayName: 'Pepperoni Classic',
    description:
      'Tomato sugo, shredded mozzarella, pepperoni cups, oregano oil.',
    basePrice: 16,
    toppings: ['Tomato', 'Mozzarella', 'Pepperoni'],
    vegetarian: false,
    vegan: false,
    spicy: false,
    category: 'savoury',
    image: imageWithBasePath('pepperoni-classic.jpg'),
  },
  {
    id: 'smoky-bbq',
    displayName: 'Smoky BBQ Chicken',
    description:
      'BBQ sauce base, roast chicken, charred corn, red onion, parsley.',
    basePrice: 18,
    toppings: ['BBQ Sauce', 'Chicken', 'Corn', 'Parsley'],
    vegetarian: false,
    vegan: false,
    spicy: false,
    category: 'savoury',
    image: imageWithBasePath('smokey-bbq-chicken.jpg'),
  },
  {
    id: 'firecracker',
    displayName: 'Firecracker',
    description:
      'Scorpion pepper oil, spicy salami, jalapeños, hot honey drizzle.',
    basePrice: 19,
    toppings: ['Scorpion Oil', 'Salami', 'Jalapeño', 'Hot Honey'],
    vegetarian: false,
    spicy: true,
    vegan: false,
    category: 'savoury',
    image: imageWithBasePath('firecracker.jpg'),
  },
  {
    id: 'green-garden',
    displayName: 'Green Garden',
    description:
      'Basil pesto base, cherry tomato confit, marinated zucchini, ricotta.',
    basePrice: 17,
    toppings: ['Pesto', 'Tomato', 'Zucchini', 'Ricotta'],
    vegetarian: true,
    vegan: false,
    spicy: false,
    category: 'savoury',
    image: imageWithBasePath('green-garden.jpg'),
  },
  {
    id: 'wild-mushroom',
    displayName: 'Wild Mushroom',
    description: 'Garlic cream, roasted field mushrooms, truffle salt, chives.',
    basePrice: 20,
    toppings: ['Garlic Cream', 'Mushroom', 'Truffle Salt'],
    vegetarian: true,
    vegan: false,
    spicy: false,
    category: 'savoury',
    image: imageWithBasePath('wild-mushroom.jpg'),
  },
  {
    id: 'pineapple-party',
    displayName: 'Pineapple Party',
    description:
      'Tomato sugo, leg ham, fire-roasted pineapple, pickled chilli.',
    basePrice: 18,
    toppings: ['Tomato', 'Ham', 'Pineapple', 'Chilli'],
    vegetarian: false,
    vegan: false,
    spicy: true,
    category: 'savoury',
    image: imageWithBasePath('pineapple-party.jpg'),
  },
  {
    id: 'sunrise-margherita',
    displayName: 'Sunrise Margherita',
    description: 'Slow-roasted tomatoes, stracciatella, basil oil, lemon zest.',
    basePrice: 17,
    toppings: ['Tomato', 'Stracciatella', 'Basil Oil', 'Lemon Zest'],
    vegetarian: true,
    vegan: false,
    spicy: false,
    category: 'savoury',
    image: imageWithBasePath('sunrise-margherita.jpg'),
  },
  {
    id: 'smoked-maple-bacon',
    displayName: 'Smoked Maple Bacon',
    description:
      'Maple glaze, smoked bacon, roasted sweet potato, pickled onion.',
    basePrice: 19,
    toppings: ['Maple', 'Bacon', 'Sweet Potato', 'Pickled Onion'],
    vegetarian: false,
    vegan: false,
    spicy: false,
    category: 'savoury',
    image: imageWithBasePath('smoked-maple-bacon.jpg'),
  },
  {
    id: 'calabrian-scorcher',
    displayName: 'Calabrian Scorcher',
    description:
      'Nduja butter base, fennel sausage, charred peppers, chilli honey.',
    basePrice: 21,
    toppings: ['Nduja', 'Fennel Sausage', 'Charred Peppers', 'Chilli Honey'],
    vegetarian: false,
    spicy: true,
    vegan: false,
    category: 'savoury',
    image: imageWithBasePath('calabrian-scorcher.jpg'),
  },
  {
    id: 'forest-fable',
    displayName: 'Forest Fable (Vegan)',
    description:
      'Porcini cashew cream, rosemary roast potatoes, caramelised shallot, crispy sage.',
    basePrice: 20,
    toppings: [
      'Porcini Cashew Cream',
      'Rosemary Potatoes',
      'Caramelised Shallot',
      'Crispy Sage',
    ],
    vegetarian: true,
    vegan: true,
    spicy: false,
    category: 'savoury',
    image: imageWithBasePath('forest-fable.jpg'),
  },
  {
    id: 'home-alone-cheese',
    displayName: 'Home Alone Cheese Pizza',
    description: 'Crisp base, tomato sugo, melty mozzarella, olive oil gloss.',
    basePrice: 17,
    toppings: ['Tomato Sugo', 'Mozzarella', 'Olive Oil Gloss'],
    vegetarian: true,
    vegan: false,
    spicy: false,
    category: 'savoury',
    image: imageWithBasePath('home-alone-cheese.jpg'),
  },
  {
    id: 'home-alone-vegan-cheese',
    displayName: 'Home Alone Vegan Cheese Pizza',
    description:
      'Crisp base, tomato sugo, melty vegan mozzarella, olive oil gloss.',
    basePrice: 17,
    toppings: ['Tomato Sugo', 'Vegan Mozzarella', 'Olive Oil Gloss'],
    vegetarian: true,
    vegan: true,
    spicy: false,
    category: 'savoury',
    image: imageWithBasePath('home-alone-cheese.jpg'),
  },
  {
    id: 'white-chocolate-nutella-biscoff',
    displayName: 'White Chocolate Nutella Biscoff',
    description:
      'Cinnamon crust, warm white chocolate ganache, Nutella ripple, crushed Biscoff biscuit.',
    basePrice: 18,
    toppings: ['White Chocolate', 'Nutella', 'Biscoff Crumb', 'Cinnamon'],
    vegetarian: true,
    vegan: false,
    spicy: false,
    category: 'dessert',
    image: imageWithBasePath('white-chocolate-biscoff.jpg'),
  },
  {
    id: 'nutella-chocolate',
    displayName: 'Nutella Chocolate',
    description:
      'Toasted base, Nutella spread, dark chocolate shards, strawberry compote drizzle.',
    basePrice: 17,
    toppings: ['Nutella', 'Dark Chocolate Shards', 'Strawberry Compote'],
    vegetarian: true,
    vegan: false,
    spicy: false,
    category: 'dessert',
    image: imageWithBasePath('nutella-chocolate.jpg'),
  },
  {
    id: 'loftwah-cola',
    displayName: 'Loftwah Cola',
    description:
      'House-label cola with a crisp finish. Served chilled in share-friendly bottles.',
    basePrice: 5,
    toppings: [],
    vegetarian: true,
    vegan: true,
    spicy: false,
    category: 'drink',
    allowCustomization: false,
    sizeLabelsOverride: {
      small: '375 ml',
      medium: '600 ml',
      large: '1 L',
    },
    image: imageWithBasePath('loftwah-cola.jpg'),
  },
];

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
