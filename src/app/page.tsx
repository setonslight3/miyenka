import Link from 'next/link';
import type { Metadata } from 'next';
import { Hero } from '@/components/home/Hero';
import { CollectionFeature } from '@/components/home/CollectionFeature';
import { ArtistryInMotion } from '@/components/home/ArtistryInMotion';
import { EditorialFeature } from '@/components/home/EditorialFeature';
import { Testimonials } from '@/components/home/Testimonials';
import { ProductCard } from '@/components/product/ProductCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { getCollection, listProducts } from '@/lib/commerce/catalogue';
import { getPublicSettings } from '@/lib/commerce/settings';

export const metadata: Metadata = {
  title: 'Miyenka — Luxury Dresses & Statement Gowns',
  description:
    'Mini, midi, maxi and statement gowns, cut and finished by hand. Ready-to-wear and bespoke, from the Miyenka atelier.',
  alternates: { canonical: '/' },
};

// Catalogue content changes rarely; revalidate hourly rather than per request.
export const revalidate = 3600;

export default async function HomePage() {
  const [settings, featured, modernMuse, classicSophisticate] = await Promise.all([
    getPublicSettings(),
    listProducts({ sort: 'featured', limit: 8 }),
    getCollection('modern-muse'),
    getCollection('classic-sophisticate'),
  ]);

  return (
    <>
      <Hero settings={settings.homepage} />

      {modernMuse ? (
        <CollectionFeature
          eyebrow="The Collections"
          title={modernMuse.name}
          description={modernMuse.description ?? ''}
          imageUrl={modernMuse.hero_image_url ?? '/lookbook/heart-butterfly-coat-salon.png'}
          imageAlt={`${modernMuse.name} — ${modernMuse.tagline ?? 'Miyenka'}`}
          href={`/collections/${modernMuse.slug}`}
        />
      ) : null}

      {classicSophisticate ? (
        <CollectionFeature
          eyebrow="The Collections"
          title={classicSophisticate.name}
          description={classicSophisticate.description ?? ''}
          imageUrl={classicSophisticate.hero_image_url ?? '/lookbook/gilded-tassel-gown-studio.jpg'}
          imageAlt={`${classicSophisticate.name} — ${classicSophisticate.tagline ?? 'Miyenka'}`}
          href={`/collections/${classicSophisticate.slug}`}
          reverse
        />
      ) : null}

      <ArtistryInMotion />
      <EditorialFeature />

      <section className="shell py-24 lg:py-32">
        <SectionHeading
          eyebrow="The Atelier"
          title="Explore All Designs"
          description="Every piece is cut, constructed and finished by hand — available ready-to-wear or made entirely to your measurements."
        />

        {featured.length ? (
          <>
            <div className="mt-16 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4 lg:gap-x-8">
              {featured.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 4} />
              ))}
            </div>

            <div className="mt-16 text-center">
              <Link
                href="/shop"
                className="inline-block border border-ink px-12 py-4 text-[0.72rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream"
              >
                View all dresses
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-12 text-center text-sm text-ink-faint">
            The collection is being prepared. Please check back shortly.
          </p>
        )}
      </section>

      <Testimonials />
    </>
  );
}
