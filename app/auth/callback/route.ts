import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/library';
  // Prevent Open Redirect: ensure `next` is a relative path and does not start with '//' or contain backslashes
  const next = (rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\'))
    ? rawNext
    : '/library';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions or login
  return NextResponse.redirect(`${origin}/login`);
}
