import { NextResponse } from 'next/server';
import { z } from 'zod';
import { priceCart } from '@/lib/commerce/pricing';
import { createPendingOrder, type Address } from '@/lib/commerce/orders';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getAdapter, availableProviders } from '@/lib/payments';
import { publicEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const addressSchema = z.object({
  fullName: z.string().min(2).max(120),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  country: z.string().length(2),
  postalCode: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
});

const bodySchema = z.object({
  lines: z
    .array(z.object({ productSizeId: z.string().uuid(), quantity: z.number().int().min(1).max(10) }))
    .min(1)
    .max(50),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  promoCode: z.string().max(64).optional().nullable(),
  customerNote: z.string().max(1000).optional(),
  provider: z.enum(['paystack', 'flutterwave']),
  displayCurrency: z.enum(['NGN', 'USD', 'GBP']).optional(),
});

/**
 * Creates a pending order and hands back a provider payment URL.
 *
 * The request body carries identifiers, quantities and delivery details only.
 * Every monetary figure is recomputed here from the database, so a tampered
 * client cannot alter what is charged. Stock is not touched — it is committed
 * once the payment webhook verifies the transaction.
 */
export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;

  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid checkout details.', details: error instanceof z.ZodError ? error.issues : undefined },
      { status: 400 },
    );
  }

  const adapter = getAdapter(body.provider);
  if (!adapter.isConfigured()) {
    return NextResponse.json(
      { error: 'That payment method is unavailable.', available: availableProviders() },
      { status: 400 },
    );
  }

  // An account is optional: a signed-in session is attached when present.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cart = await priceCart({
    lines: body.lines,
    country: body.shippingAddress.country,
    state: body.shippingAddress.state,
    promoCode: body.promoCode ?? null,
    email: body.email,
  });

  if (!cart.lines.length) {
    return NextResponse.json({ error: 'Your bag is empty.', issues: cart.issues }, { status: 409 });
  }

  // Availability changed while the customer was checking out: stop and let
  // them review rather than charging for something we cannot ship.
  if (cart.issues.length) {
    return NextResponse.json(
      { error: 'Your bag has changed.', issues: cart.issues, cart: summarise(cart) },
      { status: 409 },
    );
  }

  if (cart.totalMinor <= 0) {
    return NextResponse.json({ error: 'This order total is invalid.' }, { status: 400 });
  }

  const order = await createPendingOrder({
    cart,
    email: body.email,
    phone: body.phone,
    userId: user?.id ?? null,
    shippingAddress: body.shippingAddress as Address,
    billingAddress: body.billingAddress as Address | undefined,
    customerNote: body.customerNote,
    displayCurrency: body.displayCurrency,
  });

  const reference = `${order.order_number}-${Date.now().toString(36)}`;
  const callbackUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/order/${order.order_number}`;

  const admin = createAdminClient();

  try {
    const initialised = await adapter.initialize({
      reference,
      amountMinor: cart.totalMinor,
      currency: cart.currency,
      email: body.email,
      callbackUrl,
      customerName: body.shippingAddress.fullName,
      customerPhone: body.phone ?? body.shippingAddress.phone,
      metadata: { order_id: order.id, order_number: order.order_number },
    });

    await admin.from('payments').insert({
      order_id: order.id,
      provider: body.provider,
      provider_reference: initialised.providerReference,
      status: 'pending',
      amount_minor: cart.totalMinor,
      currency: cart.currency,
      authorization_url: initialised.authorizationUrl,
    });

    return NextResponse.json({
      orderNumber: order.order_number,
      authorizationUrl: initialised.authorizationUrl,
      total: cart.totalMinor,
      currency: cart.currency,
    });
  } catch (error) {
    // The provider never accepted the payment, so the pending order would
    // otherwise linger as an orphan.
    await admin
      .from('orders')
      .update({ status: 'cancelled', admin_note: 'Payment initialisation failed.' })
      .eq('id', order.id);

    console.error('Payment initialisation failed', error);
    return NextResponse.json(
      { error: 'We could not start the payment. Please try again.' },
      { status: 502 },
    );
  }
}

function summarise(cart: Awaited<ReturnType<typeof priceCart>>) {
  return {
    subtotalMinor: cart.subtotalMinor,
    discountMinor: cart.discountMinor,
    shippingMinor: cart.shippingMinor,
    totalMinor: cart.totalMinor,
    currency: cart.currency,
    lines: cart.lines.map((line) => ({
      productSizeId: line.productSizeId,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      availableQuantity: line.availableQuantity,
    })),
  };
}
