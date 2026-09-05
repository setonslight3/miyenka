import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductPurchasePanel } from '@/components/product/ProductPurchasePanel';
import { ProductReviews } from '@/components/product/ProductReviews';
import { ProductCard } from '@/components/product/ProductCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import {
  getProduct,
  getProductRating,
  listProducts,
  listPublishedReviews,
  primaryImage,
} from '@/lib/commerce/catalogue';
import { formatMoney, toMajor, type CurrencyCode } from '@/lib/commerce/money';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Not found' };

  const cover = primaryImage(product.images ?? []);
  const description =
    product.description ??
    product.subtitle ??
    `${product.name} from Miyenka — cut and finished by hand.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: 'website',
      title: `${product.name} · Miyenka`,
      description,
      url: `/product/${product.slug}`,
      images: cover ? [{ url: cover.url, alt: cover.alt_text ?? product.name }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product || !product.is_published) notFound();

  const [rating, reviews, related] = await Promise.all([
    getProductRating(product.id),
    listPublishedReviews(product.id),
    listProducts({
      collection: product.collection?.slug,
      limit: 5,
    }),
  ]);

  const cover = primaryImage(product.images ?? []);
  const currency = (product.currency as CurrencyCode) ?? 'NGN';
  const inStock = product.variants.some((v) => v.sizes.some((s) => s.is_active && s.quantity > 0));

  // Structured product data for search results.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? product.subtitle ?? undefined,
    image: (product.images ?? []).map((image) => image.url),
    brand: { '@type': 'Brand', name: 'Miyenka' },
    material: product.fabric ?? undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: currency,
      price: toMajor(product.base_price_minor, currency).toFixed(2),
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `/product/${product.slug}`,
    },
    ...(rating.total > 0 && rating.average
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating.average,
            reviewCount: rating.total,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Serialised from our own database rows, not user-controlled markup.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="shell py-10 lg:py-16">
        <nav aria-label="Breadcrumb" className="mb-8 text-[0.65rem] uppercase tracking-wide text-ink-faint">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/shop" className="hover:text-ink">Shop</Link></li>
            {product.category ? (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href={`/shop?category=${product.category.slug}`} className="hover:text-ink">
                    {product.category.name}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden="true">/</li>
            <li className="text-ink">{product.name}</li>
          </ol>
        </nav>

        <ProductPurchasePanel product={product} />
      </div>

      <ProductReviews
        productId={product.id}
        reviews={reviews}
        average={rating.average}
        total={rating.total}
      />

      {related.filter((item) => item.id !== product.id).length ? (
        <section className="shell py-20">
          <SectionHeading eyebrow="You may also like" title="From the same collection" />
          <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
            {related
              .filter((item) => item.id !== product.id)
              .slice(0, 4)
              .map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
