import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { recordStatusChange } from '@/lib/commerce/orders';
import { sendOrderStatusUpdate } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ email: z.string().email().optional() });

/**
 * Customer-initiated cancellation.
 *
 * Ownership is re-checked here rather than trusted from the page, and the
 * window is evaluated by can_cancel_order() in the database, so changing the
 * window in Admin takes effect immediately and the same rule governs every
 * caller. Committed stock is returned to the catalogue.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await params;

  let body: z.infer<typeof bodySchema> = {};
  try {
    body = bodySchema.parse(await request.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('id, order_number, status, user_id, guest_email, inventory_committed')
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  // Prove ownership: either the signed-in customer owns it, or the caller
  // supplied the email the guest order was placed with.
  const ownedBySession = Boolean(user && order.user_id === user.id);
  const ownedByEmail =
    Boolean(body.email) &&
    order.guest_email?.toLowerCase() === body.email!.trim().toLowerCase();

  if (!ownedBySession && !ownedByEmail) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const { data: allowed } = await admin.rpc('can_cancel_order', { p_order_id: order.id });
  if (allowed !== true) {
    return NextResponse.json(
      { error: 'This order can no longer be cancelled. Please contact client care.' },
      { status: 409 },
    );
  }

  // Return any committed stock before marking the order cancelled.
  if (order.inventory_committed) {
    const { error } = await admin.rpc('restore_inventory', { p_order_id: order.id });
    if (error) {
      console.error('Failed to restore inventory on cancellation', error);
      return NextResponse.json(
        { error: 'We could not cancel this order automatically. Please contact client care.' },
        { status: 500 },
      );
    }
  }

  const { error: updateError } = await admin
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', order.id);

  if (updateError) {
    return NextResponse.json({ error: 'We could not cancel this order.' }, { status: 500 });
  }

  await recordStatusChange(order.id, order.status, 'cancelled', 'Cancelled by the customer.');
  await sendOrderStatusUpdate(order.id, 'cancelled');

  return NextResponse.json({ ok: true, status: 'cancelled' });
}
