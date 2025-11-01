import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getPizzaById } from '../domain/menu';
import type { PizzaCustomization, PizzaSize } from '../domain/pizza';
import {
  composeCartItemKey,
  normalizeCustomization,
  priceForConfiguration,
} from '../domain/pizza';
import { isIngredientId } from '../domain/ingredients';
import type { OrderRecord } from './orders';

export type CartItem = {
  id: string;
  pizzaId: string;
  size: PizzaSize;
  quantity: number;
  customization?: PizzaCustomization;
};

type CartState = {
  items: CartItem[];
  addItem: (
    pizzaId: string,
    size: PizzaSize,
    customization?: Partial<PizzaCustomization>,
  ) => void;
  removeItem: (itemId: string) => void;
  decrementItem: (itemId: string) => void;
  clear: () => void;
  totalItems: () => number;
  totalPrice: () => number;
  hydrateFromOrder: (order: OrderRecord) => void;
};

const createCartItemId = (
  pizzaId: string,
  size: PizzaSize,
  customization?: Partial<PizzaCustomization>,
) => composeCartItemKey(pizzaId, size, customization);

const isPizzaSize = (value: string): value is PizzaSize =>
  value === 'small' || value === 'medium' || value === 'large';

const parseCartItemKey = (
  id: string,
): {
  pizzaId: string;
  size: string | undefined;
} => {
  const [base] = id.split('::');
  if (!base) return { pizzaId: id, size: undefined };
  const segments = base.split('-');
  if (segments.length < 2) return { pizzaId: base, size: undefined };
  const size = segments.at(-1);
  const pizzaId = segments.slice(0, -1).join('-');
  return { pizzaId, size };
};

const mapOrderCustomization = (
  customization?: OrderRecord['items'][number]['customization'],
) => {
  const addedIngredients =
    customization?.addedIngredients
      ?.map((ingredient) => ingredient.id)
      .filter(isIngredientId) ?? [];
  return normalizeCustomization({
    removedIngredients: customization?.removedIngredients ?? [],
    addedIngredients,
  });
};

const withHydratedCustomization = (item: CartItem): CartItem => {
  if (item.customization) {
    return {
      ...item,
      customization: normalizeCustomization(item.customization),
    };
  }
  return {
    ...item,
    customization: normalizeCustomization(undefined),
  };
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (pizzaId, size, customization) =>
        set((state) => {
          const normalizedCustomization = normalizeCustomization(customization);
          const id = createCartItemId(pizzaId, size, normalizedCustomization);
          const existing = state.items.find((item) => item.id === id);
          if (existing) {
            return {
              items: state.items.map((item) => {
                if (item.id !== id) return withHydratedCustomization(item);
                return {
                  ...withHydratedCustomization(item),
                  quantity: (item.quantity ?? 0) + 1,
                };
              }),
            };
          }
          return {
            items: [
              ...state.items.map(withHydratedCustomization),
              {
                id,
                pizzaId,
                size,
                quantity: 1,
                customization: normalizedCustomization,
              },
            ],
          };
        }),
      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        })),
      decrementItem: (itemId) =>
        set((state) => {
          const item = state.items.find((entry) => entry.id === itemId);
          if (!item) return state;
          if ((item.quantity ?? 1) === 1) {
            return {
              items: state.items.filter((entry) => entry.id !== itemId),
            };
          }
          return {
            items: state.items.map((entry) =>
              entry.id === itemId
                ? {
                    ...withHydratedCustomization(entry),
                    quantity: Math.max(1, (entry.quantity ?? 1) - 1),
                  }
                : withHydratedCustomization(entry),
            ),
          };
        }),
      clear: () => set({ items: [] }),
      hydrateFromOrder: (order) =>
        set(() => {
          const items: CartItem[] = [];
          order.items.forEach((item) => {
            const reference = parseCartItemKey(item.id);
            const sizeCandidate = item.size ?? reference.size ?? 'medium';
            const resolvedSize = isPizzaSize(sizeCandidate)
              ? sizeCandidate
              : 'medium';
            const pizzaId = item.pizzaId ?? reference.pizzaId;
            if (!pizzaId) return;
            const customization = mapOrderCustomization(item.customization);
            const fallbackId = createCartItemId(
              pizzaId,
              resolvedSize,
              customization,
            );
            const id =
              item.id && item.id.startsWith(`${pizzaId}-${resolvedSize}`)
                ? item.id
                : fallbackId;
            const rawQuantity =
              typeof item.quantity === 'number' ? item.quantity : 1;
            const quantity = Math.max(1, rawQuantity);
            items.push(
              withHydratedCustomization({
                id,
                pizzaId,
                size: resolvedSize,
                quantity,
                customization,
              }),
            );
          });
          return { items };
        }),
      totalItems: () =>
        get().items.reduce(
          (total, item) => total + Math.max(0, item.quantity ?? 0),
          0,
        ),
      totalPrice: () => {
        const total = get().items.reduce((sum, item) => {
          const pizza = getPizzaById(item.pizzaId);
          if (!pizza) return sum;
          const normalized = normalizeCustomization(item.customization);
          const unitPrice = priceForConfiguration(pizza, item.size, normalized);
          return sum + unitPrice * Math.max(0, item.quantity ?? 0);
        }, 0);
        return Math.round(total * 100) / 100;
      },
    }),
    {
      name: 'loftwah-pizza-cart',
      partialize: (state) => ({ items: state.items }),
      version: 2,
      migrate: (persistedState: unknown) => {
        if (
          persistedState &&
          typeof persistedState === 'object' &&
          'items' in persistedState
        ) {
          const items = Array.isArray(
            (persistedState as { items: unknown }).items,
          )
            ? ((persistedState as { items: unknown[] }).items ?? []).map(
                (item) =>
                  typeof item === 'object' && item !== null
                    ? {
                        ...item,
                        customization: normalizeCustomization(
                          (item as CartItem).customization,
                        ),
                      }
                    : item,
              )
            : [];
          return { ...(persistedState as object), items };
        }
        return persistedState;
      },
    },
  ),
);
