import 'server-only';

import { redirect } from 'next/navigation';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export type AdminContext = {
  userId: string;
  email: string;
  role: 'owner' | 'admin';
  isOwner: boolean;
};

/**
 * Server-side admin gate.
 *
 * The proxy already blocks /admin for non-admins, but every admin page and
 * action calls this too: authorization must not depend on middleware alone,
 * since a Server Action or route handler can be reached directly.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/admin/sign-in');

  const { data: isAdmin } = await supabase.rpc('is_active_admin');
  if (!isAdmin) redirect('/admin/sign-in?error=not-authorized');

  const { data: isOwner } = await supabase.rpc('is_owner');

  return {
    userId: user.id,
    email: user.email ?? '',
    role: isOwner ? 'owner' : 'admin',
    isOwner: isOwner === true,
  };
}

export async function requireOwner(): Promise<AdminContext> {
  const context = await requireAdmin();
  if (!context.isOwner) redirect('/admin?error=owner-only');
  return context;
}

/**
 * Records a consequential admin action.
 *
 * Written with the service-role client so the log cannot be edited or
 * suppressed by the acting admin's own policies.
 */
export async function audit(
  actor: AdminContext,
  action: string,
  entityType: string,
  entityId: string | null,
  summary: string,
  metadata?: Record<string, unknown>,
) {
  const supabase = createAdminClient();
  await supabase.from('audit_logs').insert({
    actor_id: actor.userId,
    actor_email: actor.email,
    action,
    entity_type: entityType,
    entity_id: entityId,
    summary,
    metadata: (metadata ?? null) as never,
  });
}
