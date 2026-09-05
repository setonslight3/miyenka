import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/layout/AuthForm';

export const metadata: Metadata = {
  title: 'Create Account',
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <div className="shell max-w-md py-16 lg:py-24">
      <header className="text-center">
        <p className="eyebrow">Miyenka</p>
        <h1 className="display-md mt-3">Create your account</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Save your wishlist, follow your orders and review the pieces you receive.
        </p>
      </header>
      <Suspense fallback={null}>
        <AuthForm mode="sign-up" />
      </Suspense>
    </div>
  );
}
