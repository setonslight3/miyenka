import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  orderItemId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(4000).optional(),
  mediaPaths: z.array(z.string().max(400)).max(4).optional(),
});

/**
 * Submits a review for moderation.
 *
 * Eligibility is checked here for a clear error message, but the real guard is
 * the reviews INSERT policy, which calls can_review_order_item() — so a
 * customer calling this endpoint directly still cannot review a piece they did
 * not buy and receive. The insert runs through the caller's own session, never
 * the service-role client, so that policy actually applies.
 */
export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Please check your review.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Please sign in to leave a review.' }, { status: 401 });
  }

  const { data: eligible } = await supabase.rpc('can_review_order_item', {
    p_order_item_id: body.orderItemId,
    p_user_id: user.id,
  });

  if (eligible !== true) {
    return NextResponse.json(
      { error: 'Only pieces you have purchased and received can be reviewed, once each.' },
      { status: 403 },
    );
  }

  const { data: orderItem } = await supabase
    .from('order_items')
    .select('product_id')
    .eq('id', body.orderItemId)
    .maybeSingle();

  if (!orderItem?.product_id) {
    return NextResponse.json({ error: 'That purchase cannot be reviewed.' }, { status: 400 });
  }

  if (body.mediaPaths?.length && body.mediaPaths.some((path) => !path.startsWith(`${user.id}/`))) {
    return NextResponse.json({ error: 'Invalid photo upload.' }, { status: 400 });
  }

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      product_id: orderItem.product_id,
      user_id: user.id,
      order_item_id: body.orderItemId,
      rating: body.rating,
      title: body.title ?? null,
      body: body.body ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !review) {
    // A unique violation here means the line has already been reviewed.
    const duplicate = (error as { code?: string } | null)?.code === '23505';
    return NextResponse.json(
      { error: duplicate ? 'You have already reviewed this piece.' : 'We could not save your review.' },
      { status: duplicate ? 409 : 500 },
    );
  }

  if (body.mediaPaths?.length) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    await supabase.from('review_media').insert(
      body.mediaPaths.map((path, index) => ({
        review_id: review.id,
        url: `${base}/storage/v1/object/public/review-media/${path}`,
        position: index,
      })),
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Thank you. Your review has been sent for moderation and will appear once published.',
  });
}
