import Link from 'next/link';
import { SignOutButton } from '@/components/layout/SignOutButton';
import { createClient } from '@/lib/supabase/server';

const LINKS = [
  { href: '/account', label: 'Overview' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/wishlist', label: 'Wishlist' },
  { href: '/account/reviews', label: 'Reviews' },
  { href: '/account/details', label: 'Details' },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle()
    : { data: null };

  return (
    <div className="shell py-14 lg:py-20">
      <header className="mb-12">
        <p className="eyebrow">Your account</p>
        <h1 className="display-md mt-3">
          {profile?.full_name ? `Hello, ${profile.full_name.split(' ')[0]}` : 'Your account'}
        </h1>
        {profile?.email ? <p className="mt-2 text-sm text-ink-faint">{profile.email}</p> : null}
      </header>

      <div className="grid gap-12 lg:grid-cols-[13rem_1fr] lg:gap-16">
        <nav aria-label="Account" className="lg:sticky lg:top-28 lg:self-start">
          <ul className="flex gap-x-6 gap-y-2 overflow-x-auto lg:flex-col lg:gap-0">
            {LINKS.map((link) => (
              <li key={link.href} className="lg:border-b lg:border-ink/8">
                <Link
                  href={link.href}
                  className="block whitespace-nowrap py-3 text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <SignOutButton />
        </nav>

        <div>{children}</div>
      </div>
    </div>
  );
}
