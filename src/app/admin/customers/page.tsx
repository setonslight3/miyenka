import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/commerce/money';

export const metadata: Metadata = { title: 'Customers', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminCustomers() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [{ data: profiles }, { data: orders }, { count: subscribers }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200),
    supabase
      .from('orders')
      .select('user_id, guest_email, total_minor, status')
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered']),
    supabase
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('is_subscribed', true),
  ]);

  // Spend is aggregated per customer, counting guest orders by email so a
  // customer who checked out without an account is still recognised.
  const spendByUser = new Map<string, { orders: number; total: number }>();
  const spendByEmail = new Map<string, { orders: number; total: number }>();

  for (const order of orders ?? []) {
    if (order.user_id) {
      const current = spendByUser.get(order.user_id) ?? { orders: 0, total: 0 };
      spendByUser.set(order.user_id, {
        orders: current.orders + 1,
        total: current.total + order.total_minor,
      });
    } else if (order.guest_email) {
      const key = order.guest_email.toLowerCase();
      const current = spendByEmail.get(key) ?? { orders: 0, total: 0 };
      spendByEmail.set(key, { orders: current.orders + 1, total: current.total + order.total_minor });
    }
  }

  const guestOnly = [...spendByEmail.entries()].filter(
    ([email]) => !(profiles ?? []).some((profile) => profile.email.toLowerCase() === email),
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-light">Customers</h1>
        <p className="mt-1 text-sm text-ink-faint">
          {profiles?.length ?? 0} accounts · {guestOnly.length} guest customers ·{' '}
          {subscribers ?? 0} newsletter subscribers
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-[0.6rem] uppercase tracking-luxe text-ink-faint">Accounts</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[38rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                {['Name', 'Email', 'Orders', 'Lifetime spend', 'Joined'].map((heading) => (
                  <th key={heading} className="py-3 pr-4 text-[0.58rem] font-normal uppercase tracking-luxe text-ink-faint">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((profile) => {
                const spend = spendByUser.get(profile.id) ?? { orders: 0, total: 0 };
                return (
                  <tr key={profile.id} className="border-b border-ink/8">
                    <td className="py-3 pr-4">{profile.full_name ?? '—'}</td>
                    <td className="py-3 pr-4 text-ink-muted">{profile.email}</td>
                    <td className="py-3 pr-4 text-ink-muted">{spend.orders}</td>
                    <td className="py-3 pr-4">{formatMoney(spend.total)}</td>
                    <td className="py-3 text-ink-muted">
                      {new Date(profile.created_at).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {guestOnly.length ? (
        <section>
          <h2 className="mb-3 text-[0.6rem] uppercase tracking-luxe text-ink-faint">
            Guest customers
          </h2>
          <ul className="divide-y divide-ink/10 border-y border-ink/10 text-sm">
            {guestOnly.map(([email, spend]) => (
              <li key={email} className="flex items-center justify-between py-3">
                <span className="text-ink-muted">{email}</span>
                <span>
                  {spend.orders} order{spend.orders === 1 ? '' : 's'} · {formatMoney(spend.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
