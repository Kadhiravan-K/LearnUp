import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn()
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock
}));

import { requireAuth } from '@/lib/auth';

describe('requireAuth Supabase SSR cookie sessions', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon-key');
    createServerClientMock.mockReset();
  });

  it('delegates encoded and chunked session cookies to the Supabase SSR cookie adapter', async () => {
    let receivedCookies: Array<{ name: string; value: string }> = [];
    const user = { id: 'user-123', email: 'learner@example.test' };
    createServerClientMock.mockImplementation((_url, _key, options) => {
      receivedCookies = options.cookies.getAll();
      return {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'session-token' } },
            error: null
          })
        }
      };
    });

    const request = new Request('https://learnup.example.test/api/calendar/events', {
      headers: {
        cookie: 'sb-project-auth-token.0=base64-eyJhY2N; sb-project-auth-token.1=ZXNzX3Rva2VuIn0; LearnUp_theme=dark'
      }
    });
    const context = await requireAuth(request);

    expect(context.user).toEqual(user);
    expect(context.accessToken).toBe('session-token');
    expect(receivedCookies).toEqual([
      { name: 'sb-project-auth-token.0', value: 'base64-eyJhY2N' },
      { name: 'sb-project-auth-token.1', value: 'ZXNzX3Rva2VuIn0' },
      { name: 'LearnUp_theme', value: 'dark' }
    ]);
  });

  it('rejects requests containing unrelated cookies but no Supabase auth cookie', async () => {
    const request = new Request('https://learnup.example.test/api/calendar/events', {
      headers: { cookie: 'LearnUp_theme=dark' }
    });

    await expect(requireAuth(request)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      statusCode: 401
    });
    expect(createServerClientMock).not.toHaveBeenCalled();
  });
});
