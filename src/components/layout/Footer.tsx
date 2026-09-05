import Image from 'next/image';
import Link from 'next/link';
import { NewsletterForm } from '@/components/layout/NewsletterForm';

const COLUMNS = [
  {
    heading: 'Shop',
    links: [
      { href: '/shop?category=mini', label: 'Mini' },
      { href: '/shop?category=midi', label: 'Midi' },
      { href: '/shop?category=maxi', label: 'Maxi' },
      { href: '/shop?category=statement-gowns', label: 'Statement Gowns' },
      { href: '/new-arrivals', label: 'New Arrivals' },
    ],
  },
  {
    heading: 'The House',
    links: [
      { href: '/about', label: 'About Miyenka' },
      { href: '/collections/modern-muse', label: 'Modern Muse' },
      { href: '/collections/classic-sophisticate', label: 'Classic Sophisticate' },
      { href: '/custom', label: 'Bespoke Atelier' },
    ],
  },
  {
    heading: 'Client Care',
    links: [
      { href: '/contact', label: 'Contact' },
      { href: '/sizing', label: 'Sizing Chart' },
      { href: '/track-order', label: 'Track Order' },
      { href: '/account', label: 'My Account' },
      { href: '/policies/shipping', label: 'Shipping & Delivery' },
      { href: '/policies/returns', label: 'Returns Policy' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-28 bg-ink text-cream/85">
      <div className="shell py-20">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Image
              src="/brand/miyenka-logo-gold.png"
              alt="Miyenka"
              width={92}
              height={92}
              className="h-16 w-auto object-contain"
            />
            <p className="mt-6 font-display text-2xl font-light leading-snug text-cream">
              Fashion is your first voice.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-cream/55">
              Mini, midi, maxi and statement gowns, cut and finished by hand in our atelier.
              Ready-to-wear, or made entirely to your measurements.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-[0.65rem] uppercase tracking-luxe text-gold">{column.heading}</h2>
              <ul className="mt-6 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-cream/60 transition-colors duration-300 hover:text-cream"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 border-t border-cream/10 pt-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-display text-2xl font-light text-cream">The Miyenka Letter</h2>
              <p className="mt-2 max-w-md text-sm text-cream/55">
                First look at new arrivals, atelier notes and private appointments.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-cream/10 pt-8 text-[0.68rem] text-cream/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Miyenka. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/policies/privacy" className="hover:text-cream/80 transition-colors">Privacy</Link>
            <Link href="/policies/terms" className="hover:text-cream/80 transition-colors">Terms</Link>
            <Link href="/policies/returns" className="hover:text-cream/80 transition-colors">Returns</Link>
            <Link href="/policies/shipping" className="hover:text-cream/80 transition-colors">Shipping</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
