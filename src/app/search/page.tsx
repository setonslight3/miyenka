import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import { SearchField } from '@/components/shop/SearchField';
import { listProducts } from '@/lib/commerce/catalogue';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search the Miyenka collection.',
  alternates: { canonical: '/search' },
  robots: { index: false, follow: true },
};

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? '';
  const products = query ? await listProducts({ search: query, sort: 'featured' }) : [];

  return (
    <div className="shell py-14 lg:py-20">
      <header className="mx-auto max-w-xl text-center">
        <p className="eyebrow">Find your piece</p>
        <h1 className="display-lg mt-4">Search</h1>
        <Suspense fallback={null}>
          <SearchField className="mt-10" />
        </Suspense>
      </header>

      {query ? (
        <div className="mt-16">
          <p className="mb-10 text-center text-xs text-ink-faint">
            {products.length} {products.length === 1 ? 'result' : 'results'} for “{query}”
          </p>

          {products.length ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4 lg:gap-x-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-ink-muted">
              Nothing matched that search. Try a silhouette, a colour, or a collection name.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
