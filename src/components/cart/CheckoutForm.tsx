'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { formatMoney } from '@/lib/commerce/money';
import { COUNTRIES, NIGERIAN_STATES } from '@/lib/commerce/regions';
import { careMessage, whatsappUrl } from '@/lib/commerce/whatsapp';
import type { CareContact } from '@/components/layout/WhatsappLauncher';
import type { PaymentProvider } from '@/lib/payments/types';
import { cn } from '@/lib/utils/cn';

type Quote = {
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currency: string;
  issues: string[];
  promoApplied: boolean;
};

const PROVIDER_LABELS: Record<PaymentProvider, { name: string; blurb: string }> = {
  paystack: { name: 'Paystack', blurb: 'Card, bank transfer, USSD' },
  flutterwave: { name: 'Flutterwave', blurb: 'Card, bank transfer, mobile money' },
};

/**
 * Single-page checkout. No account is required.
 *
 * Totals shown here are quoted by the server as the address changes; the
 * final charge is recomputed again when the order is created, so what the
 * customer sees and what they are charged come from the same source.
 */
export function CheckoutForm({
  providers,
  defaults,
  signedIn,
  careContacts,
}: {
  providers: PaymentProvider[];
  defaults: { email: string; fullName: string; phone: string };
  signedIn: boolean;
  careContacts: CareContact[];
}) {
  const { cart, hydrated, subtotalMinor } = useCart();

  const [form, setForm] = useState({
    email: defaults.email,
    phone: defaults.phone,
    fullName: defaults.fullName,
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: 'NG',
    postalCode: '',
    customerNote: '',
    promoCode: '',
  });

  const [provider, setProvider] = useState<PaymentProvider | null>(providers[0] ?? null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  const lines = useMemo(
    () => cart.lines.map((line) => ({ productSizeId: line.productSizeId, quantity: line.quantity })),
    [cart.lines],
  );

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  // Re-quote whenever the destination, bag or promo code changes. Debounced so
  // typing an address does not fire a request per keystroke.
  useEffect(() => {
    if (!hydrated || !lines.length || !form.country) return;

    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const response = await fetch('/api/checkout/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lines,
            country: form.country,
            state: form.state || undefined,
            promoCode: form.promoCode || null,
            email: form.email || undefined,
          }),
        });
        if (!response.ok) return;
        const payload = (await response.json()) as Quote;
        setQuote(payload);
        setIssues(payload.issues ?? []);
      } finally {
        setQuoting(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [hydrated, lines, form.country, form.state, form.promoCode, form.email]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!provider) {
      setError('No payment method is available. Please contact client care.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines,
          email: form.email,
          phone: form.phone || undefined,
          shippingAddress: {
            fullName: form.fullName,
            line1: form.line1,
            line2: form.line2 || undefined,
            city: form.city,
            state: form.state,
            country: form.country,
            postalCode: form.postalCode || undefined,
            phone: form.phone || undefined,
          },
          promoCode: form.promoCode || null,
          customerNote: form.customerNote || undefined,
          provider,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? 'We could not start your payment.');
        setIssues(payload.issues ?? []);
        setSubmitting(false);
        return;
      }

      // Hand off to the provider's hosted page. The cart is cleared only once
      // the payment is confirmed, so a cancelled payment leaves the bag intact.
      window.location.href = payload.authorizationUrl;
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return <p className="shell py-24 text-center text-sm text-ink-faint">Preparing checkout…</p>;
  }

  if (!cart.lines.length) {
    return (
      <div className="shell py-24 text-center">
        <p className="font-display text-3xl font-light text-ink-muted">Your bag is empty</p>
        <Link
          href="/shop"
          className="mt-8 inline-block border border-ink px-10 py-4 text-[0.72rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream"
        >
          Explore the collection
        </Link>
      </div>
    );
  }

  const showState = form.country === 'NG';
  const total = quote?.totalMinor ?? subtotalMinor;

  return (
    <div className="shell max-w-6xl py-12 lg:py-16">
      <header className="mb-10 text-center">
        <p className="eyebrow">Miyenka</p>
        <h1 className="display-md mt-3">Checkout</h1>
        {!signedIn ? (
          <p className="mt-3 text-xs text-ink-faint">
            No account needed.{' '}
            <Link href="/sign-in?next=/checkout" className="underline underline-offset-4 hover:text-ink">
              Sign in
            </Link>{' '}
            if you would like your order saved to your account.
          </p>
        ) : null}
      </header>

      <form onSubmit={onSubmit} className="grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        <div className="space-y-10">
          <fieldset>
            <legend className="eyebrow mb-5">Contact</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email address" required className="sm:col-span-2">
                <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} className={inputClass} />
              </Field>
              <Field label="Full name" required>
                <input type="text" required autoComplete="name" value={form.fullName} onChange={set('fullName')} className={inputClass} />
              </Field>
              <Field label="Phone">
                <input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} className={inputClass} />
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-5">Delivery address</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country" required className="sm:col-span-2">
                <select required value={form.country} onChange={set('country')} className={inputClass}>
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Address" required className="sm:col-span-2">
                <input type="text" required autoComplete="address-line1" value={form.line1} onChange={set('line1')} className={inputClass} />
              </Field>

              <Field label="Apartment, suite (optional)" className="sm:col-span-2">
                <input type="text" autoComplete="address-line2" value={form.line2} onChange={set('line2')} className={inputClass} />
              </Field>

              <Field label="City" required>
                <input type="text" required autoComplete="address-level2" value={form.city} onChange={set('city')} className={inputClass} />
              </Field>

              <Field label={showState ? 'State' : 'State / Region'} required>
                {showState ? (
                  <select required value={form.state} onChange={set('state')} className={inputClass}>
                    <option value="">Select a state</option>
                    {NIGERIAN_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" required autoComplete="address-level1" value={form.state} onChange={set('state')} className={inputClass} />
                )}
              </Field>

              <Field label="Postal code (optional)">
                <input type="text" autoComplete="postal-code" value={form.postalCode} onChange={set('postalCode')} className={inputClass} />
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-5">Payment</legend>
            {providers.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {providers.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setProvider(option)}
                    aria-pressed={provider === option}
                    className={cn(
                      'border p-5 text-left transition-colors duration-300',
                      provider === option ? 'border-ink bg-ink/[0.03]' : 'border-ink/15 hover:border-ink/40',
                    )}
                  >
                    <p className="text-sm">{PROVIDER_LABELS[option].name}</p>
                    <p className="mt-1 text-xs text-ink-faint">{PROVIDER_LABELS[option].blurb}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="border border-burgundy/30 bg-burgundy/5 p-5 text-sm text-burgundy">
                No payment method is currently available. Please contact client care to complete your order.
              </p>
            )}
            <p className="mt-4 text-[0.68rem] leading-relaxed text-ink-faint">
              You will be taken to your chosen provider to pay securely. Miyenka never sees or stores
              your card details.
            </p>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-5">Anything we should know?</legend>
            <textarea
              rows={3}
              value={form.customerNote}
              onChange={set('customerNote')}
              placeholder="Delivery notes, an event date, a preferred delivery window…"
              className={inputClass}
            />
          </fieldset>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border border-ink/10 p-7">
            <h2 className="eyebrow">Your order</h2>

            <ul className="mt-6 space-y-5">
              {cart.lines.map((line) => (
                <li key={line.productSizeId} className="flex gap-4">
                  <div className="relative h-24 w-18 shrink-0 overflow-hidden bg-cream-deep" style={{ width: '4.5rem' }}>
                    {line.imageUrl ? (
                      <Image src={line.imageUrl} alt={line.name} fill sizes="72px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="leading-snug">{line.name}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {line.colorName} · {line.size} · ×{line.quantity}
                    </p>
                  </div>
                  <p className="text-sm">{formatMoney(line.unitPriceMinor * line.quantity)}</p>
                </li>
              ))}
            </ul>

            <div className="mt-7 border-t border-ink/10 pt-5">
              <label htmlFor="promo" className="text-[0.62rem] uppercase tracking-luxe text-ink-faint">
                Promotion code
              </label>
              <input
                id="promo"
                type="text"
                value={form.promoCode}
                onChange={set('promoCode')}
                placeholder="Enter a code"
                className={cn(inputClass, 'mt-2')}
              />
            </div>

            <dl className="mt-6 space-y-2.5 border-t border-ink/10 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd>{formatMoney(quote?.subtotalMinor ?? subtotalMinor)}</dd>
              </div>
              {quote && quote.discountMinor > 0 ? (
                <div className="flex justify-between text-gold-deep">
                  <dt>Discount</dt>
                  <dd>−{formatMoney(quote.discountMinor)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-ink-muted">Shipping</dt>
                <dd>
                  {!form.state && showState ? (
                    <span className="text-ink-faint">Select a state</span>
                  ) : quoting ? (
                    <span className="text-ink-faint">Calculating…</span>
                  ) : quote?.shippingMinor === 0 ? (
                    'Complimentary'
                  ) : (
                    formatMoney(quote?.shippingMinor ?? 0)
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-4 font-display text-xl">
                <dt>Total</dt>
                <dd>{formatMoney(total)}</dd>
              </div>
            </dl>

            {issues.length ? (
              <ul className="mt-5 space-y-1.5 border border-burgundy/25 bg-burgundy/5 p-4 text-xs text-burgundy">
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}

            {error ? (
              <p role="alert" className="mt-5 border border-burgundy/30 bg-burgundy/5 p-4 text-xs text-burgundy">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !provider || !cart.lines.length}
              className="mt-6 w-full bg-ink py-4 text-[0.72rem] uppercase tracking-luxe text-cream transition-colors duration-500 hover:bg-ink-soft disabled:opacity-40"
            >
              {submitting ? 'Taking you to payment…' : `Pay ${formatMoney(total)}`}
            </button>

            {careContacts.length ? (
              <p className="mt-4 text-center text-[0.65rem] text-ink-faint">
                Need help?{' '}
                <a
                  href={whatsappUrl(careContacts[0].phone_e164, careMessage('my checkout'))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-ink"
                >
                  Message client care
                </a>
              </p>
            ) : null}
          </div>
        </aside>
      </form>
    </div>
  );
}

const inputClass =
  'w-full border border-ink/15 bg-transparent px-4 py-3 text-sm transition-colors focus:border-ink focus:outline-none';

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-2 block text-[0.62rem] uppercase tracking-luxe text-ink-faint">
        {label}
        {required ? <span className="text-burgundy"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
