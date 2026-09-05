'use client';

import {
  CART_STORAGE_KEY,
  EMPTY_CART,
  MAX_LINE_QUANTITY,
  type Cart,
  type CartLine,
} from '@/lib/commerce/cart-types';

/**
 * The cart as an external store.
 *
 * localStorage is genuinely external to React, so it is read through
 * useSyncExternalStore rather than copied into state inside an effect. That
 * removes the hydration mismatch entirely: the server snapshot is always the
 * empty cart, and the client re-reads storage on subscribe.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

// Cached because getSnapshot must return a referentially stable value between
// changes, or React will re-render forever.
let snapshot: Cart = EMPTY_CART;
let hydrated = false;

function read(): Cart {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return EMPTY_CART;
    const parsed = JSON.parse(raw) as Cart;
    if (!parsed || !Array.isArray(parsed.lines)) return EMPTY_CART;
    return parsed;
  } catch {
    // Private mode, cleared site data, or a corrupt value: start empty.
    return EMPTY_CART;
  }
}

function write(cart: Cart) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage unavailable; the cart still works for this page session.
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: Listener): () => void {
  if (!hydrated) {
    snapshot = read();
    hydrated = true;
  }

  listeners.add(listener);

  // Keep the cart consistent across tabs.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== CART_STORAGE_KEY) return;
    snapshot = read();
    emit();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function getSnapshot(): Cart {
  return snapshot;
}

/** The server has no storage, so it always renders an empty cart. */
export function getServerSnapshot(): Cart {
  return EMPTY_CART;
}

function commit(next: Cart) {
  snapshot = next;
  write(next);
  emit();
}

export function addLine(line: CartLine) {
  const current = snapshot;
  const existing = current.lines.find((l) => l.productSizeId === line.productSizeId);

  commit({
    lines: existing
      ? current.lines.map((l) =>
          l.productSizeId === line.productSizeId
            ? { ...l, quantity: Math.min(l.quantity + line.quantity, MAX_LINE_QUANTITY) }
            : l,
        )
      : [...current.lines, { ...line, quantity: Math.min(line.quantity, MAX_LINE_QUANTITY) }],
    updatedAt: Date.now(),
  });
}

export function setQuantity(productSizeId: string, quantity: number) {
  const current = snapshot;

  commit({
    lines:
      quantity <= 0
        ? current.lines.filter((l) => l.productSizeId !== productSizeId)
        : current.lines.map((l) =>
            l.productSizeId === productSizeId
              ? { ...l, quantity: Math.min(quantity, MAX_LINE_QUANTITY) }
              : l,
          ),
    updatedAt: Date.now(),
  });
}

export function removeLine(productSizeId: string) {
  commit({
    lines: snapshot.lines.filter((l) => l.productSizeId !== productSizeId),
    updatedAt: Date.now(),
  });
}

export function clear() {
  if (!snapshot.lines.length) return;
  commit({ lines: [], updatedAt: Date.now() });
}

export function isHydrated(): boolean {
  return hydrated;
}
