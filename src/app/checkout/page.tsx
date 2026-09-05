import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/cart/CheckoutForm';
import { availableProviders } from '@/lib/payments';
import { createClient } from '@/lib/supabase/server';
import { getWhatsappContacts } from '@/lib/commerce/settings';

export const metadata: Metadata = {
  title: 'Checkout',
  alternates: { canonical: '/checkout' },
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profile, contacts] = await Promise.all([
    user
      ? supabase.from('profiles').select('email, full_name, phone').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    getWhatsappContacts(),
  ]);

  return (
    <CheckoutForm
      providers={availableProviders()}
      defaults={{
        email: profile.data?.email ?? user?.email ?? '',
        fullName: profile.data?.full_name ?? '',
        phone: profile.data?.phone ?? '',
      }}
      signedIn={Boolean(user)}
      careContacts={contacts}
    />
  );
}
