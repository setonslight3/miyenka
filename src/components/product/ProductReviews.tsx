import Image from 'next/image';
import type { Tables } from '@/lib/supabase/database.types';

type ReviewWithMedia = Tables<'reviews'> & { media?: Pick<Tables<'review_media'>, 'id' | 'url'>[] };

/**
 * Published reviews only. Eligibility (paid + delivered + not already
 * reviewed) is enforced in the database, and every review is admin-published
 * before it appears here.
 */
export function ProductReviews({
  reviews,
  average,
  total,
}: {
  productId: string;
  reviews: ReviewWithMedia[];
  average: number | null;
  total: number;
}) {
  return (
    <section className="border-t border-ink/10 bg-cream-deep/40">
      <div className="shell py-20">
        <div className="grid gap-12 lg:grid-cols-[18rem_1fr] lg:gap-20">
          <header className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">Client Reviews</p>
            {total > 0 && average ? (
              <>
                <p className="mt-4 font-display text-5xl font-light">{average.toFixed(1)}</p>
                <Stars rating={Math.round(average)} />
                <p className="mt-3 text-xs text-ink-faint">
                  Based on {total} verified {total === 1 ? 'purchase' : 'purchases'}
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">No reviews yet.</p>
            )}
            <p className="mt-6 text-xs leading-relaxed text-ink-faint">
              Only clients who have purchased and received this piece can review it.
            </p>
          </header>

          <div>
            {reviews.length ? (
              <ul className="space-y-10">
                {reviews.map((review) => (
                  <li key={review.id} className="border-b border-ink/10 pb-10 last:border-0">
                    <Stars rating={review.rating} />
                    {review.title ? (
                      <h3 className="mt-3 font-display text-xl font-light">{review.title}</h3>
                    ) : null}
                    {review.body ? (
                      <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">{review.body}</p>
                    ) : null}

                    {review.media?.length ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {review.media.map((item) => (
                          <div key={item.id} className="relative h-28 w-24 overflow-hidden bg-cream-deep">
                            <Image
                              src={item.url}
                              alt="Client photograph of this piece"
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-[0.62rem] uppercase tracking-wide text-ink-faint">
                      <span className="border border-gold/50 px-2 py-0.5 text-gold-deep">
                        Verified purchase
                      </span>
                      <time dateTime={review.created_at}>
                        {new Date(review.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </time>
                    </div>

                    {review.admin_response ? (
                      <div className="mt-5 border-l-2 border-gold/50 pl-5">
                        <p className="text-[0.62rem] uppercase tracking-luxe text-gold-deep">
                          From the atelier
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                          {review.admin_response}
                        </p>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-faint">
                This piece has not been reviewed yet. Reviews appear here once a client who has
                received it shares their experience.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <svg
          key={value}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={value <= rating ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
          className="text-gold"
        >
          <path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8L12 3Z" />
        </svg>
      ))}
    </div>
  );
}
