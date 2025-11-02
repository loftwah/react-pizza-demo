import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getPizzaById } from '../domain/menu';
import type { PizzaCustomization, PizzaSize } from '../domain/pizza';
import {
  composeCartItemKey,
  normalizeCustomization,
  priceForConfiguration,
} from '../domain/pizza';
import { isIngredientId, type IngredientId } from '../domain/ingredients';
import type { OrderRecord } from './orders';

export type CartItem = {
  id: string;
  pizzaId: string;
  size: PizzaSize;
  quantity: number;
  customization?: PizzaCustomization;
  lineUid: string;
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
  updateCustomization: (
    itemId: string,
    customization: Partial<PizzaCustomization>,
  ) => void;
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
  const addedIngredients: Array<{ id: IngredientId; quantity: number }> = [];
  customization?.addedIngredients?.forEach((ingredient) => {
    if (!isIngredientId(ingredient.id)) {
      return;
    }
    const quantity = Number.isFinite(ingredient.quantity)
      ? Math.max(0, Math.trunc(ingredient.quantity ?? 0))
      : 0;
    if (quantity <= 0) {
      return;
    }
    addedIngredients.push({ id: ingredient.id, quantity });
  });
  return normalizeCustomization({
    removedIngredients: customization?.removedIngredients ?? [],
    addedIngredients,
  });
};

const withHydratedCustomization = (item: CartItem): CartItem => {
  const lineUid =
    typeof item.lineUid === 'string' && item.lineUid.length > 0
      ? item.lineUid
      : createLineUid();
  if (item.customization) {
    return {
      ...item,
      lineUid,
      customization: normalizeCustomization(item.customization),
    };
  }
  return {
    ...item,
    lineUid,
    customization: normalizeCustomization(undefined),
  };
};

const createLineUid = () =>
  `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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
                lineUid: createLineUid(),
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
      updateCustomization: (itemId, customization) =>
        set((state) => {
          const index = state.items.findIndex((item) => item.id === itemId);
          if (index === -1) {
            return state;
          }
          const existing = state.items[index];
          const normalized = normalizeCustomization(customization);
          const nextId = createCartItemId(
            existing.pizzaId,
            existing.size,
            normalized,
          );
          if (existing.id === nextId) {
            const currentNormalized = normalizeCustomization(
              existing.customization,
            );
            if (
              JSON.stringify(currentNormalized) === JSON.stringify(normalized)
            ) {
              return state;
            }
          }
          const remaining = state.items
            .filter((_, currentIndex) => currentIndex !== index)
            .map(withHydratedCustomization);
          const duplicateIndex = remaining.findIndex(
            (entry) => entry.id === nextId,
          );
          if (duplicateIndex >= 0) {
            const duplicate = remaining[duplicateIndex];
            const mergedQuantity =
              Math.max(0, duplicate.quantity ?? 0) +
              Math.max(0, existing.quantity ?? 0);
            const nextItems = [...remaining];
            nextItems[duplicateIndex] = withHydratedCustomization({
              ...duplicate,
              quantity: mergedQuantity,
            });
            return { items: nextItems };
          }
          const updatedItem = withHydratedCustomization({
            ...existing,
            id: nextId,
            customization: normalized,
            lineUid: existing.lineUid,
          });
          return {
            items: [...remaining, updatedItem],
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
                lineUid: createLineUid(),
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
      version: 3,
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
                (item) => {
                  if (typeof item !== 'object' || item === null) {
                    return item;
                  }
                  const candidate = item as Partial<CartItem>;
                  const rawSize = (candidate as { size?: string }).size;
                  const size = isPizzaSize(String(rawSize ?? ''))
                    ? (rawSize as PizzaSize)
                    : 'medium';
                  return withHydratedCustomization({
                    id: String(candidate.id ?? ''),
                    pizzaId: String(candidate.pizzaId ?? ''),
                    size,
                    quantity: Math.max(
                      1,
                      Number.isFinite(candidate.quantity)
                        ? Number(candidate.quantity)
                        : 1,
                    ),
                    customization: normalizeCustomization(
                      candidate.customization,
                    ),
                    lineUid:
                      typeof candidate.lineUid === 'string' &&
                      candidate.lineUid.length > 0
                        ? candidate.lineUid
                        : createLineUid(),
                  });
                },
              )
            : [];
          return { ...(persistedState as object), items };
        }
        return persistedState;
      },
    },
  ),
);
