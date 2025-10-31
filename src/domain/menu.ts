import { getBaseUrl } from '../shared-utils/base-url';
import { isDevEnvironment } from '../shared-utils/env';
import type { Pizza } from './pizza';

const withBasePath = (file: string) => `${getBaseUrl()}${file}`;
const imageWithBasePath = (image: string) =>
  image.startsWith('http') ? image : withBasePath(image.replace(/^\//, ''));

export const menu: Pizza[] = [
  {
    id: 'pepperoni-classic',
    displayName: 'Pepperoni Classic',
    description:
      'Tomato sugo, shredded mozzarella, pepperoni cups, oregano oil.',
    basePrice: 16,
    toppings: ['Tomato', 'Mozzarella', 'Pepperoni'],
    vegetarian: false,
    spicy: false,
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
    spicy: false,
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
    spicy: false,
    image: imageWithBasePath('green-garden.jpg'),
  },
  {
    id: 'wild-mushroom',
    displayName: 'Wild Mushroom',
    description: 'Garlic cream, roasted field mushrooms, truffle salt, chives.',
    basePrice: 20,
    toppings: ['Garlic Cream', 'Mushroom', 'Truffle Salt'],
    vegetarian: true,
    spicy: false,
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
    spicy: true,
    image: imageWithBasePath('pineapple-party.jpg'),
  },
  {
    id: 'sunrise-margherita',
    displayName: 'Sunrise Margherita',
    description: 'Slow-roasted tomatoes, stracciatella, basil oil, lemon zest.',
    basePrice: 17,
    toppings: ['Tomato', 'Stracciatella', 'Basil Oil', 'Lemon Zest'],
    vegetarian: true,
    spicy: false,
    image: imageWithBasePath('green-garden.jpg'),
  },
  {
    id: 'smoked-maple-bacon',
    displayName: 'Smoked Maple Bacon',
    description:
      'Maple glaze, smoked bacon, roasted sweet potato, pickled onion.',
    basePrice: 19,
    toppings: ['Maple', 'Bacon', 'Sweet Potato', 'Pickled Onion'],
    vegetarian: false,
    spicy: false,
    image: imageWithBasePath('smokey-bbq-chicken.jpg'),
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
    image: imageWithBasePath('firecracker.jpg'),
  },
  {
    id: 'forest-fable',
    displayName: 'Forest Fable',
    description:
      'Porcini cream, rosemary potato, caramelised shallot, fried sage.',
    basePrice: 20,
    toppings: ['Porcini', 'Potato', 'Shallot', 'Sage'],
    vegetarian: true,
    spicy: false,
    image: imageWithBasePath('wild-mushroom.jpg'),
  },
];

export const fetchMenu = async (): Promise<Pizza[]> => {
  const endpoint = `${getBaseUrl()}api/menu.json`;
  try {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Menu request failed with status ${response.status}`);
    }
    const data = (await response.json()) as Pizza[];
    return data.map((pizza) => ({
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
