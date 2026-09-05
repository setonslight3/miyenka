import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/commerce/money';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  await requireAdmin();
  const supabase = createAdminClient();

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [
    { data: paidOrders },
    { count: pendingReviews },
    { count: awaitingQuote },
    { count: exceptions },
    { data: recentOrders },
    { data: lowStock },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('total_minor, currency')
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
      .gte('created_at', since),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('custom_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'awaiting_quote'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .like('admin_note', 'STOCK EXCEPTION%'),
    supabase
      .from('orders')
      .select('id, order_number, status, total_minor, currency, created_at, order_type')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('product_sizes')
      .select('id, size, quantity, variant:product_variants (color_name, product:products (name, slug))')
      .lte('quantity', 2)
      .eq('is_active', true)
      .order('quantity')
      .limit(8),
  ]);

  const revenue = (paidOrders ?? []).reduce((sum, order) => sum + order.total_minor, 0);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-light">Overview</h1>
        <p className="mt-1 text-sm text-ink-faint">The last 30 days.</p>
      </header>

      {exceptions && exceptions > 0 ? (
        <Link
          href="/admin/orders?filter=exceptions"
          className="block border border-burgundy/40 bg-burgundy/5 p-5 transition-colors hover:border-burgundy"
        >
          <p className="text-sm text-burgundy">
            {exceptions} order{exceptions === 1 ? '' : 's'} paid but not fulfillable — stock could not
            be committed. These need contacting.
          </p>
        </Link>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue (30 days)" value={formatMoney(revenue)} />
        <Stat label="Paid orders" value={String(paidOrders?.length ?? 0)} />
        <Stat label="Reviews to moderate" value={String(pendingReviews ?? 0)} href="/admin/reviews" />
        <Stat label="Bespoke awaiting quote" value={String(awaitingQuote ?? 0)} href="/admin/bespoke" />
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[0.6rem] uppercase tracking-luxe text-ink-faint">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs text-ink-faint hover:text-ink">All orders</Link>
          </div>
          {recentOrders?.length ? (
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/orders/${order.id}`} className="text-sm hover:text-gold-deep">
                      {order.order_number}
                    </Link>
                    <p className="text-xs text-ink-faint">
                      {order.status.replace(/_/g, ' ')}
                      {order.order_type === 'bespoke' ? ' · bespoke' : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm">{formatMoney(order.total_minor)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-faint">No orders yet.</p>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-[0.6rem] uppercase tracking-luxe text-ink-faint">Low stock</h2>
          {lowStock?.length ? (
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {lowStock.map((row) => {
                const variant = Array.isArray(row.variant) ? row.variant[0] : row.variant;
                const product = variant
                  ? Array.isArray(variant.product)
                    ? variant.product[0]
                    : variant.product
                  : null;
                return (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{product?.name ?? 'Unknown piece'}</p>
                      <p className="text-xs text-ink-faint">
                        {variant?.color_name} · {row.size}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm ${row.quantity === 0 ? 'text-burgundy' : 'text-ink-muted'}`}
                    >
                      {row.quantity === 0 ? 'Sold out' : `${row.quantity} left`}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-faint">Everything is well stocked.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <>
      <p className="font-display text-3xl font-light">{value}</p>
      <p className="mt-1 text-[0.58rem] uppercase tracking-luxe text-ink-faint">{label}</p>
    </>
  );

  return href ? (
    <Link href={href} className="border border-ink/10 p-5 transition-colors hover:border-ink/30">
      {inner}
    </Link>
  ) : (
    <div className="border border-ink/10 p-5">{inner}</div>
  );
}
