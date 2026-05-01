import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, Product } from '../types/shop';

const VALID_PROMOS: Record<string, number> = {
  AISMART10: 0.1,
  SAVE15: 0.15,
};

type CartState = {
  lines: CartLine[];
  isOpen: boolean;
  promoCode: string;
  discountRate: number;
  open: () => void;
  close: () => void;
  add: (product: Product, quantity?: number) => void;
  remove: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  saveForLater: (productId: string, savedForLater: boolean) => void;
  clear: () => void;
  applyPromo: (code: string) => boolean;
  clearPromo: () => void;
  subtotal: () => number;
  discount: () => number;
  finalTotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      promoCode: '',
      discountRate: 0,

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
              isOpen: true,
            };
          }
          return { lines: [...state.lines, { product, quantity, savedForLater: false }], isOpen: true };
        }),

      remove: (productId) =>
        set((state) => ({ lines: state.lines.filter((line) => line.product.id !== productId) })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          lines: state.lines.map((line) =>
            line.product.id === productId ? { ...line, quantity: Math.max(1, quantity) } : line
          ),
        })),

      saveForLater: (productId, savedForLater) =>
        set((state) => ({
          lines: state.lines.map((line) => (line.product.id === productId ? { ...line, savedForLater } : line)),
        })),

      clear: () => set({ lines: [], promoCode: '', discountRate: 0 }),

      applyPromo: (code) => {
        const rate = VALID_PROMOS[code.trim().toUpperCase()] ?? 0;
        set({ promoCode: code.trim().toUpperCase(), discountRate: rate });
        return rate > 0;
      },

      clearPromo: () => set({ promoCode: '', discountRate: 0 }),

      subtotal: () =>
        get().lines.reduce(
          (sum, line) => (line.savedForLater ? sum : sum + line.product.price * line.quantity),
          0
        ),

      discount: () => {
        const sub = get().subtotal();
        return Math.round(sub * get().discountRate * 100) / 100;
      },

      finalTotal: () => {
        const sub = get().subtotal();
        const disc = get().discount();
        const shippingGap = Math.max(0, 75 - sub);
        const shipping = shippingGap === 0 || sub === 0 ? 0 : 6.99;
        return Math.max(0, sub - disc) + shipping;
      },
    }),
    { name: 'shopmind-cart' }
  )
);
