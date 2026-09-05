export type PaymentProvider = 'paystack' | 'flutterwave';

export type InitializeInput = {
  reference: string;
  amountMinor: number;
  currency: string;
  email: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  customerName?: string;
  customerPhone?: string;
};

export type InitializeResult = {
  authorizationUrl: string;
  providerReference: string;
};

export type VerifiedPayment = {
  successful: boolean;
  reference: string;
  providerTransactionId: string | null;
  amountMinor: number;
  currency: string;
  channel: string | null;
  paidAt: string | null;
  raw: unknown;
};

/**
 * Every provider is reached through this interface, so adding one is an
 * adapter rather than a change to checkout or the webhook handlers.
 */
export type PaymentAdapter = {
  provider: PaymentProvider;
  isConfigured(): boolean;
  initialize(input: InitializeInput): Promise<InitializeResult>;
  verify(reference: string): Promise<VerifiedPayment>;
  /** Confirms a webhook body genuinely came from the provider. */
  verifySignature(rawBody: string, headers: Headers): boolean;
  /** Pulls the payment reference out of a webhook body. */
  extractReference(payload: unknown): string | null;
  /** Stable per-delivery identity, used to make replays idempotent. */
  eventSignature(rawBody: string, headers: Headers): string;
};
