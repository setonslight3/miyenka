import type { Metadata } from 'next';
import Link from 'next/link';
import { ReviewableList } from '@/components/product/ReviewableList';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Your Reviews', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AccountReviews() {
  const supabase = await createClient();

  const [{ data: reviewable }, { data: submitted }] = await Promise.all([
    supabase.rpc('reviewable_items'),
    supabase
      .from('reviews')
      .select('id, rating, title, body, status, created_at, product:products (name, slug)')
      .order('created_at', { ascending: false }),
  ]);

  const pending = Array.isArray(reviewable) ? reviewable : [];

  return (
    <div className="space-y-14">
      <section>
        <h2 className="eyebrow mb-2">Awaiting your review</h2>
        <p className="mb-6 text-xs text-ink-faint">
          Pieces you have purchased and received. Each can be reviewed once.
        </p>
        <ReviewableList items={pending} />
      </section>

      <section>
        <h2 className="eyebrow mb-6">Your reviews</h2>
        {submitted?.length ? (
          <ul className="divide-y divide-ink/10 border-y border-ink/10">
            {submitted.map((review) => {
              const product = Array.isArray(review.product) ? review.product[0] : review.product;
              return (
                <li key={review.id} className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      {product ? (
                        <Link href={`/product/${product.slug}`} className="text-sm hover:text-gold-deep">
                          {product.name}
                        </Link>
                      ) : null}
                      {review.title ? (
                        <p className="mt-1 font-display text-lg font-light">{review.title}</p>
                      ) : null}
                      {review.body ? (
                        <p className="mt-1 text-sm text-ink-muted">{review.body}</p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 border px-2.5 py-1 text-[0.6rem] uppercase tracking-wide ${
                        review.status === 'published'
                          ? 'border-gold/50 text-gold-deep'
                          : review.status === 'rejected'
                            ? 'border-burgundy/40 text-burgundy'
                            : 'border-ink/20 text-ink-faint'
                      }`}
                    >
                      {review.status === 'pending' ? 'In moderation' : review.status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-faint">You have not written a review yet.</p>
        )}
      </section>
    </div>
  );
}
