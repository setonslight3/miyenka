import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/product/ProductCard';
import { getCollection, listProducts } from '@/lib/commerce/catalogue';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) return { title: 'Not found' };

  return {
    title: collection.name,
    description: collection.description ?? collection.tagline ?? undefined,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      title: `${collection.name} · Miyenka`,
      description: collection.description ?? undefined,
      images: collection.hero_image_url ? [{ url: collection.hero_image_url }] : undefined,
    },
  };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) notFound();

  const products = await listProducts({ collection: slug, sort: 'featured' });

  return (
    <>
      <header className="relative isolate min-h-[52svh] overflow-hidden bg-ink">
        {collection.hero_image_url ? (
          <Image
            src={collection.hero_image_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-70"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 to-ink/25" aria-hidden="true" />

        <div className="shell relative flex min-h-[52svh] flex-col justify-end py-16">
          <p className="eyebrow text-gold-light">Collection</p>
          <h1 className="display-lg mt-4 text-cream">{collection.name}</h1>
          {collection.tagline ? (
            <p className="mt-3 font-display text-xl font-light italic text-cream/75">
              {collection.tagline}
            </p>
          ) : null}
        </div>
      </header>

      <div className="shell py-16 lg:py-20">
        {collection.description ? (
          <p className="mx-auto max-w-2xl text-center text-[0.95rem] leading-relaxed text-ink-muted">
            {collection.description}
          </p>
        ) : null}

        {products.length ? (
          <div className="mt-16 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4 lg:gap-x-8">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
          </div>
        ) : (
          <p className="mt-16 text-center text-sm text-ink-faint">
            Pieces for this collection are being prepared.
          </p>
        )}
      </div>
    </>
  );
}
