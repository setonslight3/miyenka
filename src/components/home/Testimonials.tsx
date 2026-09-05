import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SectionHeading } from '@/components/ui/SectionHeading';

/**
 * Curated testimonials drawn from real reviews.
 *
 * Only admin-published reviews from verified purchases are eligible, so this
 * section stays empty until genuine ones exist rather than showing invented
 * praise.
 */
export async function Testimonials() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('reviews')
    .select(`
      id, rating, title, body, created_at,
      product:products (name, slug),
      media:review_media (url)
    `)
    .eq('status', 'published')
    .gte('rating', 4)
    .order('created_at', { ascending: false })
    .limit(3);

  const testimonials = data ?? [];
  if (!testimonials.length) return null;

  return (
    <section className="shell py-24 lg:py-32">
      <SectionHeading eyebrow="In Her Words" title="Worn by our clients" />

      <ul className="mt-16 grid gap-10 md:grid-cols-3">
        {testimonials.map((review) => {
          const photo = review.media?.[0]?.url ?? null;
          const product = Array.isArray(review.product) ? review.product[0] : review.product;

          return (
            <li key={review.id} className="flex flex-col">
              {photo ? (
                <div className="relative mb-6 aspect-[3/4] overflow-hidden bg-cream-deep">
                  <Image
                    src={photo}
                    alt={product ? `A client wearing the ${product.name}` : 'A Miyenka client'}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : null}

              <Stars rating={review.rating} />

              {review.title ? (
                <h3 className="mt-4 font-display text-xl font-light">{review.title}</h3>
              ) : null}

              {review.body ? (
                <blockquote className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-ink-muted">
                  “{review.body}”
                </blockquote>
              ) : null}

              {product ? (
                <Link
                  href={`/product/${product.slug}`}
                  className="mt-5 text-[0.65rem] uppercase tracking-luxe text-ink-faint transition-colors hover:text-gold-deep"
                >
                  {product.name}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <svg
          key={value}
          width="13"
          height="13"
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
