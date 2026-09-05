import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FilterRail } from '@/components/shop/FilterRail';
import { ProductCard } from '@/components/product/ProductCard';
import { listCategories, listCollections, listColors, listProducts } from '@/lib/commerce/catalogue';

export const metadata: Metadata = {
  title: 'Shop All Dresses',
  description:
    'The complete Miyenka collection — mini, midi, maxi and statement gowns, ready-to-wear and made to order.',
  alternates: { canonical: '/shop' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const filters = {
    collection: first(params.collection),
    category: first(params.category),
    size: first(params.size),
    color: first(params.color),
    minPriceMinor: params.min ? Number(first(params.min)) : undefined,
    maxPriceMinor: params.max ? Number(first(params.max)) : undefined,
    orderType: first(params.type) as 'ready_to_wear' | 'custom' | undefined,
    search: first(params.q),
    sort: (first(params.sort) as 'newest' | 'price-asc' | 'price-desc' | 'featured') ?? 'featured',
  };

  const [products, collections, categories, colors] = await Promise.all([
    listProducts(filters),
    listCollections(),
    listCategories(),
    listColors(),
  ]);

  return (
    <div className="shell py-14 lg:py-20">
      <header className="mb-12 text-center">
        <p className="eyebrow">The Atelier</p>
        <h1 className="display-lg mt-4">All Dresses</h1>
        <span className="rule-gold mx-auto mt-6 block" />
      </header>

      <div className="grid gap-12 lg:grid-cols-[16rem_1fr] lg:gap-16">
        <Suspense fallback={<div className="hidden lg:block" />}>
          <FilterRail
            collections={collections.map((c) => ({ slug: c.slug, name: c.name }))}
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
            colors={colors}
            resultCount={products.length}
          />
        </Suspense>

        <div>
          <p className="mb-8 hidden text-xs text-ink-faint lg:block">
            {products.length} {products.length === 1 ? 'piece' : 'pieces'}
          </p>

          {products.length ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 xl:grid-cols-3 lg:gap-x-8">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 3} />
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
              <p className="font-display text-3xl font-light text-ink-muted">Nothing matches yet</p>
              <p className="mt-3 text-sm text-ink-faint">
                Try widening your filters, or commission the piece you have in mind.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
