import type { Metadata } from 'next';
import { ActionForm, AdminField, adminInput } from '@/components/admin/ActionForm';
import { upsertShippingRate } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';
import { toMajor } from '@/lib/commerce/money';

export const metadata: Metadata = { title: 'Shipping', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminShipping() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: zones } = await supabase
    .from('shipping_zones')
    .select('*, rates:shipping_rates (*)')
    .order('position');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-light">Shipping</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-faint">
          Rates are applied at checkout by destination. These are the launch placeholders — change
          them here and checkout uses the new figures immediately. When a logistics API replaces
          manual rates, checkout does not need rewriting.
        </p>
      </header>

      <div className="space-y-8">
        {(zones ?? []).map((zone) => (
          <section key={zone.id} className="border border-ink/10 p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-light">{zone.name}</h2>
              <span className="text-xs text-ink-faint">
                {zone.is_international
                  ? 'International'
                  : zone.states.length
                    ? zone.states.slice(0, 4).join(', ') + (zone.states.length > 4 ? '…' : '')
                    : zone.country_codes.join(', ')}
              </span>
            </div>
            {zone.description ? (
              <p className="mt-1 text-xs text-ink-faint">{zone.description}</p>
            ) : null}

            <div className="mt-5 space-y-5">
              {(zone.rates ?? []).map((rate) => (
                <ActionForm
                  key={rate.id}
                  action={upsertShippingRate}
                  submitLabel="Save rate"
                  variant="quiet"
                  className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 xl:items-end"
                >
                  <input type="hidden" name="rateId" value={rate.id} />
                  <AdminField label="Name">
                    <input name="name" defaultValue={rate.name} required className={adminInput} />
                  </AdminField>
                  <AdminField label="Price (NGN)">
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      defaultValue={toMajor(rate.price_minor)}
                      className={adminInput}
                    />
                  </AdminField>
                  <AdminField label="Free over (NGN)">
                    <input
                      name="freeOver"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={rate.free_over_minor ? toMajor(rate.free_over_minor) : ''}
                      className={adminInput}
                    />
                  </AdminField>
                  <div className="grid grid-cols-2 gap-2">
                    <AdminField label="Min days">
                      <input name="minDays" type="number" min="0" defaultValue={rate.min_delivery_days ?? ''} className={adminInput} />
                    </AdminField>
                    <AdminField label="Max days">
                      <input name="maxDays" type="number" min="0" defaultValue={rate.max_delivery_days ?? ''} className={adminInput} />
                    </AdminField>
                  </div>
                  <label className="flex items-center gap-2 pb-2 text-sm text-ink-muted">
                    <input type="checkbox" name="isActive" defaultChecked={rate.is_active} />
                    Active
                  </label>
                </ActionForm>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
