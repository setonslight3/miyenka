'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Guest orders are not readable with the anon key, so viewing one requires the
 * email used at checkout. The message is deliberately identical whether the
 * order number is wrong or the email does not match, so this page cannot be
 * used to discover which order numbers exist.
 */
export function GuestOrderGate({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    router.push(`/order/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(email)}`);
  }

  return (
    <div className="shell max-w-md py-20 text-center">
      <p className="eyebrow">Miyenka</p>
      <h1 className="display-md mt-4">Find your order</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        Enter the email address you used at checkout to view order{' '}
        <span className="text-ink">{orderNumber}</span>.
      </p>

      <form onSubmit={onSubmit} className="mt-8">
        <label htmlFor="order-email" className="sr-only">
          Email address
        </label>
        <input
          id="order-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full border border-ink/15 bg-transparent px-4 py-3 text-sm focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          className="mt-4 w-full bg-ink py-4 text-[0.72rem] uppercase tracking-luxe text-cream transition-colors duration-500 hover:bg-ink-soft"
        >
          View order
        </button>
      </form>

      {submitted ? (
        <p className="mt-6 text-xs text-ink-faint">
          If that order number and email match an order, it will appear here.
        </p>
      ) : null}
    </div>
  );
}
