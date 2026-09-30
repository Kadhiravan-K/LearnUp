import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, ApiError } from '@/lib/api/client';

// Mock the Supabase browser client dependency
vi.mock('@/lib/supabase/browser', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ 
        data: { session: { access_token: 'mock_token_123' } } 
      })
    }
  }))
}));

describe('API Client Integration (apiFetch)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('injects auth token and returns data on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: '1', title: 'Test Video' }] })
    });

    const response = await apiFetch<{ data: Array<{ id: string; title: string }> }>('/api/learning-items');
    expect(response).toEqual({ data: [{ id: '1', title: 'Test Video' }] });
    
    // Verify token injection
    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toBe('/api/learning-items');
    expect(fetchCall[1].headers.get('Authorization')).toBe('Bearer mock_token_123');
    expect(fetchCall[1].headers.get('Content-Type')).toBe('application/json');
  });

  it('parses standard error envelopes correctly and throws typed ApiError', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 'VALIDATION_ERROR', message: 'Invalid YouTube URL provided.' } })
    });

    await expect(apiFetch('/api/learning-items')).rejects.toThrow(ApiError);
    await expect(apiFetch('/api/learning-items')).rejects.toThrow('Invalid YouTube URL provided.');
  });

  it('handles HTTP error without JSON envelope gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => { throw new Error('Bad gateway'); }
    });

    await expect(apiFetch('/api/learning-items')).rejects.toThrow('HTTP Error 502');
  });
});
