import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, AdminField, adminInput } from '@/components/admin/ActionForm';
import { updateProduct, updateStock } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';
import { toMajor, type CurrencyCode } from '@/lib/commerce/money';

export const metadata: Metadata = { title: 'Product', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminProductDetail({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  await requireAdmin();
  const { productId } = await params;

  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      images:product_images (*),
      variants:product_variants (*, sizes:product_sizes (*))
    `)
    .eq('id', productId)
    .maybeSingle();

  if (!product) notFound();

  const currency = (product.currency as CurrencyCode) ?? 'NGN';

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/products" className="text-xs text-ink-faint hover:text-ink">
            ← Products
          </Link>
          <h1 className="mt-2 font-display text-3xl font-light">{product.name}</h1>
          <p className="mt-1 text-sm text-ink-faint">
            /product/{product.slug} · {product.is_published ? 'live' : 'draft'}
          </p>
        </div>
        <Link
          href={`/product/${product.slug}`}
          className="text-xs text-ink-faint hover:text-ink"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on storefront →
        </Link>
      </header>

      <div className="grid gap-8 xl:grid-cols-[1.3fr_1fr]">
        <section className="border border-ink/10 p-6">
          <h2 className="mb-5 text-[0.6rem] uppercase tracking-luxe text-ink-faint">Details</h2>
          <ActionForm action={updateProduct} submitLabel="Save product" className="space-y-4">
            <input type="hidden" name="productId" value={product.id} />

            <AdminField label="Name">
              <input name="name" defaultValue={product.name} required className={adminInput} />
            </AdminField>

            <AdminField label="Subtitle">
              <input name="subtitle" defaultValue={product.subtitle ?? ''} className={adminInput} />
            </AdminField>

            <AdminField label="Description">
              <textarea name="description" rows={3} defaultValue={product.description ?? ''} className={adminInput} />
            </AdminField>

            <AdminField label="Atelier note">
              <textarea name="story" rows={2} defaultValue={product.story ?? ''} className={adminInput} />
            </AdminField>

            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label={`Price (${currency})`}>
                <input
                  name="basePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={toMajor(product.base_price_minor, currency)}
                  className={adminInput}
                />
              </AdminField>
              <AdminField label={`Compare-at price (${currency})`}>
                <input
                  name="compareAtPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={
                    product.compare_at_price_minor
                      ? toMajor(product.compare_at_price_minor, currency)
                      : ''
                  }
                  className={adminInput}
                />
              </AdminField>
            </div>

            <AdminField label="Fabric">
              <input name="fabric" defaultValue={product.fabric ?? ''} className={adminInput} />
            </AdminField>

            <AdminField label="Care instructions">
              <input name="careInstructions" defaultValue={product.care_instructions ?? ''} className={adminInput} />
            </AdminField>

            <div className="space-y-2 pt-1">
              <Checkbox name="supportsReadyToWear" label="Available ready-to-wear" defaultChecked={product.supports_ready_to_wear} />
              <Checkbox name="supportsBespoke" label="Available as a bespoke commission" defaultChecked={product.supports_bespoke} />
              <Checkbox name="isFeatured" label="Feature on the homepage" defaultChecked={product.is_featured} />
            </div>
          </ActionForm>
        </section>

        <div className="space-y-8">
          <section className="border border-ink/10 p-6">
            <h2 className="mb-4 text-[0.6rem] uppercase tracking-luxe text-ink-faint">
              Inventory
            </h2>
            <div className="space-y-6">
              {(product.variants ?? []).map((variant) => (
                <div key={variant.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border border-ink/15"
                      style={{ backgroundColor: variant.color_hex ?? '#DDD6CC' }}
                      aria-hidden="true"
                    />
                    <p className="text-sm">{variant.color_name}</p>
                  </div>
                  <ul className="space-y-2">
                    {(variant.sizes ?? [])
                      .slice()
                      .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size))
                      .map((size) => (
                        <li key={size.id}>
                          <ActionForm
                            action={updateStock}
                            submitLabel="Set"
                            variant="quiet"
                            className="flex items-center gap-2"
                          >
                            <input type="hidden" name="productSizeId" value={size.id} />
                            <span className="w-10 text-xs text-ink-muted">{size.size}</span>
                            <input
                              name="quantity"
                              type="number"
                              min="0"
                              defaultValue={size.quantity}
                              className="w-20 border border-ink/15 bg-white px-2 py-1 text-sm focus:border-ink focus:outline-none"
                            />
                          </ActionForm>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[0.65rem] leading-relaxed text-ink-faint">
              Stock is reduced automatically when a payment is verified, and returned if an order
              is cancelled. Adjust here only to correct a count.
            </p>
          </section>

          <section className="border border-ink/10 p-6">
            <h2 className="mb-4 text-[0.6rem] uppercase tracking-luxe text-ink-faint">Imagery</h2>
            <ul className="grid grid-cols-3 gap-2">
              {(product.images ?? []).map((image) => (
                <li key={image.id} className="relative aspect-[3/4] overflow-hidden bg-cream-deep">
                  <Image src={image.url} alt={image.alt_text ?? ''} fill sizes="96px" className="object-cover" />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-ink-muted">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}
