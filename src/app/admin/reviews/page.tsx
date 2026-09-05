import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ActionForm, AdminField, adminInput } from '@/components/admin/ActionForm';
import { moderateReview } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Reviews', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'pending', label: 'Awaiting moderation' },
  { key: 'published', label: 'Published' },
  { key: 'rejected', label: 'Rejected' },
];

export default async function AdminReviews({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = (Array.isArray(params.status) ? params.status[0] : params.status) ?? 'pending';

  const supabase = createAdminClient();
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      product:products (name, slug),
      media:review_media (id, url),
      author:profiles (full_name, email)
    `)
    .eq('status', status as never)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-light">Reviews</h1>
        <p className="mt-1 text-sm text-ink-faint">
          Only reviews you publish appear on the storefront.
        </p>
      </header>

      <nav aria-label="Filter reviews" className="flex gap-5 border-b border-ink/10 pb-3">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/reviews?status=${tab.key}`}
            className={`text-xs transition-colors ${status === tab.key ? 'text-ink' : 'text-ink-faint hover:text-ink'}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {reviews?.length ? (
        <ul className="space-y-6">
          {reviews.map((review) => {
            const product = Array.isArray(review.product) ? review.product[0] : review.product;
            const author = Array.isArray(review.author) ? review.author[0] : review.author;

            return (
              <li key={review.id} className="border border-ink/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Stars rating={review.rating} />
                      <span className="text-xs text-ink-faint">
                        {new Date(review.created_at).toLocaleDateString('en-GB')}
                      </span>
                    </div>

                    {product ? (
                      <Link href={`/product/${product.slug}`} className="mt-2 block text-sm hover:text-gold-deep">
                        {product.name}
                      </Link>
                    ) : null}

                    {review.title ? (
                      <p className="mt-1 font-display text-lg font-light">{review.title}</p>
                    ) : null}
                    {review.body ? (
                      <p className="mt-1 text-sm text-ink-muted">{review.body}</p>
                    ) : null}

                    <p className="mt-2 text-xs text-ink-faint">
                      {author?.full_name ?? author?.email ?? 'Verified customer'} · verified purchase
                    </p>

                    {review.media?.length ? (
                      <ul className="mt-3 flex gap-2">
                        {review.media.map((item) => (
                          <li key={item.id} className="relative h-20 w-16 overflow-hidden bg-cream-deep">
                            <Image src={item.url} alt="" fill sizes="64px" className="object-cover" />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <div className="w-full max-w-xs space-y-3">
                    <ActionForm action={moderateReview} submitLabel="Publish" className="space-y-2">
                      <input type="hidden" name="reviewId" value={review.id} />
                      <input type="hidden" name="decision" value="published" />
                      <AdminField label="Reply from the atelier (optional)">
                        <textarea
                          name="adminResponse"
                          rows={2}
                          defaultValue={review.admin_response ?? ''}
                          className={adminInput}
                        />
                      </AdminField>
                    </ActionForm>

                    {status !== 'rejected' ? (
                      <ActionForm
                        action={moderateReview}
                        submitLabel="Reject"
                        variant="danger"
                        confirm="Reject this review? It will not appear on the storefront."
                      >
                        <input type="hidden" name="reviewId" value={review.id} />
                        <input type="hidden" name="decision" value="rejected" />
                      </ActionForm>
                    ) : (
                      <ActionForm action={moderateReview} submitLabel="Return to pending" variant="quiet">
                        <input type="hidden" name="reviewId" value={review.id} />
                        <input type="hidden" name="decision" value="pending" />
                      </ActionForm>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-faint">Nothing here.</p>
      )}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <svg
          key={value}
          width="12"
          height="12"
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
    </span>
  );
}
