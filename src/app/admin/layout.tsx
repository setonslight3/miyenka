import Link from 'next/link';
import Image from 'next/image';
import { SignOutButton } from '@/components/layout/SignOutButton';
import { createClient } from '@/lib/supabase/server';

/**
 * The admin shell is deliberately plain: it is a working tool, not a
 * storefront surface, so it stays legible and dense rather than editorial.
 */
const SECTIONS = [
  {
    heading: 'Trade',
    links: [
      { href: '/admin', label: 'Overview' },
      { href: '/admin/orders', label: 'Orders' },
      { href: '/admin/bespoke', label: 'Bespoke' },
      { href: '/admin/customers', label: 'Customers' },
    ],
  },
  {
    heading: 'Catalogue',
    links: [
      { href: '/admin/products', label: 'Products' },
      { href: '/admin/reviews', label: 'Reviews' },
      { href: '/admin/content', label: 'Homepage' },
    ],
  },
  {
    heading: 'Configuration',
    links: [
      { href: '/admin/shipping', label: 'Shipping' },
      { href: '/admin/promotions', label: 'Promotions' },
      { href: '/admin/settings', label: 'Settings' },
      { href: '/admin/admins', label: 'Admins' },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The sign-in page lives under /admin, so the chrome is rendered only for a
  // confirmed admin. Pages enforce their own access via requireAdmin(); this
  // simply avoids showing the navigation to someone who cannot use it.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: isAdmin } = user
    ? await supabase.rpc('is_active_admin')
    : { data: false };

  if (!isAdmin) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex w-full max-w-[100rem] gap-0">
        <aside className="hidden w-56 shrink-0 border-r border-ink/10 lg:block">
          <div className="sticky top-0 flex h-screen flex-col p-6">
            <Link href="/admin" className="flex items-center gap-2.5">
              <Image src="/brand/miyenka-logo-gold.png" alt="" width={28} height={28} className="h-7 w-auto" />
              <span className="font-display text-sm tracking-[0.2em] uppercase">Miyenka</span>
            </Link>

            <nav aria-label="Admin" className="mt-8 flex-1 space-y-7 overflow-y-auto">
              {SECTIONS.map((section) => (
                <div key={section.heading}>
                  <p className="text-[0.58rem] uppercase tracking-luxe text-ink-faint">
                    {section.heading}
                  </p>
                  <ul className="mt-2.5 space-y-0.5">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="block rounded px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-cream-deep/60 hover:text-ink"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="border-t border-ink/10 pt-4">
              <Link href="/" className="block text-xs text-ink-faint hover:text-ink">
                View storefront →
              </Link>
              <SignOutButton />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10">
          {/* Mobile nav */}
          <nav aria-label="Admin" className="mb-6 flex gap-4 overflow-x-auto border-b border-ink/10 pb-3 lg:hidden">
            {SECTIONS.flatMap((section) => section.links).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap text-xs text-ink-muted hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {children}
        </main>
      </div>
    </div>
  );
}
