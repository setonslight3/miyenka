import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/lib/env';
import type { PaymentAdapter } from './types';

const API = 'https://api.flutterwave.com/v3';

type FlutterwaveResponse<T> = { status: string; message: string; data: T };

async function call<T>(path: string, init?: RequestInit): Promise<FlutterwaveResponse<T>> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${serverEnv().FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const payload = (await response.json()) as FlutterwaveResponse<T>;
  if (!response.ok || payload.status !== 'success') {
    throw new Error(`Flutterwave ${path} failed: ${payload.message ?? response.statusText}`);
  }
  return payload;
}

export const flutterwaveAdapter: PaymentAdapter = {
  provider: 'flutterwave',

  isConfigured() {
    return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
  },

  async initialize(input) {
    const { data } = await call<{ link: string }>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: input.reference,
        // Flutterwave takes major units, unlike Paystack.
        amount: (input.amountMinor / 100).toFixed(2),
        currency: input.currency,
        redirect_url: input.callbackUrl,
        customer: {
          email: input.email,
          name: input.customerName,
          phonenumber: input.customerPhone,
        },
        customizations: {
          title: 'Miyenka',
          description: 'Luxury dresses and statement gowns',
        },
        meta: input.metadata,
      }),
    });

    return { authorizationUrl: data.link, providerReference: input.reference };
  },

  async verify(reference) {
    const { data } = await call<{
      status: string;
      id: number;
      amount: number;
      currency: string;
      payment_type: string | null;
      created_at: string | null;
      tx_ref: string;
    }>(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`);

    return {
      successful: data.status === 'successful',
      reference: data.tx_ref,
      providerTransactionId: data.id ? String(data.id) : null,
      // Normalise to minor units so the caller compares like with like.
      amountMinor: Math.round(Number(data.amount) * 100),
      currency: data.currency,
      channel: data.payment_type,
      paidAt: data.created_at,
      raw: data,
    };
  },

  verifySignature(_rawBody, headers) {
    // Flutterwave sends a shared secret hash rather than an HMAC of the body.
    const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH;
    const provided = headers.get('verif-hash');
    if (!expected || !provided) return false;

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  },

  extractReference(payload) {
    const body = payload as { data?: { tx_ref?: string }; txRef?: string };
    return body?.data?.tx_ref ?? body?.txRef ?? null;
  },

  eventSignature(rawBody) {
    // The shared secret hash is identical on every delivery, so it cannot
    // distinguish events. Hash the body instead: a redelivery of the same
    // event produces the same digest and is rejected as a duplicate.
    return createHash('sha256').update(rawBody).digest('hex');
  },
};
