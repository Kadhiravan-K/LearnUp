import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware helper that synchronizes Supabase auth state between the client
 * and server.
 *
 * Supports authenticated sessions as well as client-side Guest Mode sessions.
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Use getSession() — reads from cookie locally, no network call.
  const { data: { session } } = await supabase.auth.getSession();
  const isGuestMode = request.cookies.get('studyflow_guest_mode')?.value === 'true';

  const pathname = request.nextUrl.pathname;
  const isLibraryRoute = pathname.startsWith('/library');
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  // Not authenticated and not guest → trying to access protected route → redirect to /login
  if (!session && !isGuestMode && isLibraryRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Authenticated with real account → trying to access auth pages → redirect to /dashboard
  if (session && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}
