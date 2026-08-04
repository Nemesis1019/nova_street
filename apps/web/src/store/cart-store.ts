import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  type: 'STANDARD' | 'CUSTOM';
  productVariantId: string;
  quantity: number;
  name?: string;
  price?: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productVariantId: string) => void;
  updateQuantity: (productVariantId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productVariantId === item.productVariantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productVariantId === item.productVariantId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (productVariantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productVariantId !== productVariantId),
        })),
      updateQuantity: (productVariantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productVariantId !== productVariantId)
              : state.items.map((i) =>
                  i.productVariantId === productVariantId ? { ...i, quantity } : i,
                ),
        })),
      clearCart: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: 'anonymous-cart' },
  ),
);
