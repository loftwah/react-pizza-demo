import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getPizzaById } from '../domain/menu';
import type { PizzaSize } from '../domain/pizza';
import { priceForSize } from '../domain/pizza';
import type { OrderRecord } from './orders';

export type CartItem = {
  id: string;
  pizzaId: string;
  size: PizzaSize;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (pizzaId: string, size: PizzaSize) => void;
  removeItem: (itemId: string) => void;
  decrementItem: (itemId: string) => void;
  clear: () => void;
  totalItems: () => number;
  totalPrice: () => number;
  hydrateFromOrder: (order: OrderRecord) => void;
};

const createCartItemId = (pizzaId: string, size: PizzaSize) =>
  `${pizzaId}-${size}`;

const isPizzaSize = (value: string): value is PizzaSize =>
  value === 'small' || value === 'medium' || value === 'large';

const parseCartItemKey = (
  id: string,
): { pizzaId: string; size: string | undefined } => {
  const lastDash = id.lastIndexOf('-');
  if (lastDash === -1) {
    return { pizzaId: id, size: undefined };
  }
  return {
    pizzaId: id.slice(0, lastDash),
    size: id.slice(lastDash + 1),
  };
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (pizzaId, size) =>
        set((state) => {
          const id = createCartItemId(pizzaId, size);
          const existing = state.items.find((item) => item.id === id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              ),
            };
          }
          return {
            items: [...state.items, { id, pizzaId, size, quantity: 1 }],
          };
        }),
      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        })),
      decrementItem: (itemId) =>
        set((state) => {
          const item = state.items.find((i) => i.id === itemId);
          if (!item) return state;
          if (item.quantity === 1) {
            return { items: state.items.filter((i) => i.id !== itemId) };
          }
          return {
            items: state.items.map((i) =>
              i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i,
            ),
          };
        }),
      clear: () => set({ items: [] }),
      hydrateFromOrder: (order) =>
        set({
          items: order.items.map((item) => {
            const reference = parseCartItemKey(item.id);
            const sizeCandidate = item.size ?? reference.size ?? 'medium';
            const resolvedSize = isPizzaSize(sizeCandidate)
              ? sizeCandidate
              : 'medium';
            return {
              id: item.id,
              pizzaId: item.pizzaId ?? reference.pizzaId,
              size: resolvedSize,
              quantity: Math.max(1, item.quantity),
            };
          }),
        }),
      totalItems: () =>
        get().items.reduce((total, item) => total + item.quantity, 0),
      totalPrice: () =>
        get().items.reduce((total, item) => {
          const pizza = getPizzaById(item.pizzaId);
          if (!pizza) return total;
          return total + priceForSize(pizza, item.size) * item.quantity;
        }, 0),
    }),
    {
      name: 'loftwah-pizza-cart',
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
