import 'server-only';

import { paystackAdapter } from './paystack';
import { flutterwaveAdapter } from './flutterwave';
import type { PaymentAdapter, PaymentProvider } from './types';

const ADAPTERS: Record<PaymentProvider, PaymentAdapter> = {
  paystack: paystackAdapter,
  flutterwave: flutterwaveAdapter,
};

export function getAdapter(provider: PaymentProvider): PaymentAdapter {
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`Unknown payment provider: ${provider}`);
  return adapter;
}

/** Providers that currently hold credentials, for the checkout selector. */
export function availableProviders(): PaymentProvider[] {
  return (Object.keys(ADAPTERS) as PaymentProvider[]).filter((provider) =>
    ADAPTERS[provider].isConfigured(),
  );
}

export type { PaymentAdapter, PaymentProvider } from './types';
