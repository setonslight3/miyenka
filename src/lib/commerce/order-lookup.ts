import 'server-only';

import { createAdminClient, createClient } from '@/lib/supabase/server';

export type OrderWithItems = NonNullable<Awaited<ReturnType<typeof loadOrderForViewer>>>;

/**
 * Loads an order for whoever is asking.
 *
 * A signed-in customer is served through their own session, so row-level
 * security decides what they may see. A guest order carries no user_id and is
 * therefore unreachable with the anon key by design — it is released only when
 * the request supplies both the order number and the email used at checkout,
 * and only then through the service-role client.
 */
export async function loadOrderForViewer(orderNumber: string, email?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const select = `
    *,
    items:order_items (*),
    payment:payments (status, provider, paid_at, channel),
    history:order_status_history (from_status, to_status, note, created_at)
  `;

  if (user) {
    const { data } = await supabase
      .from('orders')
      .select(select)
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (data) return data;
    // Fall through: a signed-in visitor may still be checking a guest order
    // they placed with a different email.
  }

  if (!email) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from('orders')
    .select(select)
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (!data) return null;

  // Constant-shape comparison: the caller must already know the email.
  const matches = data.guest_email?.toLowerCase() === email.trim().toLowerCase();
  return matches ? data : null;
}

/** Whether the order may still be self-cancelled, per the admin-set window. */
export async function canCancel(orderId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.rpc('can_cancel_order', { p_order_id: orderId });
  return data === true;
}
