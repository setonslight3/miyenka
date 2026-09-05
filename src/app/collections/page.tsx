import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { listCollections } from '@/lib/commerce/catalogue';

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Modern Muse and Classic Sophisticate — the two houses of the Miyenka atelier.',
  alternates: { canonical: '/collections' },
};

export default async function CollectionsPage() {
  const collections = await listCollections();

  return (
    <div className="shell py-14 lg:py-20">
      <header className="mb-16 text-center">
        <p className="eyebrow">The Atelier</p>
        <h1 className="display-lg mt-4">Collections</h1>
        <span className="rule-gold mx-auto mt-6 block" />
      </header>

      <div className="grid gap-10 md:grid-cols-2 lg:gap-14">
        {collections.map((collection) => (
          <Link key={collection.id} href={`/collections/${collection.slug}`} className="group block">
            <div className="relative aspect-[4/5] overflow-hidden bg-cream-deep">
              {collection.hero_image_url ? (
                <Image
                  src={collection.hero_image_url}
                  alt={collection.name}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-[1400ms] ease-silk group-hover:scale-105"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 p-8">
                <h2 className="font-display text-3xl font-light text-cream">{collection.name}</h2>
                {collection.tagline ? (
                  <p className="mt-1.5 text-sm text-cream/70">{collection.tagline}</p>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
