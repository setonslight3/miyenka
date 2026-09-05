import type { Metadata } from 'next';
import { ActionForm, AdminField, adminInput } from '@/components/admin/ActionForm';
import { upsertPromotion } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';
import { formatMoney, toMajor } from '@/lib/commerce/money';

export const metadata: Metadata = { title: 'Promotions', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const TYPES = [
  { value: 'percentage', label: 'Percentage off' },
  { value: 'fixed_amount', label: 'Fixed amount off (NGN)' },
  { value: 'free_shipping', label: 'Free shipping' },
];

export default async function AdminPromotions() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: promotions } = await supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-light">Promotions</h1>
        <p className="mt-1 text-sm text-ink-faint">
          Codes are validated server-side at checkout and counted only once a payment is verified.
        </p>
      </header>

      <section className="border border-ink/10 p-6">
        <h2 className="mb-4 text-[0.6rem] uppercase tracking-luxe text-ink-faint">New promotion</h2>
        <ActionForm action={upsertPromotion} submitLabel="Create" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminField label="Code">
            <input name="code" required placeholder="ATELIER10" className={adminInput} />
          </AdminField>
          <AdminField label="Type">
            <select name="type" className={adminInput}>
              {TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Value">
            <input name="value" type="number" step="0.01" min="0" defaultValue={0} className={adminInput} />
          </AdminField>
          <AdminField label="Minimum order (NGN)">
            <input name="minOrder" type="number" step="0.01" min="0" className={adminInput} />
          </AdminField>
          <AdminField label="Usage limit">
            <input name="usageLimit" type="number" min="1" className={adminInput} />
          </AdminField>
          <AdminField label="Ends">
            <input name="endsAt" type="date" className={adminInput} />
          </AdminField>
          <AdminField label="Description" className="sm:col-span-2">
            <input name="description" className={adminInput} />
          </AdminField>
          <label className="flex items-center gap-2 pb-2 text-sm text-ink-muted">
            <input type="checkbox" name="isActive" defaultChecked />
            Active
          </label>
        </ActionForm>
      </section>

      {promotions?.length ? (
        <section>
          <h2 className="mb-3 text-[0.6rem] uppercase tracking-luxe text-ink-faint">Existing</h2>
          <ul className="space-y-4">
            {promotions.map((promotion) => (
              <li key={promotion.id} className="border border-ink/10 p-5">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                  <p className="font-display text-lg">{promotion.code}</p>
                  <p className="text-xs text-ink-faint">
                    {promotion.usage_count} used
                    {promotion.usage_limit ? ` of ${promotion.usage_limit}` : ''}
                    {promotion.min_order_minor > 0
                      ? ` · min ${formatMoney(promotion.min_order_minor)}`
                      : ''}
                  </p>
                </div>

                <ActionForm
                  action={upsertPromotion}
                  submitLabel="Save"
                  variant="quiet"
                  className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                >
                  <input type="hidden" name="promotionId" value={promotion.id} />
                  <AdminField label="Code">
                    <input name="code" defaultValue={promotion.code} required className={adminInput} />
                  </AdminField>
                  <AdminField label="Type">
                    <select name="type" defaultValue={promotion.type} className={adminInput}>
                      {TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </AdminField>
                  <AdminField label="Value">
                    <input name="value" type="number" step="0.01" min="0" defaultValue={promotion.value} className={adminInput} />
                  </AdminField>
                  <AdminField label="Minimum order (NGN)">
                    <input
                      name="minOrder"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={promotion.min_order_minor ? toMajor(promotion.min_order_minor) : ''}
                      className={adminInput}
                    />
                  </AdminField>
                  <AdminField label="Usage limit">
                    <input name="usageLimit" type="number" min="1" defaultValue={promotion.usage_limit ?? ''} className={adminInput} />
                  </AdminField>
                  <AdminField label="Ends">
                    <input
                      name="endsAt"
                      type="date"
                      defaultValue={promotion.ends_at ? promotion.ends_at.slice(0, 10) : ''}
                      className={adminInput}
                    />
                  </AdminField>
                  <AdminField label="Description" className="sm:col-span-2">
                    <input name="description" defaultValue={promotion.description ?? ''} className={adminInput} />
                  </AdminField>
                  <label className="flex items-center gap-2 pb-2 text-sm text-ink-muted">
                    <input type="checkbox" name="isActive" defaultChecked={promotion.is_active} />
                    Active
                  </label>
                </ActionForm>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
