import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import { CartProvider } from '@/components/cart/CartProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WhatsappLauncher } from '@/components/layout/WhatsappLauncher';
import { getPublicSettings, getWhatsappContacts } from '@/lib/commerce/settings';
import '@/styles/globals.css';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-sans',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Miyenka — Luxury Dresses & Statement Gowns',
    template: '%s · Miyenka',
  },
  description:
    'Miyenka is a luxury fashion house for mini, midi, maxi and statement gowns. Ready-to-wear and bespoke, cut and finished by hand.',
  keywords: ['luxury dresses', 'statement gowns', 'bespoke dresses', 'Nigerian fashion', 'Miyenka'],
  openGraph: {
    type: 'website',
    siteName: 'Miyenka',
    title: 'Miyenka — Luxury Dresses & Statement Gowns',
    description: 'Ready-to-wear and bespoke gowns, cut and finished by hand.',
    url: siteUrl,
    images: [{ url: '/lookbook/gilded-tassel-gown-studio.jpg', width: 1080, height: 1620, alt: 'Miyenka' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Miyenka — Luxury Dresses & Statement Gowns',
    description: 'Ready-to-wear and bespoke gowns, cut and finished by hand.',
    images: ['/lookbook/gilded-tassel-gown-studio.jpg'],
  },
  icons: { icon: '/brand/miyenka-logo-gold.png', apple: '/brand/miyenka-logo-gold.png' },
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#FAF6F1',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, contacts] = await Promise.all([getPublicSettings(), getWhatsappContacts()]);

  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-5 focus:py-3 focus:text-cream"
        >
          Skip to content
        </a>

        <CartProvider>
          <Header announcement={settings.announcement.enabled ? settings.announcement : null} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <CartDrawer freeShippingThresholdMinor={settings.freeShippingThresholdMinor} />
        </CartProvider>

        <WhatsappLauncher contacts={contacts} />
      </body>
    </html>
  );
}
