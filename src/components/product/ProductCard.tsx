'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatMoney, type CurrencyCode } from '@/lib/commerce/money';
import { primaryImage, type ProductSummary } from '@/lib/commerce/catalogue.shared';
import { WishlistButton } from '@/components/product/WishlistButton';

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductSummary;
  priority?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const images = product.images ?? [];
  const cover = primaryImage(images);
  // A second frame gives the card its editorial hover reveal.
  const alternate = images.find((image) => image.id !== cover?.id) ?? null;

  return (
    <article
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-cream-deep">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.alt_text ?? product.name}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
              className={`object-cover transition-all duration-[1200ms] ease-silk ${
                hovered && alternate ? 'scale-105 opacity-0' : 'scale-100 opacity-100'
              }`}
            />
          ) : (
            <div className="grid h-full place-items-center text-ink-faint">
              <span className="font-display text-lg">Miyenka</span>
            </div>
          )}

          {alternate ? (
            <Image
              src={alternate.url}
              alt=""
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
              aria-hidden="true"
              className={`object-cover transition-all duration-[1200ms] ease-silk ${
                hovered ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
              }`}
            />
          ) : null}
        </div>
      </Link>

      <div className="absolute right-3 top-3">
        <WishlistButton productId={product.id} productName={product.name} />
      </div>

      <div className="mt-4 space-y-1">
        {product.collection ? (
          <p className="text-[0.62rem] uppercase tracking-luxe text-ink-faint">
            {product.collection.name}
          </p>
        ) : null}
        <h3 className="font-display text-xl font-light leading-snug">
          <Link href={`/product/${product.slug}`} className="transition-colors hover:text-gold-deep">
            {product.name}
          </Link>
        </h3>
        {product.subtitle ? (
          <p className="text-xs text-ink-faint line-clamp-1">{product.subtitle}</p>
        ) : null}
        <p className="pt-1 text-sm">
          {formatMoney(product.base_price_minor, (product.currency as CurrencyCode) ?? 'NGN')}
          {product.compare_at_price_minor &&
          product.compare_at_price_minor > product.base_price_minor ? (
            <span className="ml-2 text-xs text-ink-faint line-through">
              {formatMoney(product.compare_at_price_minor, (product.currency as CurrencyCode) ?? 'NGN')}
            </span>
          ) : null}
        </p>
      </div>
    </article>
  );
}
