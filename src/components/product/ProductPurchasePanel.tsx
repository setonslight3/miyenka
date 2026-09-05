'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { SizeGuideModal } from '@/components/product/SizeGuideModal';
import { WishlistButton } from '@/components/product/WishlistButton';
import { formatMoney, type CurrencyCode } from '@/lib/commerce/money';
import { imagesForVariant, primaryImage, type ProductDetail } from '@/lib/commerce/catalogue.shared';
import { cn } from '@/lib/utils/cn';

/**
 * Gallery, colourway and size selection, and add-to-bag.
 *
 * Stock numbers shown here come from the catalogue read and are informational
 * only — the database is authoritative and commits stock after payment, so a
 * size can still sell out between this render and checkout.
 */
export function ProductPurchasePanel({ product }: { product: ProductDetail }) {
  const { addLine } = useCart();

  const variants = product.variants ?? [];
  const [variantId, setVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const variant = variants.find((v) => v.id === variantId) ?? variants[0] ?? null;
  const gallery = useMemo(
    () => imagesForVariant(product.images ?? [], variantId),
    [product.images, variantId],
  );

  const currency = (product.currency as CurrencyCode) ?? 'NGN';
  const priceMinor = variant?.price_override_minor ?? product.base_price_minor;
  const sizes = variant?.sizes ?? [];
  const selectedSize = sizes.find((s) => s.id === sizeId) ?? null;

  function selectVariant(nextId: string) {
    setVariantId(nextId);
    setSizeId(null);
    setActiveImage(0);
    setError(null);
  }

  function addToBag() {
    if (!variant) return;
    if (!selectedSize) {
      setError('Please select a size.');
      return;
    }

    const cover = primaryImage(gallery, variant.id);
    addLine({
      productId: product.id,
      variantId: variant.id,
      productSizeId: selectedSize.id,
      quantity: 1,
      slug: product.slug,
      name: product.name,
      colorName: variant.color_name,
      size: selectedSize.size,
      imageUrl: cover?.url ?? null,
      unitPriceMinor: priceMinor,
    });
    setError(null);
  }

  const soldOut = sizes.length > 0 && sizes.every((s) => !s.is_active || s.quantity <= 0);

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
      {/* Gallery */}
      <div>
        <div className="relative aspect-[3/4] overflow-hidden bg-cream-deep">
          {gallery[activeImage] ? (
            <Image
              src={gallery[activeImage].url}
              alt={gallery[activeImage].alt_text ?? product.name}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-ink-faint">
              <span className="font-display text-2xl">Miyenka</span>
            </div>
          )}
        </div>

        {gallery.length > 1 ? (
          <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto">
            {gallery.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={`View image ${index + 1} of ${gallery.length}`}
                aria-current={index === activeImage}
                className={cn(
                  'relative h-28 w-20 shrink-0 overflow-hidden border-2 transition-colors duration-300',
                  index === activeImage ? 'border-gold' : 'border-transparent hover:border-ink/20',
                )}
              >
                <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Detail */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        {product.collection ? (
          <p className="eyebrow">{product.collection.name}</p>
        ) : null}

        <h1 className="display-md mt-3">{product.name}</h1>
        {product.subtitle ? (
          <p className="mt-2 text-sm text-ink-muted">{product.subtitle}</p>
        ) : null}

        <p className="mt-5 font-display text-2xl">
          {formatMoney(priceMinor, currency)}
          {product.compare_at_price_minor && product.compare_at_price_minor > priceMinor ? (
            <span className="ml-3 text-base text-ink-faint line-through">
              {formatMoney(product.compare_at_price_minor, currency)}
            </span>
          ) : null}
        </p>

        {product.description ? (
          <p className="mt-6 text-[0.95rem] leading-relaxed text-ink-muted">{product.description}</p>
        ) : null}

        {variants.length > 1 ? (
          <fieldset className="mt-8">
            <legend className="text-[0.62rem] uppercase tracking-luxe text-ink-faint">
              Colour — <span className="text-ink">{variant?.color_name}</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {variants.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => selectVariant(option.id)}
                  aria-pressed={option.id === variant?.id}
                  aria-label={option.color_name}
                  title={option.color_name}
                  className={cn(
                    'h-9 w-9 rounded-full border-2 transition-transform duration-300 hover:scale-110',
                    option.id === variant?.id ? 'border-gold' : 'border-ink/15',
                  )}
                  style={{ backgroundColor: option.color_hex ?? '#DDD6CC' }}
                />
              ))}
            </div>
          </fieldset>
        ) : null}

        <fieldset className="mt-8">
          <div className="flex items-baseline justify-between">
            <legend className="text-[0.62rem] uppercase tracking-luxe text-ink-faint">Size</legend>
            <SizeGuideModal />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {sizes.map((size) => {
              const unavailable = !size.is_active || size.quantity <= 0;
              return (
                <button
                  key={size.id}
                  type="button"
                  disabled={unavailable}
                  onClick={() => {
                    setSizeId(size.id);
                    setError(null);
                  }}
                  aria-pressed={size.id === sizeId}
                  className={cn(
                    'relative h-11 min-w-14 border px-4 text-sm transition-colors duration-300',
                    size.id === sizeId
                      ? 'border-ink bg-ink text-cream'
                      : 'border-ink/15 hover:border-ink',
                    unavailable && 'cursor-not-allowed border-ink/10 text-ink-faint/50 hover:border-ink/10',
                  )}
                >
                  {size.size}
                  {unavailable ? (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 grid place-items-center"
                    >
                      <span className="h-px w-9 rotate-[-24deg] bg-ink-faint/40" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {selectedSize && selectedSize.quantity > 0 && selectedSize.quantity <= 2 ? (
            <p className="mt-3 text-xs text-burgundy">
              Only {selectedSize.quantity} left in this size.
            </p>
          ) : null}
        </fieldset>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={addToBag}
            disabled={soldOut}
            className="flex-1 bg-ink py-4 text-[0.72rem] uppercase tracking-luxe text-cream transition-colors duration-500 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {soldOut ? 'Sold out' : 'Add to bag'}
          </button>
          <div className="grid place-items-center border border-ink/15 px-4">
            <WishlistButton productId={product.id} productName={product.name} className="bg-transparent" />
          </div>
        </div>

        <p aria-live="polite" className="mt-3 min-h-5 text-xs text-burgundy">
          {error ?? ''}
        </p>

        {product.supports_bespoke ? (
          <div className="mt-6 border border-gold/40 bg-blush-soft/30 p-5">
            <p className="font-display text-lg">Prefer it made to your measurements?</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
              We will cut this piece to your exact bust, waist, hip and length, in your choice of
              fabric and colour.
            </p>
            <Link
              href={`/custom?product=${product.slug}`}
              className="mt-4 inline-block border-b border-gold-deep pb-0.5 text-[0.65rem] uppercase tracking-luxe text-gold-deep hover:text-ink hover:border-ink transition-colors"
            >
              Request a bespoke fit
            </Link>
          </div>
        ) : null}

        <dl className="mt-9 space-y-4 border-t border-ink/10 pt-7 text-sm">
          {product.fabric ? (
            <div>
              <dt className="text-[0.62rem] uppercase tracking-luxe text-ink-faint">Fabric</dt>
              <dd className="mt-1 text-ink-muted">{product.fabric}</dd>
            </div>
          ) : null}
          {product.care_instructions ? (
            <div>
              <dt className="text-[0.62rem] uppercase tracking-luxe text-ink-faint">Care</dt>
              <dd className="mt-1 text-ink-muted">{product.care_instructions}</dd>
            </div>
          ) : null}
          {product.story ? (
            <div>
              <dt className="text-[0.62rem] uppercase tracking-luxe text-ink-faint">Atelier Note</dt>
              <dd className="mt-1 italic text-ink-muted">{product.story}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
