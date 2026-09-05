'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const [working, setWorking] = useState(false);

  async function signOut() {
    setWorking(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={working}
      className="mt-7 text-[0.65rem] uppercase tracking-luxe text-ink-faint underline-offset-4 hover:text-burgundy hover:underline disabled:opacity-50"
    >
      {working ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
