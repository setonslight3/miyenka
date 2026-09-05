'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  CART_STORAGE_KEY,
  EMPTY_CART,
  MAX_LINE_QUANTITY,
  cartCount,
  cartSubtotalMinor,
  type Cart,
  type CartLine,
} from '@/lib/commerce/cart-types';

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

function readStoredCart(): Cart {
  if (typeof window === 'undefined') return EMPTY_CART;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return EMPTY_CART;
    const parsed = JSON.parse(raw) as Cart;
    if (!parsed || !Array.isArray(parsed.lines)) return EMPTY_CART;
    return parsed;
  } catch {
    // Private mode, cleared storage or a corrupt value: start empty.
    return EMPTY_CART;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Read storage after mount so server and client markup match on first paint.
  useEffect(() => {
    setCart(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage unavailable; the cart still works for this page session.
    }
  }, [cart, hydrated]);

  // Keep the cart consistent across tabs.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) setCart(readStoredCart());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addLine = useCallback((line: CartLine) => {
    setCart((current) => {
      const existing = current.lines.find((l) => l.productSizeId === line.productSizeId);
      const lines = existing
        ? current.lines.map((l) =>
            l.productSizeId === line.productSizeId
              ? { ...l, quantity: Math.min(l.quantity + line.quantity, MAX_LINE_QUANTITY) }
              : l,
          )
        : [...current.lines, { ...line, quantity: Math.min(line.quantity, MAX_LINE_QUANTITY) }];
      return { lines, updatedAt: Date.now() };
    });
    setIsOpen(true);
  }, []);

  const setQuantity = useCallback((productSizeId: string, quantity: number) => {
    setCart((current) => ({
      lines:
        quantity <= 0
          ? current.lines.filter((l) => l.productSizeId !== productSizeId)
          : current.lines.map((l) =>
              l.productSizeId === productSizeId
                ? { ...l, quantity: Math.min(quantity, MAX_LINE_QUANTITY) }
                : l,
            ),
      updatedAt: Date.now(),
    }));
  }, []);

  const removeLine = useCallback((productSizeId: string) => {
    setCart((current) => ({
      lines: current.lines.filter((l) => l.productSizeId !== productSizeId),
      updatedAt: Date.now(),
    }));
  }, []);

  const clear = useCallback(() => setCart({ lines: [], updatedAt: Date.now() }), []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count: cartCount(cart),
      subtotalMinor: cartSubtotalMinor(cart),
      hydrated,
      addLine,
      setQuantity,
      removeLine,
      clear,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }),
    [cart, hydrated, isOpen, addLine, setQuantity, removeLine, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside a CartProvider.');
  return context;
}
