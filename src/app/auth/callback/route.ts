import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * OAuth / email-confirmation landing point.
 *
 * The `next` parameter is constrained to a same-site path so this route cannot
 * be used as an open redirect.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const requested = url.searchParams.get('next') ?? '/account';

  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/account';

  if (!code) {
    return NextResponse.redirect(new URL('/sign-in?error=missing-code', url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/sign-in?error=auth-failed', url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
