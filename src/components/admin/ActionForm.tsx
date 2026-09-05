'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/lib/admin/actions';
import { cn } from '@/lib/utils/cn';

/**
 * Wraps a Server Action in a form that surfaces its result inline, so an admin
 * always sees whether a change actually landed.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
  confirm,
  variant = 'primary',
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  submitLabel: string;
  className?: string;
  confirm?: string;
  variant?: 'primary' | 'quiet' | 'danger';
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirm && !window.confirm(confirm)) return;

    const formData = new FormData(event.currentTarget);
    const outcome = await action(formData);
    setResult(outcome);
    if (outcome.ok) startTransition(() => router.refresh());
  }

  const buttonClass = {
    primary: 'bg-ink text-cream hover:bg-ink-soft',
    quiet: 'border border-ink/20 text-ink hover:border-ink',
    danger: 'border border-burgundy text-burgundy hover:bg-burgundy hover:text-cream',
  }[variant];

  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          'px-5 py-2 text-[0.65rem] uppercase tracking-luxe transition-colors disabled:opacity-40',
          buttonClass,
        )}
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
      {result ? (
        <p
          aria-live="polite"
          className={cn('mt-2 text-xs', result.ok ? 'text-gold-deep' : 'text-burgundy')}
        >
          {result.message}
        </p>
      ) : null}
    </form>
  );
}

export const adminInput =
  'w-full border border-ink/15 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none';

export function AdminField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[0.58rem] uppercase tracking-luxe text-ink-faint">
        {label}
      </span>
      {children}
    </label>
  );
}
