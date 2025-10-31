export type PizzaSize = "small" | "medium" | "large";

export const sizeLabels: Record<PizzaSize, string> = {
  small: "Small 9″",
  medium: "Medium 12″",
  large: "Large 16″",
};

export const sizeMultipliers: Record<PizzaSize, number> = {
  small: 0.85,
  medium: 1,
  large: 1.35,
};

export type Pizza = {
  id: string;
  displayName: string;
  description: string;
  basePrice: number;
  toppings: string[];
  vegetarian: boolean;
  spicy: boolean;
  image: string;
};

export type PizzaFilter = "all" | "vegetarian" | "spicy";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-AU", {
    currency: "AUD",
    style: "currency",
    minimumFractionDigits: 2,
  }).format(value);

export const priceForSize = (pizza: Pizza, size: PizzaSize) =>
  Math.round(pizza.basePrice * sizeMultipliers[size] * 100) / 100;

export const hasFilterMatch = (pizza: Pizza, filter: PizzaFilter) => {
  if (filter === "vegetarian") return pizza.vegetarian;
  if (filter === "spicy") return pizza.spicy;
  return true;
};
