import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminSignInForm } from '@/components/admin/AdminSignInForm';

export const metadata: Metadata = {
  title: 'Admin Sign In',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminSignInPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <h1 className="font-display text-3xl font-light">Miyenka Admin</h1>
      <p className="mt-2 text-sm text-ink-muted">Authorised access only.</p>
      <Suspense fallback={null}>
        <AdminSignInForm />
      </Suspense>
    </div>
  );
}
