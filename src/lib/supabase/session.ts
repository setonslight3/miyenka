import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session on every request and gates `/admin` and
 * `/account`. Admin membership is confirmed against the database, never
 * against a client-supplied claim.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/sign-in')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/sign-in';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    const { data: isAdmin } = await supabase.rpc('is_active_admin');
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/sign-in';
      url.searchParams.set('error', 'not-authorized');
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith('/account') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
