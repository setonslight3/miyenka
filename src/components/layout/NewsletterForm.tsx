'use client';

import { useState } from 'react';

type State = { status: 'idle' | 'submitting' | 'done' | 'error'; message?: string };

export function NewsletterForm({ source = 'footer' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: 'submitting' });

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setState({ status: 'error', message: payload.error ?? 'Something went wrong.' });
        return;
      }
      setEmail('');
      setState({ status: 'done', message: 'Welcome to the house.' });
    } catch {
      setState({ status: 'error', message: 'Network error. Please try again.' });
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email address"
          className="flex-1 border-b border-cream/25 bg-transparent px-1 py-3 text-sm text-cream placeholder:text-cream/35 focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          disabled={state.status === 'submitting'}
          className="border border-gold px-8 py-3 text-[0.68rem] uppercase tracking-luxe text-gold transition-colors duration-500 hover:bg-gold hover:text-ink disabled:opacity-50"
        >
          {state.status === 'submitting' ? 'Joining…' : 'Subscribe'}
        </button>
      </div>
      <p
        aria-live="polite"
        className={`mt-3 min-h-5 text-xs ${state.status === 'error' ? 'text-burgundy-bright' : 'text-gold'}`}
      >
        {state.message ?? ''}
      </p>
    </form>
  );
}
