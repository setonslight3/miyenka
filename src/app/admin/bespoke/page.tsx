import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm, AdminField, adminInput } from '@/components/admin/ActionForm';
import { createQuote, updateCustomRequestStatus } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/commerce/money';
import { cmToInches } from '@/lib/commerce/sizing';
import { publicEnv } from '@/lib/env';

export const metadata: Metadata = { title: 'Bespoke', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const STATUSES = [
  'awaiting_quote', 'quote_sent', 'awaiting_payment', 'paid_in_production',
  'shipped', 'delivered', 'declined', 'cancelled',
] as const;

export default async function AdminBespoke({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;

  const supabase = createAdminClient();
  let query = supabase
    .from('custom_requests')
    .select(`
      *,
      product:products (name, slug),
      media:custom_request_media (id, storage_path),
      quotes:custom_quotes (id, quote_number, total_minor, currency, status, access_token, expires_at)
    `)
    .order('created_at', { ascending: false })
    .limit(80);

  if (status) query = query.eq('status', status as never);

  const { data: requests } = await query;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-light">Bespoke</h1>
        <p className="mt-1 text-sm text-ink-faint">
          Commission requests, quotations and production status.
        </p>
      </header>

      <nav aria-label="Filter requests" className="flex flex-wrap gap-x-5 gap-y-2 border-b border-ink/10 pb-3">
        <Link
          href="/admin/bespoke"
          className={`text-xs ${!status ? 'text-ink' : 'text-ink-faint hover:text-ink'}`}
        >
          All
        </Link>
        {STATUSES.map((option) => (
          <Link
            key={option}
            href={`/admin/bespoke?status=${option}`}
            className={`text-xs ${status === option ? 'text-ink' : 'text-ink-faint hover:text-ink'}`}
          >
            {option.replace(/_/g, ' ')}
          </Link>
        ))}
      </nav>

      {requests?.length ? (
        <ul className="space-y-6">
          {requests.map((request) => {
            const product = Array.isArray(request.product) ? request.product[0] : request.product;
            const latestQuote = (request.quotes ?? [])[0];

            return (
              <li key={request.id} className="border border-ink/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm">
                      {request.reference}
                      <span className="ml-2 text-xs text-ink-faint">
                        {new Date(request.created_at).toLocaleDateString('en-GB')}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {request.contact_name ?? 'No name given'} · {request.contact_email}
                      {request.contact_phone ? ` · ${request.contact_phone}` : ''}
                    </p>
                    {product ? (
                      <p className="mt-1 text-xs text-ink-muted">Based on: {product.name}</p>
                    ) : null}
                  </div>
                  <span className="border border-ink/20 px-2.5 py-1 text-[0.58rem] uppercase tracking-wide text-ink-muted">
                    {request.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1fr_20rem]">
                  <section>
                    <h3 className="text-[0.58rem] uppercase tracking-luxe text-ink-faint">Measurements</h3>
                    <dl className="mt-2 space-y-1 text-xs text-ink-muted">
                      <Measurement label="Bust" cm={request.bust_cm} />
                      <Measurement label="Waist" cm={request.waist_cm} />
                      <Measurement label="Hips" cm={request.hips_cm} />
                      <Measurement label="Shoulder to hem" cm={request.shoulder_to_hem_cm} />
                      <Measurement label="Height" cm={request.height_cm} />
                    </dl>
                  </section>

                  <section>
                    <h3 className="text-[0.58rem] uppercase tracking-luxe text-ink-faint">Preferences</h3>
                    <dl className="mt-2 space-y-1 text-xs text-ink-muted">
                      {request.preferred_fabric ? <div>Fabric: {request.preferred_fabric}</div> : null}
                      {request.preferred_color ? <div>Colour: {request.preferred_color}</div> : null}
                      {request.event_date ? (
                        <div>Event: {new Date(request.event_date).toLocaleDateString('en-GB')}</div>
                      ) : null}
                    </dl>
                    {request.modification_notes ? (
                      <p className="mt-2 border-l-2 border-gold/50 pl-3 text-xs italic text-ink-muted">
                        “{request.modification_notes}”
                      </p>
                    ) : null}
                    {request.media?.length ? (
                      <p className="mt-3 text-[0.65rem] text-ink-faint">
                        {request.media.length} private reference image
                        {request.media.length === 1 ? '' : 's'} attached — stored privately, viewable
                        through Supabase Storage.
                      </p>
                    ) : null}
                  </section>

                  <div className="space-y-4">
                    {latestQuote ? (
                      <div className="border border-gold/40 bg-blush-soft/20 p-4">
                        <p className="text-xs text-ink-muted">
                          {latestQuote.quote_number} ·{' '}
                          <span className="text-ink">{latestQuote.status}</span>
                        </p>
                        <p className="mt-1 font-display text-xl">
                          {formatMoney(latestQuote.total_minor)}
                        </p>
                        <a
                          href={`${publicEnv.NEXT_PUBLIC_SITE_URL}/quote/${latestQuote.access_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 block break-all text-[0.65rem] text-gold-deep underline underline-offset-2"
                        >
                          Customer payment link
                        </a>
                      </div>
                    ) : (
                      <ActionForm action={createQuote} submitLabel="Send quotation" className="space-y-2">
                        <input type="hidden" name="requestId" value={request.id} />
                        <AdminField label="Commission (NGN)">
                          <input name="amount" type="number" step="0.01" min="0" required className={adminInput} />
                        </AdminField>
                        <AdminField label="Delivery (NGN)">
                          <input name="shipping" type="number" step="0.01" min="0" className={adminInput} />
                        </AdminField>
                        <AdminField label="Summary for the customer">
                          <textarea name="summary" rows={2} className={adminInput} />
                        </AdminField>
                        <div className="grid grid-cols-2 gap-2">
                          <AdminField label="Production days">
                            <input name="productionDays" type="number" min="1" defaultValue={21} className={adminInput} />
                          </AdminField>
                          <AdminField label="Valid for (days)">
                            <input name="validDays" type="number" min="1" defaultValue={14} className={adminInput} />
                          </AdminField>
                        </div>
                      </ActionForm>
                    )}

                    <ActionForm action={updateCustomRequestStatus} submitLabel="Update" variant="quiet" className="space-y-2">
                      <input type="hidden" name="requestId" value={request.id} />
                      <AdminField label="Status">
                        <select name="status" defaultValue={request.status} className={adminInput}>
                          {STATUSES.map((option) => (
                            <option key={option} value={option}>
                              {option.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </AdminField>
                      <AdminField label="Internal note">
                        <input name="adminNote" defaultValue={request.admin_note ?? ''} className={adminInput} />
                      </AdminField>
                    </ActionForm>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-faint">No requests here.</p>
      )}
    </div>
  );
}

/** Shows each measurement in both units, since clients enter either. */
function Measurement({ label, cm }: { label: string; cm: number | null }) {
  if (cm === null || cm === undefined) return null;
  return (
    <div>
      {label}: {cm} cm <span className="text-ink-faint">({cmToInches(Number(cm))} in)</span>
    </div>
  );
}
