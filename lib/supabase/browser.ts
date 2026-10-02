import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured for this environment.');
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}

export function formatAuthError(error: any): string {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return 'Supabase configuration is missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the deployment environment.';
  }

  const msg = error?.message || String(error);

  if (msg === 'Failed to fetch') {
    const isLocal = process.env.NEXT_PUBLIC_SUPABASE_URL.includes('127.0.0.1') || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost');
    if (isLocal) {
      return 'Local Supabase is not running. Start Docker Desktop, then run: npm run db:start';
    }
    return 'Network error connecting to authentication service.';
  }

  return msg;
}

