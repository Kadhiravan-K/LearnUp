import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeoutMs = 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (init?.signal) {
    init.signal.addEventListener('abort', () => controller.abort());
  }

  return fetch(input, {
    ...init,
    signal: controller.signal
  }).finally(() => clearTimeout(timer));
}

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured for this environment.');
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: fetchWithTimeout
    }
  });
  return client;
}

export function formatAuthError(error: any): string {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return 'Supabase configuration is missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the deployment environment.';
  }

  const msg = error?.message || String(error);
  const name = error?.name || '';

  const isNetworkFailure =
    msg === 'Failed to fetch' ||
    name === 'AuthRetryableFetchError' ||
    msg.includes('fetch failed') ||
    msg.includes('NetworkError') ||
    msg.includes('ECONNREFUSED') ||
    msg === 'An unexpected error occurred';

  if (isNetworkFailure) {
    const isLocal = process.env.NEXT_PUBLIC_SUPABASE_URL.includes('127.0.0.1') || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost');
    if (isLocal) {
      return 'Local Supabase is not running. Please start Docker Desktop and run `npm run db:start`, or click "Browse as Guest" to test immediately.';
    }
    return 'Network error connecting to authentication service. Please check your connection and try again.';
  }

  return msg;
}

