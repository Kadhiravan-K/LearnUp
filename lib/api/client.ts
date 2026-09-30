import { createClient } from '@/lib/supabase/browser';
import type { ErrorCode } from '@/lib/errors';

export class ApiError extends Error {
  public code: ErrorCode | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  
  constructor(code: ErrorCode | 'NETWORK_ERROR' | 'UNKNOWN_ERROR', message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new ApiError('NETWORK_ERROR', 'Network request failed. Please check your connection.');
  }

  // Handle empty responses (e.g., 204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  let json;
  try {
    json = await response.json();
  } catch (error) {
    if (!response.ok) {
      throw new ApiError('UNKNOWN_ERROR', `HTTP Error ${response.status}`);
    }
    return {} as T;
  }

  if (!response.ok) {
    if (json && typeof json === 'object' && 'error' in json) {
      const errPayload = (json as any).error;
      throw new ApiError(
        errPayload.code || 'UNKNOWN_ERROR',
        errPayload.message || 'An unexpected API error occurred.'
      );
    }
    throw new ApiError('UNKNOWN_ERROR', `HTTP Error ${response.status}`);
  }

  return json as T;
}
