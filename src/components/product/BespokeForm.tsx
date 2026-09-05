'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cmToInches, inchesToCm } from '@/lib/commerce/sizing';
import { cn } from '@/lib/utils/cn';

type Product = { slug: string; name: string; subtitle: string | null } | null;

const MEASUREMENTS = [
  ['bust', 'Full bust'],
  ['waist', 'Waist'],
  ['hips', 'Hips'],
  ['shoulderToHem', 'Shoulder to hem'],
  ['height', 'Height'],
] as const;

type MeasurementKey = (typeof MEASUREMENTS)[number][0];

export function BespokeForm({
  product,
  signedIn,
  defaultEmail,
}: {
  product: Product;
  signedIn: boolean;
  defaultEmail: string;
}) {
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [values, setValues] = useState<Record<MeasurementKey, string>>({
    bust: '',
    waist: '',
    hips: '',
    shoulderToHem: '',
    height: '',
  });
  const [form, setForm] = useState({
    contactEmail: defaultEmail,
    contactName: '',
    contactPhone: '',
    preferredFabric: '',
    preferredColor: '',
    modificationNotes: '',
    eventDate: '',
  });

  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  /** Switching units converts what is already typed rather than clearing it. */
  function switchUnit(next: 'in' | 'cm') {
    if (next === unit) return;
    setValues((current) => {
      const converted = { ...current };
      for (const key of Object.keys(current) as MeasurementKey[]) {
        const numeric = Number.parseFloat(current[key]);
        if (Number.isFinite(numeric)) {
          converted[key] = String(next === 'cm' ? inchesToCm(numeric) : cmToInches(numeric));
        }
      }
      return converted;
    });
    setUnit(next);
  }

  const toCm = (raw: string): number | null => {
    const numeric = Number.parseFloat(raw);
    if (!Number.isFinite(numeric)) return null;
    return unit === 'cm' ? numeric : inchesToCm(numeric);
  };

  async function uploadReferences(): Promise<string[]> {
    if (!files.length) return [];

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Storage policy only permits writes beneath the uploader's own prefix.
    if (!user) throw new Error('Please sign in to attach reference images.');

    const paths: string[] = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\-]/g, '_').slice(-80);
      const path = `${user.id}/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage
        .from('custom-references')
        .upload(path, file, { upsert: false, contentType: file.type });

      if (error) throw new Error(`Could not upload ${file.name}: ${error.message}`);
      paths.push(path);
    }
    return paths;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage(null);

    try {
      const referencePaths = await uploadReferences();

      const response = await fetch('/api/custom-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug: product?.slug ?? null,
          contactEmail: form.contactEmail,
          contactName: form.contactName || undefined,
          contactPhone: form.contactPhone || undefined,
          bustCm: toCm(values.bust),
          waistCm: toCm(values.waist),
          hipsCm: toCm(values.hips),
          shoulderToHemCm: toCm(values.shoulderToHem),
          heightCm: toCm(values.height),
          preferredFabric: form.preferredFabric || undefined,
          preferredColor: form.preferredColor || undefined,
          modificationNotes: form.modificationNotes || undefined,
          eventDate: form.eventDate || null,
          referencePaths: referencePaths.length ? referencePaths : undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(payload.error ?? 'We could not record your request.');
        return;
      }

      setReference(payload.reference);
      setStatus('done');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Something went wrong.');
    }
  }

  if (status === 'done') {
    return (
      <div className="border border-gold/40 bg-cream p-10 text-center">
        <p className="eyebrow text-gold-deep">Request received</p>
        <h2 className="display-md mt-4">We will be in touch</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
          Your reference is <span className="text-ink">{reference}</span>. We will review your
          request and send a quotation to {form.contactEmail}. Once you accept it, your piece enters
          production.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-ink/10 bg-cream p-8 sm:p-10">
      <header>
        <p className="eyebrow">Bespoke request</p>
        <h2 className="display-md mt-3">
          {product ? `Commission the ${product.name}` : 'Commission a piece'}
        </h2>
        {product?.subtitle ? (
          <p className="mt-2 text-sm text-ink-muted">{product.subtitle}</p>
        ) : null}
      </header>

      <fieldset className="mt-10">
        <legend className="eyebrow mb-5">Your details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email address" required className="sm:col-span-2">
            <input
              type="email"
              required
              autoComplete="email"
              value={form.contactEmail}
              onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Full name">
            <input
              type="text"
              autoComplete="name"
              value={form.contactName}
              onChange={(event) => setForm({ ...form, contactName: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              autoComplete="tel"
              value={form.contactPhone}
              onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <legend className="eyebrow">Measurements</legend>
          <div className="inline-flex border border-ink/15" role="group" aria-label="Measurement unit">
            {(['in', 'cm'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => switchUnit(option)}
                aria-pressed={unit === option}
                className={cn(
                  'px-4 py-1.5 text-[0.62rem] uppercase tracking-wide transition-colors',
                  unit === option ? 'bg-ink text-cream' : 'text-ink-muted hover:text-ink',
                )}
              >
                {option === 'in' ? 'Inches' : 'cm'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {MEASUREMENTS.map(([key, label]) => (
            <Field key={key} label={`${label} (${unit})`}>
              <input
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                value={values[key]}
                onChange={(event) => setValues({ ...values, [key]: event.target.value })}
                className={inputClass}
              />
            </Field>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Not sure how to measure? Our{' '}
          <a href="/sizing" className="underline underline-offset-4 hover:text-ink">
            sizing guide
          </a>{' '}
          walks through each one.
        </p>
      </fieldset>

      <fieldset className="mt-10">
        <legend className="eyebrow mb-5">Your piece</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preferred fabric">
            <input
              type="text"
              value={form.preferredFabric}
              onChange={(event) => setForm({ ...form, preferredFabric: event.target.value })}
              placeholder="Silk crepe, satin, wool crepe…"
              className={inputClass}
            />
          </Field>
          <Field label="Preferred colour">
            <input
              type="text"
              value={form.preferredColor}
              onChange={(event) => setForm({ ...form, preferredColor: event.target.value })}
              placeholder="Ivory, crimson, noir…"
              className={inputClass}
            />
          </Field>
          <Field label="Event date" className="sm:col-span-2">
            <input
              type="date"
              value={form.eventDate}
              onChange={(event) => setForm({ ...form, eventDate: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Modifications and notes" className="sm:col-span-2">
            <textarea
              rows={4}
              value={form.modificationNotes}
              onChange={(event) => setForm({ ...form, modificationNotes: event.target.value })}
              placeholder="Sleeve length, neckline, hem, anything you would like changed…"
              className={inputClass}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-10">
        <legend className="eyebrow mb-3">Reference images</legend>
        {signedIn ? (
          <>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 6))}
              className="block w-full text-sm text-ink-muted file:mr-4 file:border file:border-ink/20 file:bg-transparent file:px-5 file:py-2.5 file:text-[0.65rem] file:uppercase file:tracking-luxe hover:file:border-ink"
            />
            <p className="mt-2 text-xs text-ink-faint">
              Up to six images. These are stored privately and are visible only to you and our
              atelier — they are never published.
            </p>
            {files.length ? (
              <ul className="mt-3 space-y-1 text-xs text-ink-muted">
                {files.map((file) => (
                  <li key={file.name}>{file.name}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="text-xs leading-relaxed text-ink-faint">
            <a href="/sign-in?next=/custom" className="underline underline-offset-4 hover:text-ink">
              Sign in
            </a>{' '}
            to attach reference images. You can still submit your request without them, and send
            references later on WhatsApp.
          </p>
        )}
      </fieldset>

      {message ? (
        <p role="alert" className="mt-8 border border-burgundy/30 bg-burgundy/5 p-4 text-sm text-burgundy">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-10 w-full bg-ink py-4 text-[0.72rem] uppercase tracking-luxe text-cream transition-colors duration-500 hover:bg-ink-soft disabled:opacity-40"
      >
        {status === 'submitting' ? 'Sending your request…' : 'Request a quotation'}
      </button>

      <p className="mt-4 text-center text-[0.65rem] text-ink-faint">
        No payment is taken now. We will send a quotation for you to review first.
      </p>
    </form>
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
