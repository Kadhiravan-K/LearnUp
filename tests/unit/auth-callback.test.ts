import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/auth/callback/route';
import { NextResponse } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null })
    }
  }))
}));

describe('Auth Callback Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to relative next path', async () => {
    const req = new Request('http://localhost:3000/auth/callback?code=test-code&next=/library/settings');
    const res = await GET(req);
    expect(res.status).toBe(307); // NextResponse.redirect defaults to 307
    expect(res.headers.get('location')).toBe('http://localhost:3000/library/settings');
  });

  it('prevents open redirect with absolute URLs', async () => {
    const req = new Request('http://localhost:3000/auth/callback?code=test-code&next=https://attacker.com/steal-token');
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/library');
  });

  it('prevents open redirect with protocol-relative URLs', async () => {
    const req = new Request('http://localhost:3000/auth/callback?code=test-code&next=//attacker.com');
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/library');
  });

  it('prevents open redirect with backslash bypass', async () => {
    const req = new Request('http://localhost:3000/auth/callback?code=test-code&next=/\\\\attacker.com');
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/library');
  });
});
