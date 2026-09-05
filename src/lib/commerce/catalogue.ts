import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Enums } from '@/lib/supabase/database.types';
import type {
  ProductDetail,
  ProductImage,
  ProductSummary,
} from '@/lib/commerce/catalogue.shared';

export type {
  ProductDetail,
  ProductImage,
  ProductSummary,
  ProductVariant,
} from '@/lib/commerce/catalogue.shared';
export { primaryImage, imagesForVariant, inStock } from '@/lib/commerce/catalogue.shared';

const SUMMARY_SELECT = `
  id, slug, name, subtitle, base_price_minor, compare_at_price_minor, currency,
  category:categories (slug, name),
  collection:collections (slug, name),
  images:product_images (id, url, alt_text, position, is_primary, variant_id, product_id, created_at)
`;

export type CatalogueFilters = {
  collection?: string;
  category?: string;
  size?: string;
  color?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  orderType?: 'ready_to_wear' | 'custom';
  search?: string;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'featured';
  limit?: number;
};

/**
 * Storefront product listing. RLS already restricts this to published rows;
 * the explicit `is_published` filter keeps the intent legible and lets the
 * same helper be reused from admin contexts without leaking drafts.
 */
export async function listProducts(filters: CatalogueFilters = {}): Promise<ProductSummary[]> {
  const supabase = await createClient();

  let query = supabase.from('products').select(SUMMARY_SELECT).eq('is_published', true);

  if (filters.collection) {
    const { data: collection } = await supabase
      .from('collections')
      .select('id')
      .eq('slug', filters.collection)
      .maybeSingle();
    if (!collection) return [];
    query = query.eq('collection_id', collection.id);
  }

  if (filters.category) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', filters.category)
      .maybeSingle();
    if (!category) return [];
    query = query.eq('category_id', category.id);
  }

  if (filters.orderType === 'custom') query = query.eq('supports_bespoke', true);
  if (filters.orderType === 'ready_to_wear') query = query.eq('supports_ready_to_wear', true);
  if (typeof filters.minPriceMinor === 'number') query = query.gte('base_price_minor', filters.minPriceMinor);
  if (typeof filters.maxPriceMinor === 'number') query = query.lte('base_price_minor', filters.maxPriceMinor);
  if (filters.search) {
    const term = filters.search.replace(/[%,()]/g, ' ').trim();
    if (term) query = query.or(`name.ilike.%${term}%,subtitle.ilike.%${term}%,description.ilike.%${term}%`);
  }

  switch (filters.sort) {
    case 'price-asc':
      query = query.order('base_price_minor', { ascending: true });
      break;
    case 'price-desc':
      query = query.order('base_price_minor', { ascending: false });
      break;
    case 'newest':
      query = query.order('published_at', { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order('is_featured', { ascending: false }).order('position', { ascending: true });
  }

  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list products: ${error.message}`);

  let products = (data ?? []) as unknown as ProductSummary[];

  // Size and colour live on child rows, so they are applied after the fetch
  // rather than as a join that would drop products with no matching variant.
  if (filters.size || filters.color) {
    const ids = products.map((p) => p.id);
    if (!ids.length) return [];

    const { data: variants } = await supabase
      .from('product_variants')
      .select('product_id, color_name, sizes:product_sizes (size, quantity, is_active)')
      .in('product_id', ids)
      .eq('is_active', true);

    const allowed = new Set(
      (variants ?? [])
        .filter((v) => {
          const colorOk = !filters.color || v.color_name.toLowerCase() === filters.color!.toLowerCase();
          const sizes = (v.sizes ?? []) as { size: string; quantity: number; is_active: boolean }[];
          const sizeOk = !filters.size || sizes.some((s) => s.size === filters.size && s.is_active);
          return colorOk && sizeOk;
        })
        .map((v) => v.product_id),
    );

    products = products.filter((p) => allowed.has(p.id));
  }

  return products.map(sortImages);
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories (*),
      collection:collections (*),
      images:product_images (*),
      variants:product_variants (*, sizes:product_sizes (*))
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`Failed to load product: ${error.message}`);
  if (!data) return null;

  const product = data as unknown as ProductDetail;
  product.images = [...(product.images ?? [])].sort(byPosition);
  product.variants = [...(product.variants ?? [])]
    .filter((v) => v.is_active)
    .sort((a, b) => a.position - b.position)
    .map((v) => ({
      ...v,
      sizes: [...(v.sizes ?? [])].sort(
        (a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size),
      ),
    }));

  return product;
}

export async function listCollections() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('is_published', true)
    .order('position');
  return data ?? [];
}

export async function getCollection(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('collections')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  return data;
}

export async function listCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from('categories').select('*').order('position');
  return data ?? [];
}

/** Distinct colourways across published products, for the shop filter rail. */
export async function listColors(): Promise<{ name: string; hex: string | null }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('product_variants')
    .select('color_name, color_hex, products!inner (is_published)')
    .eq('is_active', true)
    .eq('products.is_published', true);

  const seen = new Map<string, string | null>();
  for (const row of data ?? []) {
    if (!seen.has(row.color_name)) seen.set(row.color_name, row.color_hex);
  }
  return [...seen].map(([name, hex]) => ({ name, hex })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProductRating(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc('product_rating', { p_product_id: productId });
  const row = Array.isArray(data) ? data[0] : null;
  return { average: row?.average ?? null, total: Number(row?.total ?? 0) };
}

export async function listPublishedReviews(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('reviews')
    .select('*, media:review_media (*)')
    .eq('product_id', productId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  return data ?? [];
}

const SIZE_ORDER: Enums<'size_code'>[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

function sortImages<T extends { images: ProductImage[] }>(product: T): T {
  return { ...product, images: [...(product.images ?? [])].sort(byPosition) };
}
