import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PizzaSize } from '../domain/pizza';

export type OrderLineItem = {
  id: string;
  pizzaId?: string;
  size?: PizzaSize;
  name: string;
  sizeLabel: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderRecord = {
  id: string;
  customer: string;
  contact: string;
  instructions: string;
  total: number;
  createdAt: string;
  items: OrderLineItem[];
};

type OrderHistoryState = {
  orders: OrderRecord[];
  addOrder: (order: OrderRecord) => void;
  clearOrders: () => void;
};

const MAX_HISTORY = 8;

export const useOrderHistory = create<OrderHistoryState>()(
  persist(
    (set) => ({
      orders: [],
      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders].slice(0, MAX_HISTORY),
        })),
      clearOrders: () => set({ orders: [] }),
    }),
    {
      name: 'loftwah-pizza-orders',
      partialize: (state) => ({ orders: state.orders }),
    },
  ),
);
