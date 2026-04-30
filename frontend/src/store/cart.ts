import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, Product } from '../types/shop';

type CartState = {
  lines: CartLine[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (product: Product, quantity?: number) => void;
  remove: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  saveForLater: (productId: string, savedForLater: boolean) => void;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      add: (product, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((line) => line.product.id === product.id && !line.savedForLater);
          if (existing) {
            return {
              lines: state.lines.map((line) =>
                line.product.id === product.id && !line.savedForLater
                  ? { ...line, quantity: line.quantity + quantity }
                  : line
              ),
              isOpen: true
            };
          }
          return { lines: [...state.lines, { product, quantity, savedForLater: false }], isOpen: true };
        }),
      remove: (productId) => set((state) => ({ lines: state.lines.filter((line) => line.product.id !== productId) })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          lines: state.lines.map((line) =>
            line.product.id === productId ? { ...line, quantity: Math.max(1, quantity) } : line
          )
        })),
      saveForLater: (productId, savedForLater) =>
        set((state) => ({
          lines: state.lines.map((line) => (line.product.id === productId ? { ...line, savedForLater } : line))
        })),
      subtotal: () =>
        get().lines.reduce(
          (sum, line) => (line.savedForLater ? sum : sum + line.product.price * line.quantity),
          0
        )
    }),
    { name: 'shopmind-cart' }
  )
);
