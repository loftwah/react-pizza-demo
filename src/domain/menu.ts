import type { Pizza } from './pizza'

export const menu: Pizza[] = [
  {
    id: 'pepperoni-classic',
    displayName: 'Pepperoni Classic',
    description: 'Tomato sugo, shredded mozzarella, pepperoni cups, oregano oil.',
    basePrice: 16,
    toppings: ['Tomato', 'Mozzarella', 'Pepperoni'],
    vegetarian: false,
    spicy: false,
    image: '/pepperoni-classic.png',
  },
  {
    id: 'smoky-bbq',
    displayName: 'Smoky BBQ Chicken',
    description: 'BBQ sauce base, roast chicken, charred corn, red onion, parsley.',
    basePrice: 18,
    toppings: ['BBQ Sauce', 'Chicken', 'Corn', 'Parsley'],
    vegetarian: false,
    spicy: false,
    image: '/smokey-bbq-chicken.png',
  },
  {
    id: 'firecracker',
    displayName: 'Firecracker',
    description: 'Scorpion pepper oil, spicy salami, jalapeños, hot honey drizzle.',
    basePrice: 19,
    toppings: ['Scorpion Oil', 'Salami', 'Jalapeño', 'Hot Honey'],
    vegetarian: false,
    spicy: true,
    image: '/firecracker.png',
  },
  {
    id: 'green-garden',
    displayName: 'Green Garden',
    description: 'Basil pesto base, cherry tomato confit, marinated zucchini, ricotta.',
    basePrice: 17,
    toppings: ['Pesto', 'Tomato', 'Zucchini', 'Ricotta'],
    vegetarian: true,
    spicy: false,
    image: '/green-garden.png',
  },
  {
    id: 'wild-mushroom',
    displayName: 'Wild Mushroom',
    description: 'Garlic cream, roasted field mushrooms, truffle salt, chives.',
    basePrice: 20,
    toppings: ['Garlic Cream', 'Mushroom', 'Truffle Salt'],
    vegetarian: true,
    spicy: false,
    image: '/wild-mushroom.png',
  },
  {
    id: 'pineapple-party',
    displayName: 'Pineapple Party',
    description: 'Tomato sugo, leg ham, fire-roasted pineapple, pickled chilli.',
    basePrice: 18,
    toppings: ['Tomato', 'Ham', 'Pineapple', 'Chilli'],
    vegetarian: false,
    spicy: true,
    image: '/pineapple-party.png',
  },
]

export const fetchMenu = async () => {
  await new Promise((resolve) => setTimeout(resolve, 450))
  return menu
}

export const getPizzaById = (id: string) => menu.find((pizza) => pizza.id === id)
