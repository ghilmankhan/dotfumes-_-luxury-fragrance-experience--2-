import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product } from '../models/types';
import { getAvailableStock, isProductOutOfStock } from '../lib/validation';
import { useProductCatalogStore } from './useProductCatalogStore';

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
  decrementOrRemove: (productId: string) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (product, quantity = 1) => {
        const latestProduct =
          useProductCatalogStore.getState().allProducts.find((item) => item.id === product.id) || product;
        const availableStock = getAvailableStock(latestProduct);

        if (isProductOutOfStock(latestProduct) || latestProduct.active === false) {
          return { ok: false, message: `${latestProduct.name} is currently out of stock.` };
        }

        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item.id === product.id);
        const requestedQuantity = Math.max(1, Math.floor(quantity));

        if (existingItem) {
          const nextQuantity = Math.min(existingItem.quantity + requestedQuantity, availableStock);

          if (nextQuantity === existingItem.quantity) {
            return {
              ok: false,
              message: `${latestProduct.name} is limited to ${availableStock} in stock.`,
            };
          }

          set({
            items: currentItems.map((item) =>
              item.id === product.id ? { ...item, quantity: nextQuantity } : item,
            ),
          });

          return {
            ok: true,
            message: `${latestProduct.name} quantity updated.`,
          };
        } else {
          const initialQuantity = Math.min(requestedQuantity, availableStock);
          set({ items: [...currentItems, { ...latestProduct, quantity: initialQuantity }] });

          return {
            ok: true,
            message: `${latestProduct.name} added to your selection.`,
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

        const targetItem = get().items.find((item) => item.id === productId);
        if (!targetItem) {
          return;
        }

        const latestProduct =
          useProductCatalogStore.getState().allProducts.find((item) => item.id === productId) || targetItem;
        const availableStock = getAvailableStock(latestProduct);
        if (availableStock <= 0) {
          get().removeItem(productId);
          return;
        }

        const nextQuantity = Math.min(Math.floor(quantity), availableStock);
        if (nextQuantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set({
          items: get().items.map((item) =>
            item.id === productId
              ? {
                  ...item,
                  quantity: nextQuantity,
                  stock: availableStock,
                  ...(latestProduct.active !== undefined ? { active: latestProduct.active } : {}),
                }
              : item,
          ),
        });
      },
      decrementOrRemove: (productId) => {
        const targetItem = get().items.find((item) => item.id === productId);
        if (!targetItem) {
          return;
        }

        if (targetItem.quantity <= 1) {
          get().removeItem(productId);
          return;
        }

        get().updateQuantity(productId, targetItem.quantity - 1);
      },
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'dotfumes-cart',
      version: 2,
      migrate: () => ({ items: [] }),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export const selectCartCount = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectCartTotal = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
