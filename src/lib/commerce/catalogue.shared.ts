import type { Tables } from '@/lib/supabase/database.types';

export type ProductImage = Tables<'product_images'>;
export type ProductVariant = Tables<'product_variants'> & { sizes: Tables<'product_sizes'>[] };

export type ProductSummary = Pick<
  Tables<'products'>,
  'id' | 'slug' | 'name' | 'subtitle' | 'base_price_minor' | 'compare_at_price_minor' | 'currency'
> & {
  category: Pick<Tables<'categories'>, 'slug' | 'name'> | null;
  collection: Pick<Tables<'collections'>, 'slug' | 'name'> | null;
  images: ProductImage[];
};

export type ProductDetail = Tables<'products'> & {
  category: Tables<'categories'> | null;
  collection: Tables<'collections'> | null;
  images: ProductImage[];
  variants: ProductVariant[];
};

/** Primary image for a product card, honouring a selected colourway. */
export function primaryImage(images: ProductImage[], variantId?: string | null): ProductImage | null {
  if (!images?.length) return null;

  if (variantId) {
    const forVariant = images.filter((image) => image.variant_id === variantId);
    if (forVariant.length) return forVariant.find((image) => image.is_primary) ?? forVariant[0];
  }

  const shared = images.filter((image) => !image.variant_id);
  return shared.find((image) => image.is_primary) ?? shared[0] ?? images[0];
}

/** Images to show for a colourway: its own if it has any, otherwise the shared set. */
export function imagesForVariant(images: ProductImage[], variantId: string | null): ProductImage[] {
  if (!images?.length) return [];
  const forVariant = variantId ? images.filter((image) => image.variant_id === variantId) : [];
  const shared = images.filter((image) => !image.variant_id);
  return forVariant.length ? [...forVariant, ...shared] : shared.length ? shared : images;
}

export function inStock(variants: ProductVariant[]): boolean {
  return variants.some((variant) => variant.sizes.some((size) => size.is_active && size.quantity > 0));
}
