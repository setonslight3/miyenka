import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import type { CurrencyCode } from '@/lib/commerce/money';

export type RequestedLine = { productSizeId: string; quantity: number };

export type PricedLine = {
  productId: string;
  variantId: string;
  productSizeId: string;
  productName: string;
  productSlug: string;
  variantColor: string;
  size: string;
  sku: string | null;
  imageUrl: string | null;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
  availableQuantity: number;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: CurrencyCode;
  promotionId: string | null;
  promoCode: string | null;
  shippingZoneId: string | null;
  shippingRateId: string | null;
  issues: string[];
};

export type PriceCartInput = {
  lines: RequestedLine[];
  country?: string;
  state?: string;
  promoCode?: string | null;
  email?: string | null;
};

const MAX_LINE_QUANTITY = 10;

/**
 * Recomputes an entire cart from the database.
 *
 * This is the only place an order total is ever produced. Nothing the browser
 * sends about price, discount or shipping is trusted — the client supplies
 * identifiers and quantities, and every figure below is read from the
 * catalogue, the promotions table and the shipping rates.
 *
 * Uses the service-role client so that pricing does not depend on the caller's
 * session; a guest must be priced identically to a signed-in customer.
 */
export async function priceCart(input: PriceCartInput): Promise<PricedCart> {
  const supabase = createAdminClient();
  const issues: string[] = [];

  const requested = input.lines
    .filter((line) => line.quantity > 0)
    .map((line) => ({
      productSizeId: line.productSizeId,
      quantity: Math.min(Math.floor(line.quantity), MAX_LINE_QUANTITY),
    }));

  if (!requested.length) {
    return emptyCart(['Your bag is empty.']);
  }

  const { data: sizeRows, error } = await supabase
    .from('product_sizes')
    .select(`
      id, size, sku, quantity, is_active,
      variant:product_variants!inner (
        id, color_name, price_override_minor, is_active,
        product:products!inner (
          id, slug, name, base_price_minor, currency, is_published, supports_ready_to_wear
        )
      )
    `)
    .in('id', requested.map((line) => line.productSizeId));

  if (error) throw new Error(`Failed to price cart: ${error.message}`);

  const byId = new Map((sizeRows ?? []).map((row) => [row.id, row]));

  // Product-level imagery for the order snapshot.
  const productIds = [...new Set((sizeRows ?? []).map((row) => row.variant.product.id))];
  const { data: images } = productIds.length
    ? await supabase
        .from('product_images')
        .select('product_id, variant_id, url, is_primary, position')
        .in('product_id', productIds)
        .order('position')
    : { data: [] };

  const pickImage = (productId: string, variantId: string) => {
    const pool = images ?? [];
    const forVariant = pool.filter((i) => i.variant_id === variantId);
    if (forVariant.length) return (forVariant.find((i) => i.is_primary) ?? forVariant[0]).url;
    const shared = pool.filter((i) => i.product_id === productId && !i.variant_id);
    return shared.length ? (shared.find((i) => i.is_primary) ?? shared[0]).url : null;
  };

  const lines: PricedLine[] = [];
  let currency: CurrencyCode = 'NGN';

  for (const line of requested) {
    const row = byId.get(line.productSizeId);

    if (!row) {
      issues.push('An item in your bag is no longer available.');
      continue;
    }

    const variant = row.variant;
    const product = variant.product;

    if (!product.is_published || !product.supports_ready_to_wear || !variant.is_active || !row.is_active) {
      issues.push(`${product.name} is no longer available.`);
      continue;
    }

    // Price comes from the catalogue, never from the request body.
    const unitPriceMinor = variant.price_override_minor ?? product.base_price_minor;
    currency = (product.currency as CurrencyCode) ?? 'NGN';

    if (row.quantity <= 0) {
      issues.push(`${product.name} (${variant.color_name}, ${row.size}) has sold out.`);
      continue;
    }

    // Trim rather than reject, so the customer can still complete the rest.
    const quantity = Math.min(line.quantity, row.quantity);
    if (quantity < line.quantity) {
      issues.push(
        `Only ${row.quantity} left of ${product.name} (${variant.color_name}, ${row.size}); your bag has been adjusted.`,
      );
    }

    lines.push({
      productId: product.id,
      variantId: variant.id,
      productSizeId: row.id,
      productName: product.name,
      productSlug: product.slug,
      variantColor: variant.color_name,
      size: row.size,
      sku: row.sku,
      imageUrl: pickImage(product.id, variant.id),
      unitPriceMinor,
      quantity,
      lineTotalMinor: unitPriceMinor * quantity,
      availableQuantity: row.quantity,
    });
  }

  if (!lines.length) return emptyCart(issues.length ? issues : ['Your bag is empty.']);

  const subtotalMinor = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);

  const { discountMinor, promotionId, promoCode, grantsFreeShipping, promoIssue } =
    await resolvePromotion(input.promoCode ?? null, subtotalMinor, input.email ?? null);
  if (promoIssue) issues.push(promoIssue);

  const shipping = await resolveShipping({
    country: input.country,
    state: input.state,
    subtotalMinor: subtotalMinor - discountMinor,
    freeShipping: grantsFreeShipping,
  });

  // Tax is disabled at launch but modelled end to end so it can be switched on.
  const taxMinor = 0;

  const totalMinor = Math.max(0, subtotalMinor - discountMinor + shipping.shippingMinor + taxMinor);

  return {
    lines,
    subtotalMinor,
    discountMinor,
    shippingMinor: shipping.shippingMinor,
    taxMinor,
    totalMinor,
    currency,
    promotionId,
    promoCode,
    shippingZoneId: shipping.zoneId,
    shippingRateId: shipping.rateId,
    issues,
  };
}

