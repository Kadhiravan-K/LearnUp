import { createServerClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { AuthenticatedUser } from '../types';
import { createAnonClient, createScopedClient } from '../supabase/client';

export interface AuthContext {
  user: AuthenticatedUser;
  accessToken: string;
  supabase: SupabaseClient;
}

/**
 * Enforces authentication from an HTTP Request.
 * Verifies Bearer token with Supabase Auth.
 * Returns the authenticated user and a scoped SupabaseClient bound to the user's session.
 */
export async function requireAuth(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  const cookieHeader = req.headers.get('cookie') || '';
  // If no Bearer header, inspect cookie header for active browser session
  if (!token && cookieHeader) {
    const matchToken = cookieHeader.match(/sb-access-token=([^;]+)/);
    if (matchToken) {
      token = decodeURIComponent(matchToken[1]);
    } else {
      const matchAuthJson = cookieHeader.match(/sb-[a-zA-Z0-9_-]+-auth-token=([^;]+)/);
      if (matchAuthJson) {
        try {
          const raw = decodeURIComponent(matchAuthJson[1]);
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed[0]?.access_token) {
            token = parsed[0].access_token;
          } else if (parsed?.access_token) {
            token = parsed.access_token;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // Handle guest mode session
  if (token === 'guest-session' || (!token && cookieHeader.includes('LearnUp_guest_mode=true'))) {
    const anonClient = createAnonClient();
    return {
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'guest@LearnUp.local'
      },
      accessToken: 'guest-session',
      supabase: anonClient
    };
  }

  if (!token && cookieHeader) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new AppError('INTERNAL_ERROR', 'Authentication service is not configured.', 500);
    }

    const cookies = cookieHeader.split(';').flatMap((part) => {
      const separator = part.indexOf('=');
      if (separator < 1) return [];
      const name = part.slice(0, separator).trim();
      const rawValue = part.slice(separator + 1).trim();
      if (!name) return [];

      try {
        return [{ name, value: decodeURIComponent(rawValue) }];
      } catch {
        return [{ name, value: rawValue }];
      }
    });
    if (!cookies.some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name))) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookies,
        setAll: () => undefined
      }
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired session.', 401);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired session.', 401);
    }

    return {
      user: {
        id: user.id,
        email: user.email
      },
      accessToken: session.access_token,
      supabase
    };
  }

  if (!token) {
    throw new AppError('UNAUTHORIZED', 'Authentication required. Missing Bearer token.', 401);
  }

  const anonClient = createAnonClient();
  const {
    data: { user },
    error
  } = await anonClient.auth.getUser(token);

  if (error || !user) {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired session token.', 401);
  }

  const scopedClient = createScopedClient(token);

  return {
    user: {
      id: user.id,
      email: user.email
    },
    accessToken: token,
    supabase: scopedClient
  };
}
