'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function TrackOrderForm() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reference = orderNumber.trim().toUpperCase();
    if (!reference) return;
    router.push(`/order/${encodeURIComponent(reference)}?email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-4">
      <label className="block">
        <span className="mb-2 block text-[0.62rem] uppercase tracking-luxe text-ink-faint">
          Order number
        </span>
        <input
          type="text"
          required
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
          placeholder="MY-2601-01234"
          className="w-full border border-ink/15 bg-transparent px-4 py-3 text-sm focus:border-ink focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-[0.62rem] uppercase tracking-luxe text-ink-faint">
          Email address
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full border border-ink/15 bg-transparent px-4 py-3 text-sm focus:border-ink focus:outline-none"
        />
      </label>

      <button
        type="submit"
        className="w-full bg-ink py-4 text-[0.72rem] uppercase tracking-luxe text-cream transition-colors duration-500 hover:bg-ink-soft"
      >
        Find my order
      </button>
    </form>
  );
}
