'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/cart/CartProvider';
import { formatMoney } from '@/lib/commerce/money';

export function CartView({ freeShippingThresholdMinor }: { freeShippingThresholdMinor: number }) {
  const { cart, hydrated, setQuantity, removeLine, subtotalMinor } = useCart();

  if (!hydrated) {
    return <p className="py-16 text-center text-sm text-ink-faint">Loading your bag…</p>;
  }

  if (!cart.lines.length) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-3xl font-light text-ink-muted">Your bag is empty</p>
        <Link
          href="/shop"
          className="mt-8 inline-block border border-ink px-10 py-4 text-[0.72rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream"
        >
          Explore the collection
        </Link>
      </div>
    );
  }

  const remaining = Math.max(0, freeShippingThresholdMinor - subtotalMinor);

  return (
    <div className="grid gap-14 lg:grid-cols-[1.6fr_1fr] lg:gap-20">
      <ul className="divide-y divide-ink/10">
        {cart.lines.map((line) => (
          <li key={line.productSizeId} className="flex gap-6 py-7 first:pt-0">
            <Link href={`/product/${line.slug}`} className="relative h-40 w-28 shrink-0 overflow-hidden bg-cream-deep">
              {line.imageUrl ? (
                <Image src={line.imageUrl} alt={line.name} fill sizes="112px" className="object-cover" />
              ) : null}
            </Link>

            <div className="flex flex-1 flex-col justify-between">
              <div>
                <Link href={`/product/${line.slug}`} className="font-display text-2xl font-light hover:text-gold-deep">
                  {line.name}
                </Link>
                <p className="mt-1 text-xs text-ink-faint">
                  {line.colorName} · Size {line.size}
                </p>
                <p className="mt-2 text-sm text-ink-muted">{formatMoney(line.unitPriceMinor)}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center border border-ink/15">
                  <button
                    type="button"
                    onClick={() => setQuantity(line.productSizeId, line.quantity - 1)}
                    aria-label={`Decrease quantity of ${line.name}`}
                    className="px-4 py-2 text-ink-muted hover:text-ink"
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center text-sm">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(line.productSizeId, line.quantity + 1)}
                    aria-label={`Increase quantity of ${line.name}`}
                    className="px-4 py-2 text-ink-muted hover:text-ink"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-6">
                  <p className="text-sm">{formatMoney(line.unitPriceMinor * line.quantity)}</p>
                  <button
                    type="button"
                    onClick={() => removeLine(line.productSizeId)}
                    className="text-[0.65rem] uppercase tracking-wide text-ink-faint underline-offset-4 hover:text-burgundy hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="border border-ink/10 p-7">
          <h2 className="eyebrow">Summary</h2>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd>{formatMoney(subtotalMinor)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Shipping</dt>
              <dd className="text-ink-faint">Calculated at checkout</dd>
            </div>
          </dl>

          {remaining > 0 ? (
            <p className="mt-5 text-xs text-ink-faint">
              Spend {formatMoney(remaining)} more for complimentary nationwide delivery.
            </p>
          ) : (
            <p className="mt-5 text-xs text-gold-deep">Complimentary nationwide delivery unlocked.</p>
          )}

          <Link
            href="/checkout"
            className="mt-7 block w-full bg-ink py-4 text-center text-[0.72rem] uppercase tracking-luxe text-cream transition-colors duration-500 hover:bg-ink-soft"
          >
            Proceed to checkout
          </Link>

          <p className="mt-4 text-center text-[0.65rem] text-ink-faint">
            No account required. Checkout takes under a minute.
          </p>
        </div>
      </aside>
    </div>
  );
}
