'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AdminSignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get('error') === 'not-authorized'
      ? 'That account does not have admin access.'
      : null,
  );

  const requested = params.get('next') ?? '/admin';
  const next = requested.startsWith('/admin') ? requested : '/admin';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setWorking(false);
      return;
    }

    // Admin membership is confirmed server-side; a successful password sign-in
    // alone grants nothing.
    const { data: isAdmin } = await supabase.rpc('is_active_admin');
    if (!isAdmin) {
      await supabase.auth.signOut();
      setError('That account does not have admin access.');
      setWorking(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-2 block text-[0.62rem] uppercase tracking-luxe text-ink-faint">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-[0.62rem] uppercase tracking-luxe text-ink-faint">Password</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </label>

      {error ? (
        <p role="alert" className="border border-burgundy/30 bg-burgundy/5 p-3 text-xs text-burgundy">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={working}
        className="w-full bg-ink py-3.5 text-[0.7rem] uppercase tracking-luxe text-cream transition-colors hover:bg-ink-soft disabled:opacity-40"
      >
        {working ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

const inputClass =
  'w-full border border-ink/15 bg-transparent px-4 py-3 text-sm focus:border-ink focus:outline-none';