function emptyCart(issues: string[]): PricedCart {
  return {
    lines: [],
    subtotalMinor: 0,
    discountMinor: 0,
    shippingMinor: 0,
    taxMinor: 0,
    totalMinor: 0,
    currency: 'NGN',
    promotionId: null,
    promoCode: null,
    shippingZoneId: null,
    shippingRateId: null,
    issues,
  };
}

/** Validates a promo code server-side. Codes are never enumerable by the client. */
async function resolvePromotion(code: string | null, subtotalMinor: number, email: string | null) {
  if (!code?.trim()) {
    return {
      discountMinor: 0,
      promotionId: null,
      promoCode: null,
      grantsFreeShipping: false,
      promoIssue: null as string | null,
    };
  }

  const supabase = createAdminClient();
  const { data: promotion } = await supabase
    .from('promotions')
    .select('*')
    .eq('code', code.trim())
    .eq('is_active', true)
    .maybeSingle();

  const reject = (reason: string) => ({
    discountMinor: 0,
    promotionId: null,
    promoCode: null,
    grantsFreeShipping: false,
    promoIssue: reason,
  });

  if (!promotion) return reject('That promotion code is not valid.');

  const now = Date.now();
  if (promotion.starts_at && new Date(promotion.starts_at).getTime() > now) {
    return reject('That promotion has not started yet.');
  }
  if (promotion.ends_at && new Date(promotion.ends_at).getTime() < now) {
    return reject('That promotion has expired.');
  }
  if (promotion.usage_limit !== null && promotion.usage_count >= promotion.usage_limit) {
    return reject('That promotion has been fully redeemed.');
  }
  if (subtotalMinor < promotion.min_order_minor) {
    return reject('Your bag does not meet the minimum for that promotion.');
  }

  if (email && promotion.per_customer_limit !== null) {
    const { count } = await supabase
      .from('promotion_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('promotion_id', promotion.id)
      .eq('email', email);

    if ((count ?? 0) >= promotion.per_customer_limit) {
      return reject('You have already used that promotion.');
    }
  }

  let discountMinor = 0;
  if (promotion.type === 'percentage') {
    discountMinor = Math.round((subtotalMinor * Number(promotion.value)) / 100);
  } else if (promotion.type === 'fixed_amount') {
    discountMinor = Math.round(Number(promotion.value) * 100);
  }
  // A free_shipping promotion carries no line discount; it waives the
  // shipping charge instead, which resolveShipping applies.

  if (promotion.max_discount_minor !== null) {
    discountMinor = Math.min(discountMinor, promotion.max_discount_minor);
  }
  discountMinor = Math.min(discountMinor, subtotalMinor);

  return {
    discountMinor,
    promotionId: promotion.id,
    promoCode: promotion.code,
    grantsFreeShipping: promotion.type === 'free_shipping',
    promoIssue: null as string | null,
  };
}

async function resolveShipping({
  country,
  state,
  subtotalMinor,
  freeShipping,
}: {
  country?: string;
  state?: string;
  subtotalMinor: number;
  freeShipping: boolean;
}) {
  if (!country) return { shippingMinor: 0, zoneId: null, rateId: null };

  const supabase = createAdminClient();
  const { data: zoneId } = await supabase.rpc('resolve_shipping_zone', {
    p_country: country,
    p_state: state,
  });

  if (!zoneId) return { shippingMinor: 0, zoneId: null, rateId: null };

  const { data: rates } = await supabase
    .from('shipping_rates')
    .select('*')
    .eq('zone_id', zoneId)
    .eq('is_active', true)
    .order('position')
    .limit(1);

  const rate = rates?.[0];
  if (!rate) return { shippingMinor: 0, zoneId, rateId: null };

  const qualifiesFree =
    freeShipping || (rate.free_over_minor !== null && subtotalMinor >= rate.free_over_minor);

  return {
    shippingMinor: qualifiesFree ? 0 : rate.price_minor,
    zoneId,
    rateId: rate.id,
  };
}
