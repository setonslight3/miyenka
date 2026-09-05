import { NextResponse } from 'next/server';
import { z } from 'zod';
import { priceCart } from '@/lib/commerce/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  lines: z
    .array(z.object({ productSizeId: z.string().uuid(), quantity: z.number().int().min(1).max(10) }))
    .min(1)
    .max(50),
  country: z.string().length(2).optional(),
  state: z.string().max(100).optional(),
  promoCode: z.string().max(64).nullable().optional(),
  email: z.string().email().optional(),
});

/**
 * Quotes a cart as the customer fills in their address.
 *
 * Read-only: it prices the bag and returns totals, but creates nothing. The
 * authoritative figures are produced again in /api/checkout when the order is
 * written, so a stale quote can never determine what is charged.
 */
export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid quote request.' }, { status: 400 });
  }

  const cart = await priceCart({
    lines: body.lines,
    country: body.country,
    state: body.state,
    promoCode: body.promoCode ?? null,
    email: body.email ?? null,
  });

  return NextResponse.json({
    subtotalMinor: cart.subtotalMinor,
    discountMinor: cart.discountMinor,
    shippingMinor: cart.shippingMinor,
    taxMinor: cart.taxMinor,
    totalMinor: cart.totalMinor,
    currency: cart.currency,
    promoApplied: cart.promotionId !== null,
    issues: cart.issues,
  });
}
