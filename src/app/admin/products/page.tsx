import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ActionForm } from '@/components/admin/ActionForm';
import { setProductPublished } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';
import { formatMoney, type CurrencyCode } from '@/lib/commerce/money';

export const metadata: Metadata = { title: 'Products', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminProducts() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: products } = await supabase
    .from('products')
    .select(`
      id, slug, name, subtitle, base_price_minor, currency, is_published, is_featured,
      category:categories (name),
      collection:collections (name),
      images:product_images (url, is_primary, position, variant_id),
      variants:product_variants (id, color_name, sizes:product_sizes (quantity))
    `)
    .order('position');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-light">Products</h1>
        <p className="mt-1 text-sm text-ink-faint">
          {products?.length ?? 0} pieces · {products?.filter((p) => p.is_published).length ?? 0} live
        </p>
      </header>

      <ul className="divide-y divide-ink/10 border-y border-ink/10">
        {(products ?? []).map((product) => {
          const cover =
            product.images?.find((image) => image.is_primary && !image.variant_id) ??
            product.images?.find((image) => !image.variant_id) ??
            product.images?.[0];

          const stock = (product.variants ?? []).reduce(
            (sum, variant) =>
              sum + (variant.sizes ?? []).reduce((inner, size) => inner + size.quantity, 0),
            0,
          );

          const category = Array.isArray(product.category) ? product.category[0] : product.category;
          const collection = Array.isArray(product.collection) ? product.collection[0] : product.collection;

          return (
            <li key={product.id} className="flex flex-wrap items-center gap-4 py-4">
              <div className="relative h-20 w-14 shrink-0 overflow-hidden bg-cream-deep">
                {cover ? <Image src={cover.url} alt="" fill sizes="56px" className="object-cover" /> : null}
              </div>

              <div className="min-w-48 flex-1">
                <Link href={`/admin/products/${product.id}`} className="text-sm hover:text-gold-deep">
                  {product.name}
                </Link>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {[category?.name, collection?.name].filter(Boolean).join(' · ')}
                </p>
              </div>

              <p className="w-28 text-sm">
                {formatMoney(product.base_price_minor, (product.currency as CurrencyCode) ?? 'NGN')}
              </p>

              <p className={`w-24 text-sm ${stock === 0 ? 'text-burgundy' : 'text-ink-muted'}`}>
                {stock} in stock
              </p>

              <span
                className={`w-20 text-[0.6rem] uppercase tracking-wide ${
                  product.is_published ? 'text-gold-deep' : 'text-ink-faint'
                }`}
              >
                {product.is_published ? 'Live' : 'Draft'}
              </span>

              <ActionForm
                action={setProductPublished}
                submitLabel={product.is_published ? 'Unpublish' : 'Publish'}
                variant="quiet"
              >
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="published" value={product.is_published ? 'false' : 'true'} />
              </ActionForm>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
