import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/layout/AuthForm';

export const metadata: Metadata = {
  title: 'Sign In',
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <div className="shell max-w-md py-16 lg:py-24">
      <header className="text-center">
        <p className="eyebrow">Miyenka</p>
        <h1 className="display-md mt-3">Welcome back</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Sign in to see your orders, wishlist and bespoke commissions.
        </p>
      </header>
      <Suspense fallback={null}>
        <AuthForm mode="sign-in" />
      </Suspense>
    </div>
  );
}
