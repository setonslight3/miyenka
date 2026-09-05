import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import type { PricedCart } from '@/lib/commerce/pricing';
import type { Enums, Json } from '@/lib/supabase/database.types';

export type Address = {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  phone?: string;
};

export type CreateOrderInput = {
  cart: PricedCart;
  email: string;
  phone?: string;
  userId?: string | null;
  shippingAddress: Address;
  billingAddress?: Address;
  customerNote?: string;
  displayCurrency?: string;
};

/** Addresses are stored as jsonb; this narrows the object to the Json type. */
const toJson = (value: Address): Json => value as unknown as Json;

/**
 * Creates a pending order with the priced totals frozen onto it.
 *
 * The order is written before payment is initialised so that a payment always
 * has an order to attach to, and stock is deliberately NOT touched here — it
 * is committed only once a webhook verifies the payment.
 */
export async function createPendingOrder(input: CreateOrderInput) {
  const supabase = createAdminClient();
  const { cart } = input;

  const { data: orderNumber, error: numberError } = await supabase.rpc('next_order_number');
  if (numberError || !orderNumber) {
    throw new Error(`Could not allocate an order number: ${numberError?.message ?? 'unknown'}`);
  }

  // Freeze the display FX rate at order time so a historical order never
  // re-converts when rates move.
  const displayCurrency = input.displayCurrency ?? cart.currency;
  const { data: fxRate } = await supabase.rpc('active_fx_rate', {
    p_quote_currency: displayCurrency,
    p_base: cart.currency,
  });

  const cancellationHours = Number(
    (await supabase.rpc('get_setting', { setting_key: 'cancellation_window_hours' })).data ?? 12,
  );

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: input.userId ?? null,
      guest_email: input.userId ? null : input.email,
      contact_phone: input.phone ?? input.shippingAddress.phone ?? null,
      status: 'pending_payment',
      order_type: 'ready_to_wear',
      subtotal_minor: cart.subtotalMinor,
      discount_minor: cart.discountMinor,
      shipping_minor: cart.shippingMinor,
      tax_minor: cart.taxMinor,
      total_minor: cart.totalMinor,
      currency: cart.currency,
      display_currency: displayCurrency,
      fx_rate: fxRate ?? 1,
      fx_captured_at: new Date().toISOString(),
      shipping_zone_id: cart.shippingZoneId,
      shipping_rate_id: cart.shippingRateId,
      shipping_address: toJson(input.shippingAddress),
      billing_address: toJson(input.billingAddress ?? input.shippingAddress),
      promotion_id: cart.promotionId,
      promo_code: cart.promoCode,
      customer_note: input.customerNote ?? null,
      cancellation_deadline: new Date(Date.now() + cancellationHours * 3600_000).toISOString(),
    })
    .select('*')
    .single();

  if (error || !order) throw new Error(`Could not create order: ${error?.message ?? 'unknown'}`);

  // Snapshot the catalogue onto the order lines so renaming or repricing a
  // product later never rewrites history.
  const { error: itemsError } = await supabase.from('order_items').insert(
    cart.lines.map((line) => ({
      order_id: order.id,
      product_id: line.productId,
      variant_id: line.variantId,
      product_size_id: line.productSizeId,
      product_name: line.productName,
      product_slug: line.productSlug,
      variant_color: line.variantColor,
      size: line.size as Enums<'size_code'>,
      image_url: line.imageUrl,
      sku: line.sku,
      unit_price_minor: line.unitPriceMinor,
      quantity: line.quantity,
      line_total_minor: line.lineTotalMinor,
      currency: cart.currency,
      is_bespoke: false,
    })),
  );

  if (itemsError) {
    // Leave nothing half-written behind.
    await supabase.from('orders').delete().eq('id', order.id);
    throw new Error(`Could not create order items: ${itemsError.message}`);
  }

  await supabase.from('order_status_history').insert({
    order_id: order.id,
    to_status: 'pending_payment',
    note: 'Order created, awaiting payment.',
  });

  return order;
}

export async function recordStatusChange(
  orderId: string,
  from: Enums<'order_status'> | null,
  to: Enums<'order_status'>,
  note?: string,
  changedBy?: string | null,
) {
  const supabase = createAdminClient();
  await supabase.from('order_status_history').insert({
    order_id: orderId,
    from_status: from,
    to_status: to,
    note: note ?? null,
    changed_by: changedBy ?? null,
  });
}
