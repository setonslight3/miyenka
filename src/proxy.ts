import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

/**
 * Runs before every matched request: refreshes the Supabase session cookie and
 * gates /admin and /account. Admin membership is confirmed against the
 * database, never against a client-supplied claim.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|media|brand|lookbook|.*\\.(?:svg|png|jpg|jpeg|webp|avif|gif|mp4)$).*)',
  ],
};
