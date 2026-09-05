import type { Metadata } from 'next';
import { ProfileForm } from '@/components/layout/ProfileForm';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Your Details', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AccountDetails() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('full_name, phone, email, marketing_opt_in')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="max-w-md">
      <h2 className="eyebrow mb-6">Your details</h2>
      <ProfileForm
        initial={{
          fullName: profile?.full_name ?? '',
          phone: profile?.phone ?? '',
          email: profile?.email ?? user?.email ?? '',
          marketingOptIn: profile?.marketing_opt_in ?? false,
        }}
      />
    </div>
  );
}
