import type { Metadata } from 'next';
import { TrackOrderForm } from '@/components/cart/TrackOrderForm';

export const metadata: Metadata = {
  title: 'Track Your Order',
  description: 'Look up a Miyenka order using your order number and email address.',
  alternates: { canonical: '/track-order' },
};

export default function TrackOrderPage() {
  return (
    <div className="shell max-w-md py-16 lg:py-24">
      <header className="text-center">
        <p className="eyebrow">Client Care</p>
        <h1 className="display-md mt-3">Track your order</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          Enter your order number and the email address you used at checkout.
        </p>
      </header>
      <TrackOrderForm />
    </div>
  );
}
