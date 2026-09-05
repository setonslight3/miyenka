import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { isQuotePayable, loadQuoteByToken } from '@/lib/commerce/bespoke';
import { getAdapter, availableProviders } from '@/lib/payments';
import { publicEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ provider: z.enum(['paystack', 'flutterwave']) });

/**
 * Starts payment for a bespoke quotation.
 *
 * The amount comes from the stored quote, never from the request. The quote's
 * unguessable token is the only credential, so eligibility (still `sent`, not
 * expired, not already paid) is re-checked here on every call.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Choose a payment method.' }, { status: 400 });
  }

  const adapter = getAdapter(body.provider);
  if (!adapter.isConfigured()) {
    return NextResponse.json(
      { error: 'That payment method is unavailable.', available: availableProviders() },
      { status: 400 },
    );
  }

  const quote = await loadQuoteByToken(token);
  if (!quote) return NextResponse.json({ error: 'Quotation not found.' }, { status: 404 });

  if (quote.status === 'paid') {
    return NextResponse.json({ error: 'This quotation has already been paid.' }, { status: 409 });
  }
  if (!isQuotePayable(quote)) {
    return NextResponse.json(
      { error: 'This quotation is no longer available. Please contact client care.' },
      { status: 409 },
    );
  }
  if (!quote.contactEmail) {
    return NextResponse.json({ error: 'This quotation has no contact email.' }, { status: 409 });
  }

  const reference = `${quote.quoteNumber}-${Date.now().toString(36)}`;
  const admin = createAdminClient();

  try {
    const initialised = await adapter.initialize({
      reference,
      amountMinor: quote.totalMinor,
      currency: quote.currency,
      email: quote.contactEmail,
      callbackUrl: `${publicEnv.NEXT_PUBLIC_SITE_URL}/quote/${token}`,
      customerName: quote.contactName ?? undefined,
      metadata: { custom_quote_id: quote.id, quote_number: quote.quoteNumber },
    });

    await admin.from('payments').insert({
      custom_quote_id: quote.id,
      provider: body.provider,
      provider_reference: initialised.providerReference,
      status: 'pending',
      amount_minor: quote.totalMinor,
      currency: quote.currency,
      authorization_url: initialised.authorizationUrl,
    });

    await admin
      .from('custom_requests')
      .update({ status: 'awaiting_payment' })
      .eq('reference', quote.reference ?? '');

    return NextResponse.json({ authorizationUrl: initialised.authorizationUrl });
  } catch (error) {
    console.error('Quote payment initialisation failed', error);
    return NextResponse.json(
      { error: 'We could not start the payment. Please try again.' },
      { status: 502 },
    );
  }
}
