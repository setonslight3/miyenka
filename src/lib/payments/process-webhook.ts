import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { getAdapter, type PaymentProvider } from '@/lib/payments';
import { recordStatusChange } from '@/lib/commerce/orders';
import { sendOrderConfirmation, sendStockExceptionAlert } from '@/lib/email';

export type WebhookOutcome = {
  status: number;
  body: Record<string, unknown>;
};

/**
 * Processes a payment webhook for either provider.
 *
 * Four properties matter here, and each is enforced explicitly:
 *
 *  1. Authenticity — the body is signature-verified before anything is read.
 *  2. Authority — provider state is re-fetched with a server-to-server verify
 *     call; the webhook body is treated as a notification, never as proof.
 *  3. Idempotency — each delivery is recorded against a unique
 *     (provider, event_signature); a replay is acknowledged and dropped.
 *  4. Atomicity — stock is committed by decrement_inventory(), which locks
 *     rows and either commits every line or none.
 */
export async function processPaymentWebhook(
  provider: PaymentProvider,
  rawBody: string,
  headers: Headers,
): Promise<WebhookOutcome> {
  const adapter = getAdapter(provider);

  if (!adapter.verifySignature(rawBody, headers)) {
    // Deliberately terse: an attacker learns nothing about why it failed.
    return { status: 401, body: { error: 'Invalid signature.' } };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: 'Malformed payload.' } };
  }

  const reference = adapter.extractReference(payload);
  if (!reference) {
    return { status: 202, body: { ignored: 'No payment reference in payload.' } };
  }

  const supabase = createAdminClient();
  const eventSignature = adapter.eventSignature(rawBody, headers);
  const eventType =
    (payload as { event?: string; 'event.type'?: string })?.event ??
    (payload as { 'event.type'?: string })?.['event.type'] ??
    'unknown';

  // Claim this delivery. The unique (provider, event_signature) constraint
  // means a concurrent or later replay loses the race and is dropped.
  const { data: event, error: eventError } = await supabase
    .from('payment_events')
    .insert({
      provider,
      event_type: eventType,
      event_signature: eventSignature,
      provider_reference: reference,
      payload: payload as never,
    })
    .select('id')
    .single();

  if (eventError) {
    // 23505 = unique violation: we have already seen this exact delivery.
    if ((eventError as { code?: string }).code === '23505') {
      return { status: 200, body: { status: 'duplicate_ignored' } };
    }
    console.error('Could not record payment event', eventError);
    return { status: 500, body: { error: 'Could not record event.' } };
  }

  try {
    // Never trust the amount or status in the webhook body.
    const verified = await adapter.verify(reference);

    const { data: payment } = await supabase
      .from('payments')
      .select('*, order:orders (*)')
      .eq('provider', provider)
      .eq('provider_reference', reference)
      .maybeSingle();

    if (!payment) {
      await finishEvent(event.id, 'No matching payment record.');
      return { status: 202, body: { ignored: 'Unknown payment reference.' } };
    }

    if (!verified.successful) {
      await supabase
        .from('payments')
        .update({ status: 'failed', raw_response: verified.raw as never, verified_at: new Date().toISOString() })
        .eq('id', payment.id);

      await finishEvent(event.id);
      return { status: 200, body: { status: 'payment_not_successful' } };
    }

    // Guard against an under-payment being treated as settled.
    if (verified.amountMinor < payment.amount_minor || verified.currency !== payment.currency) {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          raw_response: verified.raw as never,
          verified_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      await finishEvent(
        event.id,
        `Amount mismatch: charged ${verified.amountMinor} ${verified.currency}, expected ${payment.amount_minor} ${payment.currency}.`,
      );
      return { status: 200, body: { status: 'amount_mismatch' } };
    }

    if (payment.status === 'successful') {
      await finishEvent(event.id);
      return { status: 200, body: { status: 'already_processed' } };
    }

    await supabase
      .from('payments')
      .update({
        status: 'successful',
        provider_transaction_id: verified.providerTransactionId,
        channel: verified.channel,
        paid_at: verified.paidAt ?? new Date().toISOString(),
        verified_at: new Date().toISOString(),
        raw_response: verified.raw as never,
      })
      .eq('id', payment.id);

    if (!payment.order_id) {
      await finishEvent(event.id, 'Payment verified but carries no order.');
      return { status: 200, body: { status: 'payment_recorded_without_order' } };
    }

    // Atomic: commits every line or none, and short-circuits on a replay.
    const { data: commit, error: commitError } = await supabase.rpc('decrement_inventory', {
      p_order_id: payment.order_id,
    });

    if (commitError) {
      await finishEvent(event.id, `Inventory commit failed: ${commitError.message}`);
      return { status: 500, body: { error: 'Inventory commit failed.' } };
    }

    const committed = (commit as { committed?: boolean })?.committed === true;

    if (!committed) {
      /*
        Payment succeeded but stock is gone — the concurrent last-item case.
        The specification is explicit that this must become an operational
        exception for customer care rather than a silently completed purchase,
        so the order is confirmed (the customer has genuinely paid) and flagged
        for manual resolution.
      */
      const reason = (commit as { reason?: string })?.reason ?? 'unknown';
      const shortfalls = (commit as { shortfalls?: unknown })?.shortfalls;

      await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          admin_note: `STOCK EXCEPTION (${reason}): payment verified but inventory could not be committed. Contact the customer. ${JSON.stringify(shortfalls ?? [])}`,
        })
        .eq('id', payment.order_id);

      await recordStatusChange(
        payment.order_id,
        'pending_payment',
        'confirmed',
        'Payment verified. Inventory could not be committed — needs customer care.',
      );

      await sendStockExceptionAlert(payment.order_id, reason, shortfalls);
      await finishEvent(event.id, `Stock exception: ${reason}`);

      return { status: 200, body: { status: 'stock_exception', reason } };
    }

    const previousStatus = payment.order?.status ?? 'pending_payment';

    await supabase
      .from('orders')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', payment.order_id)
      .eq('status', 'pending_payment');

    await recordStatusChange(payment.order_id, previousStatus, 'confirmed', 'Payment verified.');

    // Count the promotion only once the order is genuinely paid.
    if (payment.order?.promotion_id) {
      await supabase.from('promotion_redemptions').insert({
        promotion_id: payment.order.promotion_id,
        order_id: payment.order_id,
        user_id: payment.order.user_id,
        email: payment.order.guest_email,
        discount_minor: payment.order.discount_minor,
      });

      await supabase.rpc('increment_promotion_usage', { p_promotion_id: payment.order.promotion_id });
    }

    await sendOrderConfirmation(payment.order_id);
    await finishEvent(event.id);

    return { status: 200, body: { status: 'confirmed' } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Webhook processing failed for ${provider}/${reference}`, error);
    await finishEvent(event.id, message);
    // A 500 invites the provider to retry, and the event row makes that safe.
    return { status: 500, body: { error: 'Processing failed.' } };
  }
}

async function finishEvent(eventId: string, error?: string) {
  const supabase = createAdminClient();
  await supabase
    .from('payment_events')
    .update({ processed_at: new Date().toISOString(), processing_error: error ?? null })
    .eq('id', eventId);
}
