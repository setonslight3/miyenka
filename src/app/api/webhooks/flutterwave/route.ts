import { NextResponse } from 'next/server';
import { processPaymentWebhook } from '@/lib/payments/process-webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const outcome = await processPaymentWebhook('flutterwave', rawBody, request.headers);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
