'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { formatMoney, type CurrencyCode } from '@/lib/commerce/money';
import { careMessage, whatsappUrl } from '@/lib/commerce/whatsapp';
import type { CareContact } from '@/components/layout/WhatsappLauncher';
import type { Tables } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils/cn';

type OrderRecord = Tables<'orders'> & {
  items: Tables<'order_items'>[];
  payment?: { status: string; provider: string; paid_at: string | null; channel: string | null }[];
};

const STAGES = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'In Production' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
] as const;

export function OrderDetail({
  order,
  cancellable,
  careContacts,
}: {
  order: OrderRecord;
  cancellable: boolean;
  careContacts: CareContact[];
}) {
  const { clear } = useCart();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(order.status === 'cancelled');

  const paid = (order.payment ?? []).some((p) => p.status === 'successful');
  const currency = (order.currency as CurrencyCode) ?? 'NGN';

  // The bag is emptied only once the order is genuinely paid, so an abandoned
  // or failed payment leaves the customer's selection intact.
  useEffect(() => {
    if (paid) clear();
  }, [paid, clear]);

  const currentStage = STAGES.findIndex((stage) => stage.key === order.status);

  async function cancelOrder() {
    setCancelling(true);
    setCancelError(null);
    try {
      const response = await fetch(`/api/orders/${order.order_number}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: order.guest_email ?? undefined }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setCancelError(payload.error ?? 'We could not cancel this order.');
        return;
      }
      setCancelled(true);
    } catch {
      setCancelError('Network error. Please try again.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="shell max-w-4xl py-14 lg:py-20">
      <header className="text-center">
        <p className="eyebrow">{paid ? 'Thank you' : 'Order placed'}</p>
        <h1 className="display-md mt-3">
          {cancelled ? 'Order cancelled' : paid ? 'Your order is confirmed' : 'Awaiting payment'}
        </h1>
        <p className="mt-4 text-sm text-ink-muted">
          Order <span className="text-ink">{order.order_number}</span>
        </p>
        {paid && !cancelled ? (
          <p className="mt-2 text-xs text-ink-faint">
            A confirmation has been sent to{' '}
            {order.guest_email ?? 'the email on your account'}.
          </p>
        ) : null}
      </header>

      {!cancelled && paid ? (
        <ol className="mt-14 grid grid-cols-4 gap-2" aria-label="Order progress">
          {STAGES.map((stage, index) => {
            const reached = currentStage >= index;
            return (
              <li key={stage.key} className="text-center">
                <span
                  className={cn(
                    'mx-auto block h-px w-full',
                    reached ? 'bg-gold' : 'bg-ink/15',
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    'mt-3 block text-[0.6rem] uppercase tracking-wide',
                    reached ? 'text-ink' : 'text-ink-faint',
                  )}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      <section className="mt-14">
        <h2 className="eyebrow mb-6">Your pieces</h2>
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-5 py-6">
              <div className="relative h-28 w-20 shrink-0 overflow-hidden bg-cream-deep">
                {item.image_url ? (
                  <Image src={item.image_url} alt={item.product_name} fill sizes="80px" className="object-cover" />
                ) : null}
              </div>
              <div className="flex-1">
                {item.product_slug ? (
                  <Link href={`/product/${item.product_slug}`} className="font-display text-xl font-light hover:text-gold-deep">
                    {item.product_name}
                  </Link>
                ) : (
                  <p className="font-display text-xl font-light">{item.product_name}</p>
                )}
                <p className="mt-1 text-xs text-ink-faint">
                  {item.variant_color}
                  {item.size ? ` · Size ${item.size}` : ''} · Quantity {item.quantity}
                  {item.is_bespoke ? ' · Bespoke' : ''}
                </p>
              </div>
              <p className="text-sm">{formatMoney(item.line_total_minor, currency)}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-7 ml-auto max-w-xs space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Subtotal</dt>
            <dd>{formatMoney(order.subtotal_minor, currency)}</dd>
          </div>
          {order.discount_minor > 0 ? (
            <div className="flex justify-between text-gold-deep">
              <dt>Discount{order.promo_code ? ` (${order.promo_code})` : ''}</dt>
              <dd>−{formatMoney(order.discount_minor, currency)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-ink-muted">Shipping</dt>
            <dd>{order.shipping_minor === 0 ? 'Complimentary' : formatMoney(order.shipping_minor, currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-ink/10 pt-3 font-display text-xl">
            <dt>Total</dt>
            <dd>{formatMoney(order.total_minor, currency)}</dd>
          </div>
        </dl>
      </section>

      {order.tracking_number ? (
        <section className="mt-12 border border-ink/10 p-6">
          <h2 className="eyebrow">Delivery</h2>
          <p className="mt-3 text-sm text-ink-muted">
            {order.carrier ? `${order.carrier} · ` : ''}
            <span className="text-ink">{order.tracking_number}</span>
          </p>
          {order.tracking_url ? (
            <a
              href={order.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block border-b border-ink pb-0.5 text-[0.65rem] uppercase tracking-wide hover:border-gold hover:text-gold-deep"
            >
              Track your delivery
            </a>
          ) : null}
        </section>
      ) : null}

      {!cancelled && cancellable ? (
        <section className="mt-12 border border-ink/10 p-6">
          <h2 className="eyebrow">Need to cancel?</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            This order can still be cancelled. Once production or dispatch begins, cancellation is
            no longer available.
          </p>
          <button
            type="button"
            onClick={cancelOrder}
            disabled={cancelling}
            className="mt-4 border border-burgundy px-7 py-3 text-[0.68rem] uppercase tracking-luxe text-burgundy transition-colors duration-500 hover:bg-burgundy hover:text-cream disabled:opacity-50"
          >
            {cancelling ? 'Cancelling…' : 'Cancel this order'}
          </button>
          {cancelError ? <p className="mt-3 text-xs text-burgundy">{cancelError}</p> : null}
        </section>
      ) : null}

      {careContacts.length ? (
        <p className="mt-12 text-center text-xs text-ink-faint">
          Questions about this order?{' '}
          <a
            href={whatsappUrl(careContacts[0].phone_e164, careMessage(`order ${order.order_number}`))}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-ink"
          >
            Message client care
          </a>
        </p>
      ) : null}

      <div className="mt-10 text-center">
        <Link
          href="/shop"
          className="inline-block border border-ink px-10 py-4 text-[0.72rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream"
        >
          Continue exploring
        </Link>
      </div>
    </div>
  );
}
