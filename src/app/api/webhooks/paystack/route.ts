import { NextResponse } from 'next/server';
import { processPaymentWebhook } from '@/lib/payments/process-webhook';

// The raw body is required for signature verification, so this route must run
// on Node and must never be cached or statically analysed.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const outcome = await processPaymentWebhook('paystack', rawBody, request.headers);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
