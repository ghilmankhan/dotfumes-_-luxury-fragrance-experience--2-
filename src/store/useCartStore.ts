import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product } from '../models/types';

type CartActionResult = {
  ok: boolean;
  message: string;
};

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, quantity?: number) => CartActionResult;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (product, quantity = 1) => {
        if (product.stock <= 0) {
          return { ok: false, message: `${product.name} is currently out of stock.` };
        }

        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item.id === product.id);
        const requestedQuantity = Math.max(1, Math.floor(quantity));

        if (existingItem) {
          const nextQuantity = Math.min(existingItem.quantity + requestedQuantity, product.stock);

          if (nextQuantity === existingItem.quantity) {
            return {
              ok: false,
              message: `${product.name} is limited to ${product.stock} in stock.`,
            };
          }

          set({
            items: currentItems.map((item) =>
              item.id === product.id ? { ...item, quantity: nextQuantity } : item,
            ),
          });

          return {
            ok: true,
            message: `${product.name} quantity updated.`,
          };
        } else {
          const initialQuantity = Math.min(requestedQuantity, product.stock);
          set({ items: [...currentItems, { ...product, quantity: initialQuantity }] });

          return {
            ok: true,
            message: `${product.name} added to your selection.`,
          };
        }
      },
      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.id !== productId) });
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set({
          items: get().items.map((item) =>
            item.id === productId
              ? { ...item, quantity: Math.min(Math.floor(quantity), item.stock) }
              : item,
          ),
        });
      },
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      clearCart: () => set({ items: [] }),
      total: () => {
        return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'dotfumes-cart',
      version: 2,
      migrate: () => ({ items: [] }),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
