'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { audit, requireAdmin, requireOwner } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';
import { recordStatusChange } from '@/lib/commerce/orders';
import { sendOrderStatusUpdate, sendQuoteReady } from '@/lib/email';
import type { Enums } from '@/lib/supabase/database.types';

export type ActionResult = { ok: boolean; message: string };

const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });

/*
  Every action below re-authorises through requireAdmin()/requireOwner() before
  touching data. Server Actions are reachable directly, so the gate cannot be
  left to the proxy or the page that rendered the form.
*/

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
const ORDER_STATUSES = [
  'pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled',
] as const;

export async function updateOrderStatus(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();

  const parsed = z
    .object({
      orderId: z.string().uuid(),
      status: z.enum(ORDER_STATUSES),
      trackingNumber: z.string().max(120).optional(),
      trackingUrl: z.string().url().max(500).optional().or(z.literal('')),
      carrier: z.string().max(120).optional(),
      note: z.string().max(1000).optional(),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return fail('Please check the details you entered.');
  const input = parsed.data;

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, order_number, inventory_committed')
    .eq('id', input.orderId)
    .maybeSingle();

  if (!order) return fail('Order not found.');

  // Cancelling an order that already holds stock must return it to the
  // catalogue, or that stock is lost.
  if (input.status === 'cancelled' && order.inventory_committed) {
    const { error } = await supabase.rpc('restore_inventory', { p_order_id: order.id });
    if (error) return fail(`Could not return stock to the catalogue: ${error.message}`);
  }

  const timestamps: Record<string, string> = {};
  if (input.status === 'shipped') timestamps.shipped_at = new Date().toISOString();
  if (input.status === 'delivered') timestamps.delivered_at = new Date().toISOString();
  if (input.status === 'cancelled') timestamps.cancelled_at = new Date().toISOString();

  const { error } = await supabase
    .from('orders')
    .update({
      status: input.status,
      tracking_number: input.trackingNumber || null,
      tracking_url: input.trackingUrl || null,
      carrier: input.carrier || null,
      ...timestamps,
    })
    .eq('id', input.orderId);

  if (error) return fail(error.message);

  await recordStatusChange(order.id, order.status, input.status, input.note, actor.userId);
  await audit(actor, 'order.status_changed', 'order', order.id,
    `${order.order_number}: ${order.status} → ${input.status}`);

  if (['processing', 'shipped', 'delivered', 'cancelled'].includes(input.status)) {
    await sendOrderStatusUpdate(order.id, input.status, input.trackingUrl || null);
  }

  revalidatePath('/admin/orders');
  return ok(`Order ${order.order_number} is now ${input.status.replace(/_/g, ' ')}.`);
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export async function moderateReview(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();

  const parsed = z
    .object({
      reviewId: z.string().uuid(),
      decision: z.enum(['published', 'rejected', 'pending']),
      adminResponse: z.string().max(2000).optional(),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return fail('Invalid moderation request.');
  const input = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('reviews')
    .update({
      status: input.decision as Enums<'review_status'>,
      admin_response: input.adminResponse || null,
      published_at: input.decision === 'published' ? new Date().toISOString() : null,
      published_by: input.decision === 'published' ? actor.userId : null,
    })
    .eq('id', input.reviewId);

  if (error) return fail(error.message);

  await audit(actor, 'review.moderated', 'review', input.reviewId, `Review ${input.decision}.`);
  revalidatePath('/admin/reviews');
  return ok(input.decision === 'published' ? 'Review published.' : `Review ${input.decision}.`);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export async function setProductPublished(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();

  const parsed = z
    .object({ productId: z.string().uuid(), published: z.enum(['true', 'false']) })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return fail('Invalid request.');
  const published = parsed.data.published === 'true';

  const supabase = createAdminClient();
  const { data: product, error } = await supabase
    .from('products')
    .update({
      is_published: published,
      published_at: published ? new Date().toISOString() : null,
    })
    .eq('id', parsed.data.productId)
    .select('name')
    .single();

  if (error) return fail(error.message);

  await audit(actor, 'product.publish_changed', 'product', parsed.data.productId,
    `${product.name} ${published ? 'published' : 'unpublished'}.`);

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  return ok(`${product.name} ${published ? 'is now live' : 'has been unpublished'}.`);
}

export async function updateProduct(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();

  const parsed = z
    .object({
      productId: z.string().uuid(),
      name: z.string().min(2).max(160),
      subtitle: z.string().max(200).optional(),
      description: z.string().max(4000).optional(),
      story: z.string().max(4000).optional(),
      fabric: z.string().max(300).optional(),
      careInstructions: z.string().max(1000).optional(),
      // Entered in major units; stored in minor units.
      basePrice: z.coerce.number().min(0).max(100_000_000),
      compareAtPrice: z.coerce.number().min(0).max(100_000_000).optional(),
      supportsBespoke: z.enum(['on']).optional(),
      supportsReadyToWear: z.enum(['on']).optional(),
      isFeatured: z.enum(['on']).optional(),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return fail('Please check the product details.');
  const input = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('products')
    .update({
      name: input.name,
      subtitle: input.subtitle || null,
      description: input.description || null,
      story: input.story || null,
      fabric: input.fabric || null,
      care_instructions: input.careInstructions || null,
      base_price_minor: Math.round(input.basePrice * 100),
      compare_at_price_minor: input.compareAtPrice ? Math.round(input.compareAtPrice * 100) : null,
      supports_bespoke: input.supportsBespoke === 'on',
      supports_ready_to_wear: input.supportsReadyToWear === 'on',
      is_featured: input.isFeatured === 'on',
    })
    .eq('id', input.productId);

  if (error) return fail(error.message);

  await audit(actor, 'product.updated', 'product', input.productId, `${input.name} updated.`);
  revalidatePath('/admin/products');
  revalidatePath(`/product`);
  return ok('Product saved.');
}

export async function updateStock(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();

  const parsed = z
    .object({ productSizeId: z.string().uuid(), quantity: z.coerce.number().int().min(0).max(10_000) })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return fail('Invalid stock quantity.');

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('product_sizes')
    .update({ quantity: parsed.data.quantity })
    .eq('id', parsed.data.productSizeId);

  if (error) return fail(error.message);

  await audit(actor, 'inventory.adjusted', 'product_size', parsed.data.productSizeId,
    `Stock set to ${parsed.data.quantity}.`);

  revalidatePath('/admin/products');
  return ok('Stock updated.');
}

// ---------------------------------------------------------------------------
// Bespoke quotations
// ---------------------------------------------------------------------------
export async function createQuote(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();

  const parsed = z
    .object({
      requestId: z.string().uuid(),
      amount: z.coerce.number().min(0).max(100_000_000),
      shipping: z.coerce.number().min(0).max(10_000_000).optional(),
      summary: z.string().max(2000).optional(),
      productionDays: z.coerce.number().int().min(1).max(365).optional(),
      validDays: z.coerce.number().int().min(1).max(120).optional(),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return fail('Please check the quotation details.');
  const input = parsed.data;

  const supabase = createAdminClient();
  const { data: quoteNumber } = await supabase.rpc('next_quote_number');

  const amountMinor = Math.round(input.amount * 100);
  const shippingMinor = Math.round((input.shipping ?? 0) * 100);

  const { data: quote, error } = await supabase
    .from('custom_quotes')
    .insert({
      request_id: input.requestId,
      quote_number: quoteNumber ?? `MQ-${Date.now()}`,
      amount_minor: amountMinor,
      shipping_minor: shippingMinor,
      total_minor: amountMinor + shippingMinor,
      summary: input.summary || null,
      production_days: input.productionDays ?? null,
      status: 'sent',
      expires_at: input.validDays
        ? new Date(Date.now() + input.validDays * 86_400_000).toISOString()
        : null,
      created_by: actor.userId,
    })
    .select('id, quote_number')
    .single();

  if (error || !quote) return fail(error?.message ?? 'Could not create the quotation.');

  await supabase
    .from('custom_requests')
    .update({ status: 'quote_sent' })
    .eq('id', input.requestId);

  await audit(actor, 'quote.created', 'custom_quote', quote.id,
    `Quotation ${quote.quote_number} sent.`);

  await sendQuoteReady(quote.id);

  revalidatePath('/admin/bespoke');
  return ok(`Quotation ${quote.quote_number} sent to the customer.`);
}

export async function updateCustomRequestStatus(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();

  const parsed = z
    .object({
      requestId: z.string().uuid(),
      status: z.enum([
        'awaiting_quote', 'quote_sent', 'awaiting_payment', 'paid_in_production',
        'shipped', 'delivered', 'declined', 'cancelled',
      ]),
      adminNote: z.string().max(2000).optional(),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return fail('Invalid request.');

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('custom_requests')
    .update({
      status: parsed.data.status as Enums<'custom_request_status'>,
      admin_note: parsed.data.adminNote || null,
    })
    .eq('id', parsed.data.requestId);

  if (error) return fail(error.message);

  await audit(actor, 'custom_request.status_changed', 'custom_request', parsed.data.requestId,
    `Status set to ${parsed.data.status}.`);

  revalidatePath('/admin/bespoke');
  return ok('Request updated.');
}

// ---------------------------------------------------------------------------
// Settings, shipping, WhatsApp, promotions
// ---------------------------------------------------------------------------
export async function updateSetting(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();

  const parsed = z
    .object({ key: z.string().min(1).max(120), value: z.string().max(8000) })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return fail('Invalid setting.');

  let value: unknown;
  try {
    value = JSON.parse(parsed.data.value);
  } catch {
    return fail('That value is not valid JSON.');
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('site_settings')
    .update({ value: value as never, updated_by: actor.userId, updated_at: new Date().toISOString() })
    .eq('key', parsed.data.key);

  if (error) return fail(error.message);

  await audit(actor, 'setting.updated', 'site_setting', parsed.data.key,
    `${parsed.data.key} changed.`, { value });

  revalidatePath('/admin/settings');
  revalidatePath('/', 'layout');
  return ok('Setting saved.');
}

export async function upsertShippingRate(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();

  const parsed = z
    .object({
      rateId: z.string().uuid(),
      name: z.string().min(2).max(120),
      price: z.coerce.number().min(0).max(10_000_000),
      freeOver: z.coerce.number().min(0).max(1_000_000_000).optional(),
      minDays: z.coerce.number().int().min(0).max(365).optional(),
      maxDays: z.coerce.number().int().min(0).max(365).optional(),
      isActive: z.enum(['on']).optional(),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return fail('Please check the shipping rate.');
  const input = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('shipping_rates')
    .update({
      name: input.name,
      price_minor: Math.round(input.price * 100),
      free_over_minor: input.freeOver ? Math.round(input.freeOver * 100) : null,
      min_delivery_days: input.minDays ?? null,
      max_delivery_days: input.maxDays ?? null,
      is_active: input.isActive === 'on',
    })
    .eq('id', input.rateId);

  if (error) return fail(error.message);

  await audit(actor, 'shipping_rate.updated', 'shipping_rate', input.rateId,
    `${input.name} set to ${input.price}.`);

  revalidatePath('/admin/shipping');
  return ok('Shipping rate saved.');
}

export async function upsertWhatsappContact(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();

  const parsed = z
    .object({
      contactId: z.string().uuid().optional(),
      label: z.string().min(2).max(80),
      // E.164, so customer care can be re-pointed without a deploy.
      phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Use international format, e.g. +2348012345678'),
      greeting: z.string().max(300).optional(),
      isActive: z.enum(['on']).optional(),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Please check the contact details.');
  }
  const input = parsed.data;

  const supabase = createAdminClient();
  const payload = {
    label: input.label,
    phone_e164: input.phone,
    greeting: input.greeting || null,
    is_active: input.isActive === 'on',
  };

  const { error } = input.contactId
    ? await supabase.from('whatsapp_contacts').update(payload).eq('id', input.contactId)
    : await supabase.from('whatsapp_contacts').insert(payload);

  if (error) return fail(error.message);

  await audit(actor, 'whatsapp.updated', 'whatsapp_contact', input.contactId ?? null,
    `${input.label} saved.`);

  revalidatePath('/admin/settings');
  revalidatePath('/', 'layout');
  return ok('Customer care number saved.');
}

export async function deleteWhatsappContact(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();
  const parsed = z.object({ contactId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('Invalid request.');

  const supabase = createAdminClient();
  const { error } = await supabase.from('whatsapp_contacts').delete().eq('id', parsed.data.contactId);
  if (error) return fail(error.message);

  await audit(actor, 'whatsapp.deleted', 'whatsapp_contact', parsed.data.contactId, 'Number removed.');
  revalidatePath('/admin/settings');
  revalidatePath('/', 'layout');
  return ok('Number removed.');
}

export async function upsertPromotion(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdmin();

  const parsed = z
    .object({
      promotionId: z.string().uuid().optional(),
      code: z.string().min(3).max(64),
      description: z.string().max(300).optional(),
      type: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
      value: z.coerce.number().min(0).max(1_000_000),
      minOrder: z.coerce.number().min(0).max(1_000_000_000).optional(),
      usageLimit: z.coerce.number().int().min(1).max(1_000_000).optional(),
      endsAt: z.string().max(40).optional(),
      isActive: z.enum(['on']).optional(),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return fail('Please check the promotion details.');
  const input = parsed.data;

  const supabase = createAdminClient();
  const payload = {
    code: input.code.trim().toUpperCase(),
    description: input.description || null,
    type: input.type as Enums<'promotion_type'>,
    value: input.value,
    min_order_minor: Math.round((input.minOrder ?? 0) * 100),
    usage_limit: input.usageLimit ?? null,
    ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    is_active: input.isActive === 'on',
  };

  const { error } = input.promotionId
    ? await supabase.from('promotions').update(payload).eq('id', input.promotionId)
    : await supabase.from('promotions').insert(payload);

  if (error) {
    return fail(
      (error as { code?: string }).code === '23505'
        ? 'That promotion code already exists.'
        : error.message,
    );
  }

  await audit(actor, 'promotion.saved', 'promotion', input.promotionId ?? null, `${payload.code} saved.`);
  revalidatePath('/admin/promotions');
  return ok(`Promotion ${payload.code} saved.`);
}

// ---------------------------------------------------------------------------
// Admin roster — owner only
// ---------------------------------------------------------------------------
export async function inviteAdmin(formData: FormData): Promise<ActionResult> {
  const actor = await requireOwner();

  const parsed = z
    .object({ email: z.string().email().max(254), role: z.enum(['admin', 'owner']) })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return fail('Please enter a valid email address.');

  const supabase = createAdminClient();

  // Invitation is by email: the user_id is linked on their first sign-in by
  // the handle_new_user trigger.
  const { error } = await supabase.from('admin_users').insert({
    email: parsed.data.email.toLowerCase(),
    role: parsed.data.role as Enums<'admin_role'>,
    invited_by: actor.userId,
    is_active: true,
  });

  if (error) {
    return fail(
      (error as { code?: string }).code === '23505'
        ? 'That email already has admin access.'
        : error.message,
    );
  }

  await audit(actor, 'admin.invited', 'admin_user', null,
    `${parsed.data.email} invited as ${parsed.data.role}.`);

  revalidatePath('/admin/admins');
  return ok(`${parsed.data.email} now has ${parsed.data.role} access.`);
}

export async function setAdminActive(formData: FormData): Promise<ActionResult> {
  const actor = await requireOwner();

  const parsed = z
    .object({ adminId: z.string().uuid(), active: z.enum(['true', 'false']) })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return fail('Invalid request.');

  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from('admin_users')
    .select('email, role, user_id')
    .eq('id', parsed.data.adminId)
    .maybeSingle();

  if (!target) return fail('Admin not found.');

  // An owner must not be able to lock themselves out.
  if (target.user_id === actor.userId && parsed.data.active === 'false') {
    return fail('You cannot deactivate your own access.');
  }

  const active = parsed.data.active === 'true';
  const { error } = await supabase
    .from('admin_users')
    .update({ is_active: active })
    .eq('id', parsed.data.adminId);

  if (error) return fail(error.message);

  await audit(actor, 'admin.access_changed', 'admin_user', parsed.data.adminId,
    `${target.email} ${active ? 'reactivated' : 'deactivated'}.`);

  revalidatePath('/admin/admins');
  return ok(`${target.email} ${active ? 'reactivated' : 'deactivated'}.`);
}
