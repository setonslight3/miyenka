'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest correlates this render with the server log without exposing
    // the underlying error to the visitor.
    console.error('Unhandled error', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="shell flex min-h-[60svh] max-w-md flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">Miyenka</p>
      <h1 className="display-md mt-4">Something went wrong</h1>
      <p className="mt-5 text-sm leading-relaxed text-ink-muted">
        We could not load this page. Please try again — if it persists, client care can help.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="border border-ink px-8 py-3.5 text-[0.7rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border border-ink/20 px-8 py-3.5 text-[0.7rem] uppercase tracking-luxe transition-colors duration-500 hover:border-ink"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
