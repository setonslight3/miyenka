import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';
import { formatMoney, type CurrencyCode } from '@/lib/commerce/money';

export const metadata: Metadata = { title: 'Orders', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'In production' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'exceptions', label: 'Stock exceptions' },
];

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const filter = (Array.isArray(params.filter) ? params.filter[0] : params.filter) ?? 'all';

  const supabase = createAdminClient();
  let query = supabase
    .from('orders')
    .select('id, order_number, status, order_type, total_minor, currency, created_at, guest_email, admin_note')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filter === 'exceptions') query = query.like('admin_note', 'STOCK EXCEPTION%');
  else if (filter !== 'all') query = query.eq('status', filter as never);

  const { data: orders } = await query;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-3xl font-light">Orders</h1>
      </header>

      <nav aria-label="Filter orders" className="flex flex-wrap gap-x-5 gap-y-2 border-b border-ink/10 pb-3">
        {FILTERS.map((option) => (
          <Link
            key={option.key}
            href={option.key === 'all' ? '/admin/orders' : `/admin/orders?filter=${option.key}`}
            className={`text-xs transition-colors ${
              filter === option.key ? 'text-ink' : 'text-ink-faint hover:text-ink'
            }`}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {orders?.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                {['Order', 'Placed', 'Customer', 'Status', 'Total', ''].map((heading) => (
                  <th key={heading} className="py-3 pr-4 text-[0.58rem] font-normal uppercase tracking-luxe text-ink-faint">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-ink/8">
                  <td className="py-3 pr-4">
                    <Link href={`/admin/orders/${order.id}`} className="hover:text-gold-deep">
                      {order.order_number}
                    </Link>
                    {order.order_type === 'bespoke' ? (
                      <span className="ml-2 border border-gold/50 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-wide text-gold-deep">
                        Bespoke
                      </span>
                    ) : null}
                    {order.admin_note?.startsWith('STOCK EXCEPTION') ? (
                      <span className="ml-2 border border-burgundy/50 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-wide text-burgundy">
                        Exception
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-ink-muted">
                    {new Date(order.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="py-3 pr-4 text-ink-muted">{order.guest_email ?? 'Account'}</td>
                  <td className="py-3 pr-4 text-ink-muted">{order.status.replace(/_/g, ' ')}</td>
                  <td className="py-3 pr-4">
                    {formatMoney(order.total_minor, (order.currency as CurrencyCode) ?? 'NGN')}
                  </td>
                  <td className="py-3 text-right">
                    <Link href={`/admin/orders/${order.id}`} className="text-xs text-ink-faint hover:text-ink">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ink-faint">No orders match this filter.</p>
      )}
    </div>
  );
}
