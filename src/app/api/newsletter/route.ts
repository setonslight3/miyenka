import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  email: z.string().email().max(254),
  source: z.string().max(64).optional(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Re-subscribing someone who previously opted out is treated as a fresh
  // opt-in rather than an error.
  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert(
      {
        email: body.email.toLowerCase(),
        source: body.source ?? 'website',
        is_subscribed: true,
        unsubscribed_at: null,
      },
      { onConflict: 'email' },
    );

  if (error) {
    console.error('Newsletter subscribe failed', error);
    return NextResponse.json({ error: 'We could not sign you up. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
