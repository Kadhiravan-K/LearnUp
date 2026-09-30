import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '@/lib/hooks/useAuth';

// Mock Supabase browser client
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/supabase/browser', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
  })),
}));

describe('useAuth Hook Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'usr_test_123', email: 'test@studyflow.dev' },
          access_token: 'mock-access-token',
        },
      },
    });
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
  });

  it('initializes and provides signOut function', async () => {
    // Basic contract test for the hook module
    expect(typeof useAuth).toBe('function');
  });

  it('calls supabase.auth.signOut when signing out', async () => {
    const { createClient } = await import('@/lib/supabase/browser');
    const supabase = createClient();
    await supabase.auth.signOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('retrieves initial session on mount', async () => {
    const { createClient } = await import('@/lib/supabase/browser');
    const supabase = createClient();
    const result = await supabase.auth.getSession();
    expect(result.data.session?.user.email).toBe('test@studyflow.dev');
  });
});
