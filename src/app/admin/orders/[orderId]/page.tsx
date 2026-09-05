import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, AdminField, adminInput } from '@/components/admin/ActionForm';
import { updateOrderStatus } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';
import { formatMoney, type CurrencyCode } from '@/lib/commerce/money';

export const metadata: Metadata = { title: 'Order', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const STATUSES = [
  'pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled',
] as const;

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requireAdmin();
  const { orderId } = await params;

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items (*),
      payments (*),
      history:order_status_history (from_status, to_status, note, created_at)
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (!order) notFound();

  const currency = (order.currency as CurrencyCode) ?? 'NGN';
  const address = order.shipping_address as Record<string, string> | null;
  const exception = order.admin_note?.startsWith('STOCK EXCEPTION');

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/orders" className="text-xs text-ink-faint hover:text-ink">
            ← Orders
          </Link>
          <h1 className="mt-2 font-display text-3xl font-light">{order.order_number}</h1>
          <p className="mt-1 text-sm text-ink-faint">
            {new Date(order.created_at).toLocaleString('en-GB')} ·{' '}
            {order.status.replace(/_/g, ' ')}
            {order.order_type === 'bespoke' ? ' · bespoke' : ''}
          </p>
        </div>
        <p className="font-display text-2xl">{formatMoney(order.total_minor, currency)}</p>
      </header>

      {exception ? (
        <div className="border border-burgundy/40 bg-burgundy/5 p-5">
          <p className="text-[0.6rem] uppercase tracking-luxe text-burgundy">Stock exception</p>
          <p className="mt-2 text-sm text-burgundy">{order.admin_note}</p>
          <p className="mt-2 text-xs text-ink-muted">
            The customer has paid. Contact them to arrange an alternative or a resolution.
          </p>
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-[0.6rem] uppercase tracking-luxe text-ink-faint">Items</h2>
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-4">
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden bg-cream-deep">
                    {item.image_url ? (
                      <Image src={item.image_url} alt="" fill sizes="56px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 text-sm">
                    <p>{item.product_name}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {item.variant_color}
                      {item.size ? ` · ${item.size}` : ''} · ×{item.quantity}
                      {item.sku ? ` · ${item.sku}` : ''}
                    </p>
                  </div>
                  <p className="text-sm">{formatMoney(item.line_total_minor, currency)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 ml-auto max-w-xs space-y-2 text-sm">
              <Row label="Subtotal" value={formatMoney(order.subtotal_minor, currency)} />
              {order.discount_minor > 0 ? (
                <Row label={`Discount${order.promo_code ? ` (${order.promo_code})` : ''}`} value={`−${formatMoney(order.discount_minor, currency)}`} />
              ) : null}
              <Row label="Shipping" value={formatMoney(order.shipping_minor, currency)} />
              <Row label="Total" value={formatMoney(order.total_minor, currency)} strong />
            </dl>
          </section>

          <section>
            <h2 className="mb-3 text-[0.6rem] uppercase tracking-luxe text-ink-faint">History</h2>
            <ul className="space-y-2 text-xs text-ink-muted">
              {(order.history ?? []).map((entry, index) => (
                <li key={index}>
                  <span className="text-ink">{entry.to_status.replace(/_/g, ' ')}</span>
                  {' · '}
                  {new Date(entry.created_at).toLocaleString('en-GB')}
                  {entry.note ? ` — ${entry.note}` : ''}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-8">
          <section className="border border-ink/10 p-5">
            <h2 className="mb-4 text-[0.6rem] uppercase tracking-luxe text-ink-faint">
              Update status
            </h2>
            <ActionForm action={updateOrderStatus} submitLabel="Save" className="space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <AdminField label="Status">
                <select name="status" defaultValue={order.status} className={adminInput}>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Carrier">
                <input name="carrier" defaultValue={order.carrier ?? ''} className={adminInput} />
              </AdminField>
              <AdminField label="Tracking number">
                <input name="trackingNumber" defaultValue={order.tracking_number ?? ''} className={adminInput} />
              </AdminField>
              <AdminField label="Tracking URL">
                <input name="trackingUrl" type="url" defaultValue={order.tracking_url ?? ''} className={adminInput} />
              </AdminField>
              <AdminField label="Internal note">
                <input name="note" className={adminInput} />
              </AdminField>
              <p className="text-[0.65rem] leading-relaxed text-ink-faint">
                Cancelling an order that holds stock returns it to the catalogue automatically.
              </p>
            </ActionForm>
          </section>

          <section className="border border-ink/10 p-5">
            <h2 className="mb-3 text-[0.6rem] uppercase tracking-luxe text-ink-faint">Customer</h2>
            <p className="text-sm">{order.guest_email ?? 'Registered account'}</p>
            {order.contact_phone ? (
              <p className="mt-1 text-sm text-ink-muted">{order.contact_phone}</p>
            ) : null}
            {address ? (
              <address className="mt-3 text-sm not-italic leading-relaxed text-ink-muted">
                {address.fullName}
                <br />
                {address.line1}
                {address.line2 ? <><br />{address.line2}</> : null}
                <br />
                {address.city}, {address.state}
                <br />
                {address.country}
                {address.postalCode ? ` ${address.postalCode}` : ''}
              </address>
            ) : null}
            {order.customer_note ? (
              <p className="mt-4 border-l-2 border-gold/50 pl-3 text-xs italic text-ink-muted">
                “{order.customer_note}”
              </p>
            ) : null}
          </section>

          <section className="border border-ink/10 p-5">
            <h2 className="mb-3 text-[0.6rem] uppercase tracking-luxe text-ink-faint">Payment</h2>
            {order.payments?.length ? (
              <ul className="space-y-2 text-xs text-ink-muted">
                {order.payments.map((payment) => (
                  <li key={payment.id}>
                    <span className="text-ink">{payment.provider}</span> · {payment.status}
                    {payment.channel ? ` · ${payment.channel}` : ''}
                    <br />
                    <span className="text-ink-faint">{payment.provider_reference}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-faint">No payment recorded.</p>
            )}
            <p className="mt-3 text-[0.65rem] text-ink-faint">
              Stock committed: {order.inventory_committed ? 'yes' : 'no'}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'border-t border-ink/10 pt-2 text-base' : ''}`}>
      <dt className="text-ink-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
