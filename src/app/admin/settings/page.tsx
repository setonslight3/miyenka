import type { Metadata } from 'next';
import { ActionForm, AdminField, adminInput } from '@/components/admin/ActionForm';
import { deleteWhatsappContact, updateSetting, upsertWhatsappContact } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Settings', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [{ data: settings }, { data: contacts }, { data: rates }] = await Promise.all([
    supabase.from('site_settings').select('*').order('key'),
    supabase.from('whatsapp_contacts').select('*').order('position'),
    supabase.from('exchange_rates').select('*').eq('is_active', true).order('fetched_at', { ascending: false }),
  ]);

  const activeContacts = (contacts ?? []).filter((contact) => contact.is_active);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-light">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-faint">
          Every changeable business value lives here rather than in code, so it takes effect
          immediately without a deployment.
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-[0.6rem] uppercase tracking-luxe text-ink-faint">
          Customer care numbers
        </h2>
        <p className="mb-4 max-w-2xl text-xs text-ink-faint">
          One active number opens WhatsApp directly. Two or more present a chooser to the customer.
          Currently {activeContacts.length} active — the storefront will{' '}
          {activeContacts.length === 1
            ? 'open the single number directly'
            : activeContacts.length > 1
              ? 'show a selection dialog'
              : 'hide the WhatsApp button'}
          .
        </p>

        <div className="space-y-4">
          {(contacts ?? []).map((contact) => (
            <div key={contact.id} className="flex flex-wrap items-end gap-3 border border-ink/10 p-4">
              <ActionForm
                action={upsertWhatsappContact}
                submitLabel="Save"
                variant="quiet"
                className="grid flex-1 gap-3 sm:grid-cols-3 xl:grid-cols-4 xl:items-end"
              >
                <input type="hidden" name="contactId" value={contact.id} />
                <AdminField label="Label">
                  <input name="label" defaultValue={contact.label} required className={adminInput} />
                </AdminField>
                <AdminField label="Number (E.164)">
                  <input name="phone" defaultValue={contact.phone_e164} required className={adminInput} />
                </AdminField>
                <AdminField label="Greeting">
                  <input name="greeting" defaultValue={contact.greeting ?? ''} className={adminInput} />
                </AdminField>
                <label className="flex items-center gap-2 pb-2 text-sm text-ink-muted">
                  <input type="checkbox" name="isActive" defaultChecked={contact.is_active} />
                  Active
                </label>
              </ActionForm>

              <ActionForm
                action={deleteWhatsappContact}
                submitLabel="Remove"
                variant="danger"
                confirm={`Remove ${contact.label}?`}
              >
                <input type="hidden" name="contactId" value={contact.id} />
              </ActionForm>
            </div>
          ))}

          <div className="border border-dashed border-ink/25 p-4">
            <p className="mb-3 text-xs text-ink-faint">Add a number</p>
            <ActionForm
              action={upsertWhatsappContact}
              submitLabel="Add"
              className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4 xl:items-end"
            >
              <AdminField label="Label">
                <input name="label" placeholder="Customer Care 2" required className={adminInput} />
              </AdminField>
              <AdminField label="Number (E.164)">
                <input name="phone" placeholder="+2348012345678" required className={adminInput} />
              </AdminField>
              <AdminField label="Greeting">
                <input name="greeting" placeholder="Hello Miyenka, I would like…" className={adminInput} />
              </AdminField>
              <label className="flex items-center gap-2 pb-2 text-sm text-ink-muted">
                <input type="checkbox" name="isActive" defaultChecked />
                Active
              </label>
            </ActionForm>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[0.6rem] uppercase tracking-luxe text-ink-faint">
          Business settings
        </h2>
        <ul className="space-y-4">
          {(settings ?? []).map((setting) => (
            <li key={setting.key} className="border border-ink/10 p-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm">{setting.key}</p>
                <span className="text-[0.58rem] uppercase tracking-wide text-ink-faint">
                  {setting.is_public ? 'public' : 'admin only'}
                </span>
              </div>
              {setting.description ? (
                <p className="mb-3 text-xs text-ink-faint">{setting.description}</p>
              ) : null}
              <ActionForm action={updateSetting} submitLabel="Save" variant="quiet" className="space-y-2">
                <input type="hidden" name="key" value={setting.key} />
                <textarea
                  name="value"
                  rows={JSON.stringify(setting.value).length > 90 ? 4 : 1}
                  defaultValue={JSON.stringify(setting.value, null, 2)}
                  className={`${adminInput} font-mono text-xs`}
                />
              </ActionForm>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-[0.6rem] uppercase tracking-luxe text-ink-faint">Exchange rates</h2>
        <p className="mb-4 text-xs text-ink-faint">
          Refreshed automatically by the scheduled FX job. The rate used for an order is frozen onto
          that order at the moment it is paid.
        </p>
        {rates?.length ? (
          <ul className="divide-y divide-ink/10 border-y border-ink/10 text-sm">
            {rates.map((rate) => (
              <li key={rate.id} className="flex items-center justify-between py-3">
                <span>
                  {rate.base_currency} → {rate.quote_currency}
                </span>
                <span className="text-ink-muted">
                  {rate.rate}
                  {Number(rate.markup_percent) !== 0 ? ` (+${rate.markup_percent}%)` : ''}
                  <span className="ml-3 text-xs text-ink-faint">
                    {rate.source} · {new Date(rate.fetched_at).toLocaleString('en-GB')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-faint">No rates recorded yet.</p>
        )}
      </section>
    </div>
  );
}
