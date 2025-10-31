import type { Pizza } from './pizza';

const withBasePath = (file: string) => `${import.meta.env.BASE_URL}${file}`;
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
];

export const fetchMenu = async (): Promise<Pizza[]> => {
  const endpoint = `${import.meta.env.BASE_URL}api/menu.json`;
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
    if (import.meta.env.DEV) {
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
