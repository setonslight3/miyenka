/**
 * The browser cart holds identifiers and quantities only.
 *
 * Prices shown from this object are for display; checkout re-reads every
 * price from the database server-side, so a tampered cart cannot change what
 * a customer is charged.
 */
export type CartLine = {
  productId: string;
  variantId: string;
  productSizeId: string;
  quantity: number;

  // Display snapshot, refreshed from the server whenever the cart is shown.
  slug: string;
  name: string;
  colorName: string;
  size: string;
  imageUrl: string | null;
  unitPriceMinor: number;
};

export type Cart = { lines: CartLine[]; updatedAt: number };

export const EMPTY_CART: Cart = { lines: [], updatedAt: 0 };
export const CART_STORAGE_KEY = 'miyenka.cart.v1';
export const MAX_LINE_QUANTITY = 10;

export function cartCount(cart: Cart): number {
  return cart.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartSubtotalMinor(cart: Cart): number {
  return cart.lines.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0);
}

export function lineKey(line: Pick<CartLine, 'productSizeId'>): string {
  return line.productSizeId;
}
