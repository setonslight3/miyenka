import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatMoney, type CurrencyCode } from '@/lib/commerce/money';

export const metadata: Metadata = { title: 'Account', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AccountOverview() {
  const supabase = await createClient();

  const [{ data: orders }, { data: wishlist }, { data: reviewable }] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(3),
    supabase.from('wishlists').select('id'),
    supabase.rpc('reviewable_items'),
  ]);

  const pendingReviews = Array.isArray(reviewable) ? reviewable.length : 0;

  return (
    <div className="space-y-14">
      <section className="grid gap-5 sm:grid-cols-3">
        {[
          { label: 'Orders', value: orders?.length ?? 0, href: '/account/orders' },
          { label: 'Saved pieces', value: wishlist?.length ?? 0, href: '/wishlist' },
          { label: 'Awaiting your review', value: pendingReviews, href: '/account/reviews' },
        ].map((card) => (
          <Link key={card.label} href={card.href} className="border border-ink/10 p-6 transition-colors hover:border-ink/30">
            <p className="font-display text-4xl font-light">{card.value}</p>
            <p className="mt-2 text-[0.62rem] uppercase tracking-luxe text-ink-faint">{card.label}</p>
          </Link>
        ))}
      </section>

      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="eyebrow">Recent orders</h2>
          <Link href="/account/orders" className="text-[0.62rem] uppercase tracking-wide text-ink-faint hover:text-ink">
            View all
          </Link>
        </div>

        {orders?.length ? (
          <ul className="divide-y divide-ink/10 border-y border-ink/10">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
                <div>
                  <Link href={`/order/${order.order_number}`} className="text-sm hover:text-gold-deep">
                    {order.order_number}
                  </Link>
                  <p className="mt-1 text-xs text-ink-faint">
                    {new Date(order.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {' · '}
                    {order.status.replace(/_/g, ' ')}
                  </p>
                </div>
                <p className="text-sm">
                  {formatMoney(order.total_minor, (order.currency as CurrencyCode) ?? 'NGN')}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-faint">You have not placed an order yet.</p>
        )}
      </section>
    </div>
  );
}
