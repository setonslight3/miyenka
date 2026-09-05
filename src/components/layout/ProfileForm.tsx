'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function ProfileForm({
  initial,
}: {
  initial: { fullName: string; phone: string; email: string; marketingOptIn: boolean };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setMessage(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus('error');
      setMessage('Your session has expired. Please sign in again.');
      return;
    }

    // RLS restricts this update to the caller's own profile row.
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.fullName || null,
        phone: form.phone || null,
        marketing_opt_in: form.marketingOptIn,
      })
      .eq('id', user.id);

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    setStatus('saved');
    setMessage('Your details have been saved.');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="mb-2 block text-[0.62rem] uppercase tracking-luxe text-ink-faint">
          Email address
        </span>
        <input type="email" value={form.email} disabled className={`${inputClass} opacity-60`} />
        <span className="mt-1.5 block text-[0.65rem] text-ink-faint">
          Contact client care to change the email on your account.
        </span>
      </label>

      <label className="block">
        <span className="mb-2 block text-[0.62rem] uppercase tracking-luxe text-ink-faint">
          Full name
        </span>
        <input
          type="text"
          autoComplete="name"
          value={form.fullName}
          onChange={(event) => setForm({ ...form, fullName: event.target.value })}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-[0.62rem] uppercase tracking-luxe text-ink-faint">Phone</span>
        <input
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          className={inputClass}
        />
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={form.marketingOptIn}
          onChange={(event) => setForm({ ...form, marketingOptIn: event.target.checked })}
          className="mt-1"
        />
        <span className="text-sm text-ink-muted">
          Send me the Miyenka Letter — new arrivals, atelier notes and private appointments.
        </span>
      </label>

      {message ? (
        <p
          aria-live="polite"
          className={`text-xs ${status === 'error' ? 'text-burgundy' : 'text-gold-deep'}`}
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'saving'}
        className="border border-ink px-9 py-3.5 text-[0.7rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream disabled:opacity-40"
      >
        {status === 'saving' ? 'Saving…' : 'Save details'}
      </button>
    </form>
  );
}

const inputClass =
  'w-full border border-ink/15 bg-transparent px-4 py-3 text-sm transition-colors focus:border-ink focus:outline-none';
