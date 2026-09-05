import type { Metadata } from 'next';
import { CartView } from '@/components/cart/CartView';
import { getPublicSettings } from '@/lib/commerce/settings';

export const metadata: Metadata = {
  title: 'Your Bag',
  alternates: { canonical: '/cart' },
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const settings = await getPublicSettings();

  return (
    <div className="shell max-w-5xl py-14 lg:py-20">
      <header className="mb-12 text-center">
        <p className="eyebrow">Miyenka</p>
        <h1 className="display-lg mt-4">Your Bag</h1>
      </header>
      <CartView freeShippingThresholdMinor={settings.freeShippingThresholdMinor} />
    </div>
  );
}
