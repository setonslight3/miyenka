'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { formatMoney } from '@/lib/commerce/money';
import { cn } from '@/lib/utils/cn';

export function CartDrawer({ freeShippingThresholdMinor }: { freeShippingThresholdMinor: number }) {
  const { cart, isOpen, closeCart, setQuantity, removeLine, subtotalMinor, count } = useCart();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeCart]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const remaining = Math.max(0, freeShippingThresholdMinor - subtotalMinor);
  const progress = Math.min(100, (subtotalMinor / freeShippingThresholdMinor) * 100);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[70] transition-opacity duration-500',
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-hidden={!isOpen}
    >
      <button type="button" aria-label="Close cart" onClick={closeCart} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />

      <aside
        role="dialog"
        aria-label="Shopping bag"
        className={cn(
          'absolute inset-y-0 right-0 flex w-[min(28rem,100vw)] flex-col bg-cream transition-transform duration-500 ease-silk',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-7 py-5">
          <h2 className="font-display text-2xl font-light">
            Your Bag {count > 0 ? <span className="text-ink-faint">({count})</span> : null}
          </h2>
          <button type="button" onClick={closeCart} aria-label="Close cart" className="p-2 text-ink-muted hover:text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
            <p className="font-display text-3xl font-light text-ink-muted">Your bag is empty</p>
            <p className="text-sm text-ink-faint">Every piece is cut and finished by hand.</p>
            <Link
              href="/shop"
              onClick={closeCart}
              className="border border-ink px-8 py-3 text-[0.7rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream"
            >
              Explore the collection
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-7 py-6">
              {freeShippingThresholdMinor > 0 ? (
                <div className="mb-7">
                  <p className="text-xs text-ink-muted">
                    {remaining > 0 ? (
                      <>
                        <span className="text-ink">{formatMoney(remaining)}</span> away from complimentary
                        nationwide delivery
                      </>
                    ) : (
                      'Complimentary nationwide delivery unlocked'
                    )}
                  </p>
                  <div className="mt-2 h-px w-full bg-ink/10">
                    <div className="h-px bg-gold transition-all duration-700 ease-silk" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : null}

              <ul className="space-y-6">
                {cart.lines.map((line) => (
                  <li key={line.productSizeId} className="flex gap-4">
                    <Link href={`/product/${line.slug}`} onClick={closeCart} className="relative h-32 w-24 shrink-0 overflow-hidden bg-cream-deep">
                      {line.imageUrl ? (
                        <Image src={line.imageUrl} alt={line.name} fill sizes="96px" className="object-cover" />
                      ) : null}
                    </Link>

                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <Link href={`/product/${line.slug}`} onClick={closeCart} className="font-display text-lg leading-tight hover:text-gold-deep">
                          {line.name}
                        </Link>
                        <p className="mt-1 text-xs text-ink-faint">
                          {line.colorName} · Size {line.size}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-ink/15">
                          <button
                            type="button"
                            onClick={() => setQuantity(line.productSizeId, line.quantity - 1)}
                            aria-label={`Decrease quantity of ${line.name}`}
                            className="px-3 py-1.5 text-ink-muted hover:text-ink"
                          >
                            −
                          </button>
                          <span className="min-w-8 text-center text-sm" aria-live="polite">{line.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQuantity(line.productSizeId, line.quantity + 1)}
                            aria-label={`Increase quantity of ${line.name}`}
                            className="px-3 py-1.5 text-ink-muted hover:text-ink"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm">{formatMoney(line.unitPriceMinor * line.quantity)}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLine(line.productSizeId)}
                        className="self-start text-[0.65rem] uppercase tracking-wide text-ink-faint underline-offset-4 hover:text-burgundy hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-ink/10 px-7 py-6">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow">Subtotal</span>
                <span className="font-display text-2xl">{formatMoney(subtotalMinor)}</span>
              </div>
              <p className="mt-2 text-xs text-ink-faint">
                Shipping and any adjustments are calculated at checkout.
              </p>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="mt-5 block w-full bg-ink py-4 text-center text-[0.72rem] uppercase tracking-luxe text-cream transition-colors duration-500 hover:bg-ink-soft"
              >
                Proceed to checkout
              </Link>
              <Link
                href="/cart"
                onClick={closeCart}
                className="mt-3 block w-full py-2 text-center text-[0.68rem] uppercase tracking-wide text-ink-muted hover:text-ink"
              >
                View full bag
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
