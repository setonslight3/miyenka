import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatMoney, type CurrencyCode } from '@/lib/commerce/money';

export const metadata: Metadata = { title: 'Your Orders', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AccountOrders() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('*, items:order_items (id, product_name, image_url, quantity, size, variant_color)')
    .order('created_at', { ascending: false });

  if (!orders?.length) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-2xl font-light text-ink-muted">No orders yet</p>
        <Link
          href="/shop"
          className="mt-7 inline-block border border-ink px-9 py-4 text-[0.7rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream"
        >
          Explore the collection
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-8">
      {orders.map((order) => (
        <li key={order.id} className="border border-ink/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href={`/order/${order.order_number}`} className="font-display text-xl font-light hover:text-gold-deep">
                {order.order_number}
              </Link>
              <p className="mt-1 text-xs text-ink-faint">
                {new Date(order.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm">
                {formatMoney(order.total_minor, (order.currency as CurrencyCode) ?? 'NGN')}
              </p>
              <p className="mt-1 text-[0.62rem] uppercase tracking-wide text-gold-deep">
                {order.status.replace(/_/g, ' ')}
                {order.order_type === 'bespoke' ? ' · Bespoke' : ''}
              </p>
            </div>
          </div>

          <ul className="mt-5 flex flex-wrap gap-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden bg-cream-deep">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.product_name} fill sizes="48px" className="object-cover" />
                  ) : null}
                </div>
                <div className="text-xs">
                  <p>{item.product_name}</p>
                  <p className="text-ink-faint">
                    {item.variant_color}
                    {item.size ? ` · ${item.size}` : ''} · ×{item.quantity}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
