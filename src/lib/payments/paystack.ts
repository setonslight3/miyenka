import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/lib/env';
import type { PaymentAdapter } from './types';

const API = 'https://api.paystack.co';

type PaystackResponse<T> = { status: boolean; message: string; data: T };

async function call<T>(path: string, init?: RequestInit): Promise<PaystackResponse<T>> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${serverEnv().PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const payload = (await response.json()) as PaystackResponse<T>;
  if (!response.ok || !payload.status) {
    throw new Error(`Paystack ${path} failed: ${payload.message ?? response.statusText}`);
  }
  return payload;
}

export const paystackAdapter: PaymentAdapter = {
  provider: 'paystack',

  isConfigured() {
    return Boolean(process.env.PAYSTACK_SECRET_KEY);
  },

  async initialize(input) {
    const { data } = await call<{ authorization_url: string; reference: string }>(
      '/transaction/initialize',
      {
        method: 'POST',
        body: JSON.stringify({
          reference: input.reference,
          // Paystack expects the smallest currency unit, which is what we store.
          amount: input.amountMinor,
          currency: input.currency,
          email: input.email,
          callback_url: input.callbackUrl,
          metadata: input.metadata,
        }),
      },
    );

    return { authorizationUrl: data.authorization_url, providerReference: data.reference };
  },

  async verify(reference) {
    const { data } = await call<{
      status: string;
      id: number;
      amount: number;
      currency: string;
      channel: string | null;
      paid_at: string | null;
      reference: string;
    }>(`/transaction/verify/${encodeURIComponent(reference)}`);

    return {
      successful: data.status === 'success',
      reference: data.reference,
      providerTransactionId: data.id ? String(data.id) : null,
      amountMinor: data.amount,
      currency: data.currency,
      channel: data.channel,
      paidAt: data.paid_at,
      raw: data,
    };
  },

  verifySignature(rawBody, headers) {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const provided = headers.get('x-paystack-signature');
    if (!secret || !provided) return false;

    const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    // Length check first: timingSafeEqual throws on mismatched lengths.
    return a.length === b.length && timingSafeEqual(a, b);
  },

  extractReference(payload) {
    const body = payload as { data?: { reference?: string } };
    return body?.data?.reference ?? null;
  },

  eventSignature(rawBody, headers) {
    // Paystack signs each delivery; the signature is stable per payload and so
    // identifies a redelivery of the same event.
    return headers.get('x-paystack-signature') ?? createHmac('sha256', 'miyenka').update(rawBody).digest('hex');
  },
};
