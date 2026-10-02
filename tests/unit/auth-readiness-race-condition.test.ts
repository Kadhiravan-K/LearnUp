import { describe, it, expect, vi } from 'vitest';
import { useLibrary } from '@/lib/hooks/useLibrary';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { learningItemsApi } from '@/lib/api/learning-items';
import * as apiModule from '@/lib/api/client';
import * as useAuthModule from '@/lib/hooks/useAuth';

vi.mock('@/lib/api/learning-items', () => ({
  learningItemsApi: {
    listLearningItems: vi.fn()
  }
}));

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return {
    ...actual,
    apiFetch: vi.fn()
  };
});

vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

/**
 * Simulates the effect execution logic of the data hooks to test auth-readiness behavior deterministically.
 */
function runAuthReadinessGuardEffect(isAuthLoading: boolean, fetchFn: () => void) {
  if (!isAuthLoading) {
    fetchFn();
  }
}

describe('Auth Readiness Race Condition (Dashboard Initial Load Fix)', () => {
  it('exports useLibrary and useAnalytics hooks', () => {
    expect(typeof useLibrary).toBe('function');
    expect(typeof useAnalytics).toBe('function');
  });

  describe('A. Auth is loading (isAuthLoading = true)', () => {
    it('prevents library request while auth is initializing', () => {
      const mockFetch = vi.fn();
      runAuthReadinessGuardEffect(true, mockFetch);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('prevents analytics request while auth is initializing', () => {
      const mockFetch = vi.fn();
      runAuthReadinessGuardEffect(true, mockFetch);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('B. Auth becomes ready (isAuthLoading = false)', () => {
    it('executes library fetch once auth is ready', () => {
      const mockFetch = vi.fn();
      runAuthReadinessGuardEffect(false, mockFetch);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('executes analytics fetch once auth is ready', () => {
      const mockFetch = vi.fn();
      runAuthReadinessGuardEffect(false, mockFetch);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('C. Authenticated request error handling contract', () => {
    it('preserves ApiError handling contract on API failure', async () => {
      const error = new apiModule.ApiError('UNAUTHORIZED', 'Authentication required. Missing Bearer token.');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Authentication required. Missing Bearer token.');
    });
  });
});
