import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';

if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new AppError(
      'INTERNAL_ERROR',
      'Database configuration error: Supabase environment variables are missing',
      500
    );
  }

  return { url, anonKey };
}

/**
 * Creates a public/anon Supabase client.
 */
export function createAnonClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey);
}

/**
 * Creates a scoped Supabase client with the user's JWT in the Authorization header.
 * This guarantees PostgreSQL evaluates auth.uid() matching the user, enforcing RLS.
 */
export function createScopedClient(accessToken: string): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}
