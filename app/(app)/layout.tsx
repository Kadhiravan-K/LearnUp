import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { AppShell } from '@/components/layout/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  // Use getSession() instead of getUser() — getUser() makes a network call to
  // Supabase which fails in environments with TLS issues. getSession() reads
  // the JWT from the cookie locally.
  const { data: { session } } = await supabase.auth.getSession();
  const cookieStore = cookies();
  const isGuest = cookieStore.get('LearnUp_guest_mode')?.value === 'true';

  if (!session && !isGuest) {
    redirect('/login');
  }

  return <AppShell>{children}</AppShell>;
}
