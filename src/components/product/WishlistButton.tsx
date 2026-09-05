'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

/**
 * Wishlist state lives in the database under RLS, so it follows the customer
 * across devices. A signed-out visitor is sent to sign-in rather than being
 * given a local list that would silently vanish.
 */
export function WishlistButton({
  productId,
  productName,
  className,
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;

      setSignedIn(Boolean(user));
      if (!user) return;

      const { data } = await supabase
        .from('wishlists')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (active) setSaved(Boolean(data));
    })();

    return () => {
      active = false;
    };
  }, [productId]);

  async function toggle() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // Optimistic: revert if the write fails.
    const next = !saved;
    setSaved(next);

    const { error } = next
      ? await supabase.from('wishlists').insert({ user_id: user.id, product_id: productId })
      : await supabase.from('wishlists').delete().eq('user_id', user.id).eq('product_id', productId);

    if (error) {
      setSaved(!next);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || signedIn === null}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full bg-cream/85 backdrop-blur-sm transition-all duration-300',
        'hover:bg-cream disabled:opacity-50',
        className,
      )}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.4"
        aria-hidden="true"
        className={saved ? 'text-burgundy' : 'text-ink-muted'}
      >
        <path d="M20.8 8.6a4.6 4.6 0 0 0-7.8-2.5L12 7.1l-1-1A4.6 4.6 0 0 0 3.2 8.6c0 4.1 5.6 7.9 8.8 10.6 3.2-2.7 8.8-6.5 8.8-10.6Z" />
      </svg>
    </button>
  );
}
