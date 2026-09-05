'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'sign-in' | 'sign-up';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get('next') ?? '/account';
  // Never follow an absolute URL supplied in the query string.
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState<'idle' | 'working' | 'check-email'>('idle');
  const [error, setError] = useState<string | null>(params.get('error') ? 'Please sign in again.' : null);

  async function withGoogle() {
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) setError(oauthError.message);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('working');
    setError(null);

    const supabase = createClient();

    if (mode === 'sign-up') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setStatus('idle');
        return;
      }
      setStatus('check-email');
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setStatus('idle');
      return;
    }

    router.push(next);
    router.refresh();
  }

  if (status === 'check-email') {
    return (
      <div className="mt-10 border border-gold/40 bg-blush-soft/30 p-8 text-center">
        <p className="font-display text-2xl font-light">Check your email</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          We have sent a confirmation link to {email}. Open it to finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <button
        type="button"
        onClick={withGoogle}
        className="flex w-full items-center justify-center gap-3 border border-ink/20 py-3.5 text-sm transition-colors duration-300 hover:border-ink"
      >
        <GoogleMark />
        Continue with Google
      </button>

      <div className="my-7 flex items-center gap-4">
        <span className="h-px flex-1 bg-ink/10" />
        <span className="text-[0.62rem] uppercase tracking-luxe text-ink-faint">or</span>
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === 'sign-up' ? (
          <label className="block">
            <span className="mb-2 block text-[0.62rem] uppercase tracking-luxe text-ink-faint">
              Full name
            </span>
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={inputClass}
            />
          </label>
        ) : null}

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
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[0.62rem] uppercase tracking-luxe text-ink-faint">
            Password
          </span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
          {mode === 'sign-up' ? (
            <span className="mt-1.5 block text-[0.65rem] text-ink-faint">At least 8 characters.</span>
          ) : null}
        </label>

        {error ? (
          <p role="alert" className="border border-burgundy/30 bg-burgundy/5 p-3 text-xs text-burgundy">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={status === 'working'}
          className="w-full bg-ink py-4 text-[0.72rem] uppercase tracking-luxe text-cream transition-colors duration-500 hover:bg-ink-soft disabled:opacity-40"
        >
          {status === 'working'
            ? 'One moment…'
            : mode === 'sign-up'
              ? 'Create account'
              : 'Sign in'}
        </button>
      </form>

      <p className="mt-7 text-center text-xs text-ink-muted">
        {mode === 'sign-up' ? (
          <>
            Already have an account?{' '}
            <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="underline underline-offset-4 hover:text-ink">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Miyenka?{' '}
            <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className="underline underline-offset-4 hover:text-ink">
              Create an account
            </Link>
          </>
        )}
      </p>

      <p className="mt-4 text-center text-[0.65rem] text-ink-faint">
        You never need an account to place an order.
      </p>
    </div>
  );
}

const inputClass =
  'w-full border border-ink/15 bg-transparent px-4 py-3 text-sm transition-colors focus:border-ink focus:outline-none';

const GoogleMark = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8Z" />
    <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.6 1.1-2.8 0-5.2-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M6 14.3a6.6 6.6 0 0 1 0-4.2V7.3H2.3a11 11 0 0 0 0 9.8L6 14.3Z" />
    <path fill="#EA4335" d="M12 5.5c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.3L6 10.1c.8-2.5 3.2-4.6 6-4.6Z" />
  </svg>
);
