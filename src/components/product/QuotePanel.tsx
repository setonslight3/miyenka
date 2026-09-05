'use client';

import { useState } from 'react';
import { formatMoney, type CurrencyCode } from '@/lib/commerce/money';
import { careMessage, whatsappUrl } from '@/lib/commerce/whatsapp';
import type { CareContact } from '@/components/layout/WhatsappLauncher';
import type { PaymentProvider } from '@/lib/payments/types';
import { cn } from '@/lib/utils/cn';

type Quote = {
  id: string;
  quoteNumber: string;
  amountMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currency: string;
  summary: string | null;
  productionDays: number | null;
  status: string;
  expiresAt: string | null;
  paidAt: string | null;
  accessToken: string;
  reference: string | null;
  contactName: string | null;
  eventDate: string | null;
};

const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
};

/**
 * The customer-facing quotation page.
 *
 * Reached by an unguessable token, so it shows only customer-safe fields —
 * never the internal request, its measurements or its private reference media.
 */
export function QuotePanel({
  quote,
  payable,
  expired,
  providers,
  careContacts,
}: {
  quote: Quote;
  payable: boolean;
  /**
   * Decided on the server. Comparing the expiry against the browser clock
   * during render would risk a hydration mismatch and would trust a clock we
   * do not control.
   */
  expired: boolean;
  providers: PaymentProvider[];
  careContacts: CareContact[];
}) {
  const [provider, setProvider] = useState<PaymentProvider | null>(providers[0] ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = (quote.currency as CurrencyCode) ?? 'NGN';
  const paid = quote.status === 'paid';

  async function pay() {
    if (!provider) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotes/${quote.accessToken}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? 'We could not start the payment.');
        setSubmitting(false);
        return;
      }
      window.location.href = payload.authorizationUrl;
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="shell max-w-2xl py-16 lg:py-24">
      <header className="text-center">
        <p className="eyebrow">Bespoke Atelier</p>
        <h1 className="display-md mt-3">
          {paid ? 'Your commission is confirmed' : 'Your quotation'}
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          {quote.quoteNumber}
          {quote.reference ? ` · Request ${quote.reference}` : ''}
        </p>
      </header>

      <div className="mt-12 border border-ink/10 p-8 sm:p-10">
        {quote.contactName ? (
          <p className="text-sm text-ink-muted">For {quote.contactName}</p>
        ) : null}

        {quote.summary ? (
          <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-muted">{quote.summary}</p>
        ) : null}

        <dl className="mt-8 space-y-2.5 border-t border-ink/10 pt-6 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Commission</dt>
            <dd>{formatMoney(quote.amountMinor, currency)}</dd>
          </div>
          {quote.shippingMinor > 0 ? (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Delivery</dt>
              <dd>{formatMoney(quote.shippingMinor, currency)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-ink/10 pt-4 font-display text-2xl">
            <dt>Total</dt>
            <dd>{formatMoney(quote.totalMinor, currency)}</dd>
          </div>
        </dl>

        <dl className="mt-8 grid gap-5 border-t border-ink/10 pt-6 sm:grid-cols-2">
          {quote.productionDays ? (
            <div>
              <dt className="text-[0.62rem] uppercase tracking-luxe text-ink-faint">Production</dt>
              <dd className="mt-1 text-sm text-ink-muted">
                Approximately {quote.productionDays} days from payment
              </dd>
            </div>
          ) : null}
          {quote.eventDate ? (
            <div>
              <dt className="text-[0.62rem] uppercase tracking-luxe text-ink-faint">Your event</dt>
              <dd className="mt-1 text-sm text-ink-muted">
                {new Date(quote.eventDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
          ) : null}
          {quote.expiresAt && !paid ? (
            <div>
              <dt className="text-[0.62rem] uppercase tracking-luxe text-ink-faint">Valid until</dt>
              <dd className={cn('mt-1 text-sm', expired ? 'text-burgundy' : 'text-ink-muted')}>
                {new Date(quote.expiresAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
          ) : null}
        </dl>

        {paid ? (
          <div className="mt-8 border border-gold/40 bg-blush-soft/30 p-6 text-center">
            <p className="font-display text-xl">Payment received</p>
            <p className="mt-2 text-sm text-ink-muted">
              Your piece is in production. We will be in touch as it progresses.
            </p>
          </div>
        ) : !payable ? (
          <div className="mt-8 border border-burgundy/25 bg-burgundy/5 p-6 text-center">
            <p className="text-sm text-burgundy">
              {expired
                ? 'This quotation has expired.'
                : 'This quotation is no longer available.'}
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              Client care can prepare a fresh quotation for you.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <p className="eyebrow mb-4">Settle this quotation</p>

            {providers.length ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {providers.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setProvider(option)}
                      aria-pressed={provider === option}
                      className={cn(
                        'border px-5 py-4 text-left text-sm transition-colors duration-300',
                        provider === option ? 'border-ink bg-ink/[0.03]' : 'border-ink/15 hover:border-ink/40',
                      )}
                    >
                      {PROVIDER_LABELS[option]}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={pay}
                  disabled={submitting || !provider}
                  className="mt-5 w-full bg-gold py-4 text-[0.72rem] uppercase tracking-luxe text-ink transition-colors duration-500 hover:bg-gold-deep hover:text-cream disabled:opacity-40"
                >
                  {submitting
                    ? 'Taking you to payment…'
                    : `Pay ${formatMoney(quote.totalMinor, currency)}`}
                </button>
              </>
            ) : (
              <p className="border border-burgundy/25 bg-burgundy/5 p-5 text-sm text-burgundy">
                No payment method is currently available. Please contact client care.
              </p>
            )}

            {error ? (
              <p role="alert" className="mt-4 text-sm text-burgundy">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {careContacts.length ? (
        <p className="mt-8 text-center text-xs text-ink-faint">
          Questions about this quotation?{' '}
          <a
            href={whatsappUrl(careContacts[0].phone_e164, careMessage(`quotation ${quote.quoteNumber}`))}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-ink"
          >
            Message client care
          </a>
        </p>
      ) : null}
    </div>
  );
}
