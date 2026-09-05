import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="shell flex min-h-[60svh] max-w-md flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">Miyenka</p>
      <h1 className="display-lg mt-4">Not found</h1>
      <span className="rule-gold mt-6 block" />
      <p className="mt-6 text-sm leading-relaxed text-ink-muted">
        The page you are looking for has moved, or the piece is no longer available.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link
          href="/shop"
          className="border border-ink px-8 py-3.5 text-[0.7rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream"
        >
          Explore the collection
        </Link>
        <Link
          href="/contact"
          className="border border-ink/20 px-8 py-3.5 text-[0.7rem] uppercase tracking-luxe transition-colors duration-500 hover:border-ink"
        >
          Contact client care
        </Link>
      </div>
    </div>
  );
}
