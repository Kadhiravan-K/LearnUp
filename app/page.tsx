import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

interface HomePageProps {
  searchParams?: {
    code?: string;
    error?: string;
    error_description?: string;
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const supabase = createClient();

  if (searchParams?.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(searchParams.code);
    if (!error) {
      redirect('/dashboard');
    }
  }

  const { data: { session } } = await supabase.auth.getSession();
  const cookieStore = cookies();
  const isGuest = cookieStore.get('LearnUp_guest_mode')?.value === 'true';

  if (session || isGuest) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
