import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCustomRequest } from '@/lib/commerce/bespoke';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Measurements arrive in centimetres; the form converts from inches.
const measurement = z.number().min(20).max(300).optional().nullable();

const bodySchema = z.object({
  productSlug: z.string().max(160).optional().nullable(),
  contactEmail: z.string().email(),
  contactName: z.string().max(120).optional(),
  contactPhone: z.string().max(30).optional(),
  bustCm: measurement,
  waistCm: measurement,
  hipsCm: measurement,
  shoulderToHemCm: measurement,
  heightCm: measurement,
  preferredFabric: z.string().max(200).optional(),
  preferredColor: z.string().max(100).optional(),
  modificationNotes: z.string().max(2000).optional(),
  eventDate: z.string().date().optional().nullable(),
  referencePaths: z.array(z.string().max(400)).max(6).optional(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Please check the details you entered.',
        details: error instanceof z.ZodError ? error.issues : undefined,
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Uploads land under the uploader's own user-id prefix, which storage policy
  // enforces; reject any path that claims to belong to someone else.
  if (body.referencePaths?.length) {
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to attach reference images.' },
        { status: 401 },
      );
    }
    const foreign = body.referencePaths.some((path) => !path.startsWith(`${user.id}/`));
    if (foreign) {
      return NextResponse.json({ error: 'Invalid reference upload.' }, { status: 400 });
    }
  }

  let productId: string | null = null;
  if (body.productSlug) {
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('slug', body.productSlug)
      .maybeSingle();
    productId = product?.id ?? null;
  }

  try {
    const created = await createCustomRequest({
      userId: user?.id ?? null,
      productId,
      contactEmail: body.contactEmail,
      contactName: body.contactName ?? null,
      contactPhone: body.contactPhone ?? null,
      bustCm: body.bustCm ?? null,
      waistCm: body.waistCm ?? null,
      hipsCm: body.hipsCm ?? null,
      shoulderToHemCm: body.shoulderToHemCm ?? null,
      heightCm: body.heightCm ?? null,
      preferredFabric: body.preferredFabric ?? null,
      preferredColor: body.preferredColor ?? null,
      modificationNotes: body.modificationNotes ?? null,
      eventDate: body.eventDate ?? null,
      referencePaths: body.referencePaths,
    });

    return NextResponse.json({ ok: true, reference: created.reference });
  } catch (error) {
    console.error('Custom request failed', error);
    return NextResponse.json(
      { error: 'We could not record your request. Please try again.' },
      { status: 500 },
    );
  }
}
