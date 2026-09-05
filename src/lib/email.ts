import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { formatMoney, type CurrencyCode } from '@/lib/commerce/money';
import { publicEnv } from '@/lib/env';

/**
 * Transactional email.
 *
 * Every send is logged to email_events whether or not a provider is
 * configured, so order confirmations are auditable from day one and the
 * absence of RESEND_API_KEY degrades to a queued record rather than an
 * exception that would fail a webhook.
 */
type SendInput = {
  to: string;
  subject: string;
  html: string;
  template: string;
  orderId?: string | null;
};

async function send({ to, subject, html, template, orderId }: SendInput) {
  const supabase = createAdminClient();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'Miyenka <orders@miyenka.com>';

  if (!apiKey) {
    await supabase.from('email_events').insert({
      recipient: to,
      template,
      subject,
      order_id: orderId ?? null,
      status: 'skipped_no_provider',
    });
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });

    const payload = (await response.json()) as { id?: string; message?: string };

    await supabase.from('email_events').insert({
      recipient: to,
      template,
      subject,
      order_id: orderId ?? null,
      provider_message_id: payload.id ?? null,
      status: response.ok ? 'sent' : 'failed',
      error: response.ok ? null : (payload.message ?? response.statusText),
    });
  } catch (error) {
    await supabase.from('email_events').insert({
      recipient: to,
      template,
      subject,
      order_id: orderId ?? null,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

const shell = (title: string, body: string) => `
<div style="font-family:Georgia,serif;background:#FAF6F1;padding:40px 0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;padding:40px;">
    <p style="letter-spacing:.28em;text-transform:uppercase;font-size:11px;color:#8C817A;margin:0 0 8px;font-family:Arial,sans-serif;">Miyenka</p>
    <h1 style="font-weight:300;font-size:28px;margin:0 0 24px;color:#100D0B;">${title}</h1>
    ${body}
    <p style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:12px;color:#8C817A;font-family:Arial,sans-serif;">
      Questions? Reply to this email or reach client care on WhatsApp.
    </p>
  </div>
</div>`;

export async function sendOrderConfirmation(orderId: string) {
  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items (*)')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return;

  const recipient = order.guest_email ?? (await lookupUserEmail(order.user_id));
  if (!recipient) return;

  const currency = (order.currency as CurrencyCode) ?? 'NGN';
  const rows = (order.items ?? [])
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0ece6;">
          <strong style="font-weight:400;">${escapeHtml(item.product_name)}</strong><br>
          <span style="font-size:12px;color:#8C817A;">${escapeHtml(item.variant_color ?? '')} ${item.size ? `· Size ${item.size}` : ''} · Qty ${item.quantity}</span>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f0ece6;text-align:right;">
          ${formatMoney(item.line_total_minor, currency)}
        </td>
      </tr>`,
    )
    .join('');

  const body = `
    <p style="font-size:15px;line-height:1.7;color:#5C534E;">
      Thank you — your payment has been received and your order is confirmed.
    </p>
    <p style="font-size:15px;color:#100D0B;">Order <strong style="font-weight:400;">${order.order_number}</strong></p>
    <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;color:#100D0B;">${rows}</table>
    <table style="width:100%;font-size:14px;color:#5C534E;">
      <tr><td>Subtotal</td><td style="text-align:right;">${formatMoney(order.subtotal_minor, currency)}</td></tr>
      ${order.discount_minor > 0 ? `<tr><td>Discount</td><td style="text-align:right;">−${formatMoney(order.discount_minor, currency)}</td></tr>` : ''}
      <tr><td>Shipping</td><td style="text-align:right;">${order.shipping_minor === 0 ? 'Complimentary' : formatMoney(order.shipping_minor, currency)}</td></tr>
      <tr><td style="padding-top:12px;color:#100D0B;font-size:16px;">Total</td><td style="padding-top:12px;text-align:right;color:#100D0B;font-size:16px;">${formatMoney(order.total_minor, currency)}</td></tr>
    </table>
    <p style="margin-top:28px;">
      <a href="${publicEnv.NEXT_PUBLIC_SITE_URL}/order/${order.order_number}"
         style="display:inline-block;background:#100D0B;color:#FAF6F1;padding:14px 32px;text-decoration:none;letter-spacing:.2em;text-transform:uppercase;font-size:11px;font-family:Arial,sans-serif;">
        View your order
      </a>
    </p>`;

  await send({
    to: recipient,
    subject: `Your Miyenka order ${order.order_number} is confirmed`,
    html: shell('Your order is confirmed', body),
    template: 'order_confirmation',
    orderId,
  });
}

export async function sendOrderStatusUpdate(orderId: string, status: string, trackingUrl?: string | null) {
  const supabase = createAdminClient();
  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (!order) return;

  const recipient = order.guest_email ?? (await lookupUserEmail(order.user_id));
  if (!recipient) return;

  const label: Record<string, string> = {
    processing: 'is in production',
    shipped: 'has been dispatched',
    delivered: 'has been delivered',
    cancelled: 'has been cancelled',
  };

  const body = `
    <p style="font-size:15px;line-height:1.7;color:#5C534E;">
      Your order <strong style="font-weight:400;color:#100D0B;">${order.order_number}</strong>
      ${label[status] ?? `is now ${escapeHtml(status)}`}.
    </p>
    ${trackingUrl ? `<p style="font-size:14px;"><a href="${escapeHtml(trackingUrl)}" style="color:#9C7B18;">Track your delivery</a></p>` : ''}
    <p style="margin-top:28px;">
      <a href="${publicEnv.NEXT_PUBLIC_SITE_URL}/order/${order.order_number}"
         style="display:inline-block;background:#100D0B;color:#FAF6F1;padding:14px 32px;text-decoration:none;letter-spacing:.2em;text-transform:uppercase;font-size:11px;font-family:Arial,sans-serif;">
        View your order
      </a>
    </p>`;

  await send({
    to: recipient,
    subject: `Miyenka order ${order.order_number} — update`,
    html: shell('An update on your order', body),
    template: 'order_status_update',
    orderId,
  });
}

export async function sendQuoteReady(quoteId: string) {
  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from('custom_quotes')
    .select('*, request:custom_requests (contact_email, contact_name)')
    .eq('id', quoteId)
    .maybeSingle();

  if (!quote?.request?.contact_email) return;

  const currency = (quote.currency as CurrencyCode) ?? 'NGN';
  const body = `
    <p style="font-size:15px;line-height:1.7;color:#5C534E;">
      Your bespoke quotation is ready.
    </p>
    ${quote.summary ? `<p style="font-size:14px;line-height:1.7;color:#5C534E;">${escapeHtml(quote.summary)}</p>` : ''}
    <p style="font-size:20px;color:#100D0B;">${formatMoney(quote.total_minor, currency)}</p>
    ${quote.production_days ? `<p style="font-size:13px;color:#8C817A;">Production time: approximately ${quote.production_days} days.</p>` : ''}
    <p style="margin-top:28px;">
      <a href="${publicEnv.NEXT_PUBLIC_SITE_URL}/quote/${quote.access_token}"
         style="display:inline-block;background:#C9A227;color:#100D0B;padding:14px 32px;text-decoration:none;letter-spacing:.2em;text-transform:uppercase;font-size:11px;font-family:Arial,sans-serif;">
        View and pay
      </a>
    </p>
    ${quote.expires_at ? `<p style="font-size:12px;color:#8C817A;margin-top:16px;">This quotation is valid until ${new Date(quote.expires_at).toLocaleDateString('en-GB')}.</p>` : ''}`;

  await send({
    to: quote.request.contact_email,
    subject: `Your Miyenka bespoke quotation ${quote.quote_number}`,
    html: shell('Your bespoke quotation', body),
    template: 'custom_quote',
  });
}

/** Internal alert: payment succeeded but stock could not be committed. */
export async function sendStockExceptionAlert(orderId: string, reason: string, shortfalls: unknown) {
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from('orders')
    .select('order_number, total_minor, currency, guest_email')
    .eq('id', orderId)
    .maybeSingle();

  const alertTo = process.env.OPS_ALERT_EMAIL;
  if (!alertTo || !order) return;

  await send({
    to: alertTo,
    subject: `[Miyenka] Stock exception on order ${order.order_number}`,
    html: shell(
      'Stock exception',
      `<p style="font-size:14px;line-height:1.7;color:#5C534E;">
         Payment was verified for <strong>${order.order_number}</strong> but inventory could not be
         committed (${escapeHtml(reason)}). The customer has been charged and needs contacting.
       </p>
       <pre style="background:#f6f3ee;padding:16px;font-size:12px;overflow:auto;">${escapeHtml(
         JSON.stringify(shortfalls ?? {}, null, 2),
       )}</pre>`,
    ),
    template: 'stock_exception_alert',
    orderId,
  });
}

async function lookupUserEmail(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from('profiles').select('email').eq('id', userId).maybeSingle();
  return data?.email ?? null;
}

/** Escapes values interpolated into email HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
