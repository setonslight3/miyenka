'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

export type ReviewableItem = {
  order_item_id: string;
  order_number: string;
  product_name: string;
  product_slug: string | null;
  image_url: string | null;
  delivered_at: string | null;
};

export function ReviewableList({ items }: { items: ReviewableItem[] }) {
  if (!items.length) {
    return (
      <p className="text-sm text-ink-faint">
        Nothing to review just yet. Reviews open once a piece has been delivered.
      </p>
    );
  }

  return (
    <ul className="space-y-5">
      {items.map((item) => (
        <ReviewCard key={item.order_item_id} item={item} />
      ))}
    </ul>
  );
}

function ReviewCard({ item }: { item: ReviewableItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function uploadPhotos(): Promise<string[]> {
    if (!files.length) return [];

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Your session has expired.');

    const paths: string[] = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\-]/g, '_').slice(-80);
      const path = `${user.id}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from('review-media')
        .upload(path, file, { contentType: file.type });
      if (error) throw new Error(`Could not upload ${file.name}: ${error.message}`);
      paths.push(path);
    }
    return paths;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setMessage(null);

    try {
      const mediaPaths = await uploadPhotos();

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: item.order_item_id,
          rating,
          title: title || undefined,
          body: body || undefined,
          mediaPaths: mediaPaths.length ? mediaPaths : undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(payload.error ?? 'We could not save your review.');
        return;
      }

      setStatus('done');
      setMessage(payload.message);
      router.refresh();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Something went wrong.');
    }
  }

  if (status === 'done') {
    return (
      <li className="border border-gold/40 bg-blush-soft/25 p-6">
        <p className="font-display text-lg">Thank you</p>
        <p className="mt-1.5 text-sm text-ink-muted">{message}</p>
      </li>
    );
  }

  return (
    <li className="border border-ink/10 p-6">
      <div className="flex gap-4">
        <div className="relative h-24 w-18 shrink-0 overflow-hidden bg-cream-deep" style={{ width: '4.5rem' }}>
          {item.image_url ? (
            <Image src={item.image_url} alt={item.product_name} fill sizes="72px" className="object-cover" />
          ) : null}
        </div>

        <div className="flex-1">
          {item.product_slug ? (
            <Link href={`/product/${item.product_slug}`} className="font-display text-xl font-light hover:text-gold-deep">
              {item.product_name}
            </Link>
          ) : (
            <p className="font-display text-xl font-light">{item.product_name}</p>
          )}
          <p className="mt-1 text-xs text-ink-faint">Order {item.order_number}</p>

          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 border border-ink px-6 py-2.5 text-[0.65rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream"
            >
              Write a review
            </button>
          ) : null}
        </div>
      </div>

      {open ? (
        <form onSubmit={submit} className="mt-6 space-y-4 border-t border-ink/10 pt-6">
          <fieldset>
            <legend className="mb-2 text-[0.62rem] uppercase tracking-luxe text-ink-faint">Rating</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`${value} star${value === 1 ? '' : 's'}`}
                  aria-pressed={rating === value}
                  className="p-1"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill={value <= rating ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="1.2"
                    aria-hidden="true"
                    className={cn('text-gold transition-transform', value <= rating && 'scale-105')}
                  >
                    <path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8L12 3Z" />
                  </svg>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-2 block text-[0.62rem] uppercase tracking-luxe text-ink-faint">
              Title (optional)
            </span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[0.62rem] uppercase tracking-luxe text-ink-faint">
              Your review
            </span>
            <textarea
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="How did it fit? How did it feel to wear?"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[0.62rem] uppercase tracking-luxe text-ink-faint">
              Photos (optional)
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 4))}
              className="block w-full text-sm text-ink-muted file:mr-4 file:border file:border-ink/20 file:bg-transparent file:px-5 file:py-2.5 file:text-[0.65rem] file:uppercase file:tracking-luxe hover:file:border-ink"
            />
          </label>

          {message ? (
            <p role="alert" className="text-xs text-burgundy">
              {message}
            </p>
          ) : null}

          <p className="text-[0.65rem] leading-relaxed text-ink-faint">
            Reviews are read by our team before they appear on the site.
          </p>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={status === 'saving'}
              className="bg-ink px-8 py-3 text-[0.68rem] uppercase tracking-luxe text-cream transition-colors duration-500 hover:bg-ink-soft disabled:opacity-40"
            >
              {status === 'saving' ? 'Sending…' : 'Submit review'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-6 py-3 text-[0.68rem] uppercase tracking-luxe text-ink-faint hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

const inputClass =
  'w-full border border-ink/15 bg-transparent px-4 py-3 text-sm transition-colors focus:border-ink focus:outline-none';
