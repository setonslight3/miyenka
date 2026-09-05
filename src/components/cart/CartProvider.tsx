'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import * as store from '@/lib/commerce/cart-store';
import { cartCount, cartSubtotalMinor, type Cart, type CartLine } from '@/lib/commerce/cart-types';

type CartContextValue = {
  cart: Cart;
  count: number;
  subtotalMinor: number;
  hydrated: boolean;
  addLine: (line: CartLine) => void;
  setQuantity: (productSizeId: string, quantity: number) => void;
  removeLine: (productSizeId: string) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const hydrated = useSyncExternalStore(
    store.subscribe,
    store.isHydrated,
    () => false,
  );

  const [isOpen, setIsOpen] = useState(false);

  const addLine = useCallback((line: CartLine) => {
    store.addLine(line);
    setIsOpen(true);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count: cartCount(cart),
      subtotalMinor: cartSubtotalMinor(cart),
      hydrated,
      addLine,
      setQuantity: store.setQuantity,
      removeLine: store.removeLine,
      clear: store.clear,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }),
    [cart, hydrated, isOpen, addLine],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside a CartProvider.');
  return context;
}
