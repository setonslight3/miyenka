import type { Metadata } from 'next';
import { ActionForm, AdminField, adminInput } from '@/components/admin/ActionForm';
import { inviteAdmin, setAdminActive } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Admins', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminAdmins() {
  const actor = await requireAdmin();
  const supabase = createAdminClient();

  const [{ data: admins }, { data: auditLog }] = await Promise.all([
    supabase.from('admin_users').select('*').order('created_at'),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(40),
  ]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-light">Admins</h1>
        <p className="mt-1 text-sm text-ink-faint">
          {actor.isOwner
            ? 'As the owner you can invite and deactivate admins.'
            : 'Only the owner can change admin access.'}
        </p>
      </header>

      {actor.isOwner ? (
        <section className="border border-ink/10 p-6">
          <h2 className="mb-4 text-[0.6rem] uppercase tracking-luxe text-ink-faint">Invite an admin</h2>
          <ActionForm action={inviteAdmin} submitLabel="Invite" className="grid gap-3 sm:grid-cols-3 sm:items-end">
            <AdminField label="Email address" className="sm:col-span-2">
              <input name="email" type="email" required className={adminInput} />
            </AdminField>
            <AdminField label="Role">
              <select name="role" className={adminInput}>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </AdminField>
          </ActionForm>
          <p className="mt-3 text-xs text-ink-faint">
            Access is granted by email. It is linked to their account the first time they sign in,
            so you can invite someone before they have registered.
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-[0.6rem] uppercase tracking-luxe text-ink-faint">Current access</h2>
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {(admins ?? []).map((admin) => (
            <li key={admin.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm">{admin.email}</p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {admin.role}
                  {admin.user_id ? '' : ' · invitation pending first sign-in'}
                  {admin.is_active ? '' : ' · deactivated'}
                </p>
              </div>

              {actor.isOwner ? (
                <ActionForm
                  action={setAdminActive}
                  submitLabel={admin.is_active ? 'Deactivate' : 'Reactivate'}
                  variant={admin.is_active ? 'danger' : 'quiet'}
                  confirm={admin.is_active ? `Remove admin access for ${admin.email}?` : undefined}
                >
                  <input type="hidden" name="adminId" value={admin.id} />
                  <input type="hidden" name="active" value={admin.is_active ? 'false' : 'true'} />
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-[0.6rem] uppercase tracking-luxe text-ink-faint">Audit log</h2>
        {auditLog?.length ? (
          <ul className="space-y-2 text-xs">
            {auditLog.map((entry) => (
              <li key={entry.id} className="flex flex-wrap gap-x-3 border-b border-ink/8 pb-2">
                <span className="text-ink-faint">
                  {new Date(entry.created_at).toLocaleString('en-GB')}
                </span>
                <span className="text-ink-muted">{entry.actor_email ?? 'system'}</span>
                <span className="text-ink">{entry.summary}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-faint">No admin actions recorded yet.</p>
        )}
      </section>
    </div>
  );
}
