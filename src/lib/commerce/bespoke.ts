import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';

export type MeasurementInput = {
  bustCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  shoulderToHemCm?: number | null;
  heightCm?: number | null;
};

export type CustomRequestInput = MeasurementInput & {
  userId?: string | null;
  productId?: string | null;
  contactEmail: string;
  contactName?: string | null;
  contactPhone?: string | null;
  preferredFabric?: string | null;
  preferredColor?: string | null;
  modificationNotes?: string | null;
  eventDate?: string | null;
  referencePaths?: string[];
};

/**
 * Records a bespoke commission request.
 *
 * Bespoke requests never touch ready-to-wear stock: nothing here reads or
 * decrements product_sizes. Reference photographs are stored as paths into the
 * private `custom-references` bucket, which has no public read policy at all.
 */
export async function createCustomRequest(input: CustomRequestInput) {
  const supabase = createAdminClient();

  const reference = `MB-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

  const { data: request, error } = await supabase
    .from('custom_requests')
    .insert({
      reference,
      user_id: input.userId ?? null,
      product_id: input.productId ?? null,
      contact_email: input.contactEmail,
      contact_name: input.contactName ?? null,
      contact_phone: input.contactPhone ?? null,
      bust_cm: input.bustCm ?? null,
      waist_cm: input.waistCm ?? null,
      hips_cm: input.hipsCm ?? null,
      shoulder_to_hem_cm: input.shoulderToHemCm ?? null,
      height_cm: input.heightCm ?? null,
      preferred_fabric: input.preferredFabric ?? null,
      preferred_color: input.preferredColor ?? null,
      modification_notes: input.modificationNotes ?? null,
      event_date: input.eventDate ?? null,
      status: 'awaiting_quote',
    })
    .select('*')
    .single();

  if (error || !request) {
    throw new Error(`Could not record the request: ${error?.message ?? 'unknown'}`);
  }

  if (input.referencePaths?.length) {
    await supabase.from('custom_request_media').insert(
      input.referencePaths.map((path) => ({ request_id: request.id, storage_path: path })),
    );
  }

  return request;
}

/**
 * Loads a quote by its unguessable access token.
 *
 * Returns only customer-safe fields: the internal request, its measurements
 * and its private reference media are deliberately not exposed here, because
 * this page is reachable by anyone holding the link.
 */
export async function loadQuoteByToken(token: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('custom_quotes')
    .select(`
      id, quote_number, amount_minor, shipping_minor, total_minor, currency,
      summary, production_days, status, expires_at, paid_at, access_token,
      request:custom_requests (reference, contact_email, contact_name, event_date, product_id)
    `)
    .eq('access_token', token)
    .maybeSingle();

  if (!data) return null;

  const request = Array.isArray(data.request) ? data.request[0] : data.request;

  return {
    id: data.id,
    quoteNumber: data.quote_number,
    amountMinor: data.amount_minor,
    shippingMinor: data.shipping_minor,
    totalMinor: data.total_minor,
    currency: data.currency,
    summary: data.summary,
    productionDays: data.production_days,
    status: data.status,
    expiresAt: data.expires_at,
    paidAt: data.paid_at,
    accessToken: data.access_token,
    reference: request?.reference ?? null,
    contactEmail: request?.contact_email ?? null,
    contactName: request?.contact_name ?? null,
    eventDate: request?.event_date ?? null,
  };
}

/**
 * Whether a quotation has passed its expiry.
 *
 * Evaluated on the server against the server clock — never in the browser,
 * which would both risk a hydration mismatch and trust a clock we do not
 * control.
 */
export function isQuoteExpired(quote: { expiresAt: string | null }): boolean {
  return Boolean(quote.expiresAt && new Date(quote.expiresAt).getTime() < Date.now());
}

export function isQuotePayable(quote: { status: string; expiresAt: string | null }): boolean {
  if (quote.status !== 'sent') return false;
  return !isQuoteExpired(quote);
}
