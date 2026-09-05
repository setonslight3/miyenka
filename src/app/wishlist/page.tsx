import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ProductCard } from '@/components/product/ProductCard';
import { createClient } from '@/lib/supabase/server';
import type { ProductSummary } from '@/lib/commerce/catalogue.shared';

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false, follow: true } };
export const dynamic = 'force-dynamic';

export default async function WishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/wishlist');

  // RLS scopes this to the signed-in customer's own saved pieces.
  const { data } = await supabase
    .from('wishlists')
    .select(`
      id,
      product:products (
        id, slug, name, subtitle, base_price_minor, compare_at_price_minor, currency, is_published,
        category:categories (slug, name),
        collection:collections (slug, name),
        images:product_images (id, url, alt_text, position, is_primary, variant_id, product_id, created_at)
      )
    `)
    .order('created_at', { ascending: false });

  const products = (data ?? [])
    .map((row) => (Array.isArray(row.product) ? row.product[0] : row.product))
    .filter((product): product is NonNullable<typeof product> => Boolean(product?.is_published))
    .map((product) => product as unknown as ProductSummary);

  return (
    <div className="shell py-14 lg:py-20">
      <header className="mb-12 text-center">
        <p className="eyebrow">Saved for later</p>
        <h1 className="display-lg mt-4">Your Wishlist</h1>
        <span className="rule-gold mx-auto mt-6 block" />
      </header>

      {products.length ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4 lg:gap-x-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="font-display text-2xl font-light text-ink-muted">Nothing saved yet</p>
          <p className="mt-3 text-sm text-ink-faint">
            Tap the heart on any piece to keep it here.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-block border border-ink px-10 py-4 text-[0.72rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream"
          >
            Explore the collection
          </Link>
        </div>
      )}
    </div>
  );
}
