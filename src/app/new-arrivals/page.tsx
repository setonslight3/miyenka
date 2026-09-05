import type { Metadata } from 'next';
import { ProductCard } from '@/components/product/ProductCard';
import { listProducts } from '@/lib/commerce/catalogue';

export const metadata: Metadata = {
  title: 'New Arrivals',
  description: 'The most recent pieces to leave the Miyenka atelier.',
  alternates: { canonical: '/new-arrivals' },
};

export default async function NewArrivalsPage() {
  const products = await listProducts({ sort: 'newest', limit: 24 });

  return (
    <div className="shell py-14 lg:py-20">
      <header className="mb-16 text-center">
        <p className="eyebrow">Fresh from the workroom</p>
        <h1 className="display-lg mt-4">New Arrivals</h1>
        <span className="rule-gold mx-auto mt-6 block" />
      </header>

      {products.length ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4 lg:gap-x-8">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-ink-faint">No new pieces just yet.</p>
      )}
    </div>
  );
}
