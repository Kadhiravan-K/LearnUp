import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authModule from '@/lib/auth';
import { GET as getFocusStats } from '@/app/api/focus/stats/route';
import { POST as postFocusSession } from '@/app/api/focus/session/route';
import { NextRequest } from 'next/server';

describe('Focus Sanctuary & Precision Timer API Integration Tests', () => {
  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'learner@example.test'
  };

  const createMockChain = (defaultData: any) => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: defaultData, error: null });
    chain.then = (resolve: any) => Promise.resolve({ data: defaultData, error: null }).then(resolve);
    return chain;
  };

  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (table === 'focus_sessions') {
        const chain = createMockChain([]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 'focus-session-1',
            user_id: mockUser.id,
            duration_seconds: 1500,
            mode: 'sprint',
            interval_number: 1,
            soundscape: 'binaural_40hz',
            completed: true,
            created_at: new Date().toISOString()
          },
          error: null
        });
        return chain;
      }
      return createMockChain([]);
    })
  };

  beforeEach(() => {
    vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
      user: mockUser as any,
      supabase: mockSupabase as any,
      accessToken: 'mock-token-xyz'
    });
  });

  describe('1. GET /api/focus/stats', () => {
    it('retrieves focus telemetry and streak statistics for authenticated user', async () => {
      const req = new NextRequest('http://localhost:3000/api/focus/stats');
      const res = await getFocusStats(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.dailyGoalMinutes).toBe(180);
      expect(json.data.todayFocusMinutes).toBe(0);
      expect(json.data.goalPercentage).toBe(0);
      expect(json.data.activeStreakDays).toBe(0);
    });
  });

  describe('2. POST /api/focus/session', () => {
    it('records a completed focus sprint session', async () => {
      const req = new NextRequest('http://localhost:3000/api/focus/session', {
        method: 'POST',
        body: JSON.stringify({
          duration_seconds: 1500,
          mode: 'sprint',
          interval_number: 1,
          soundscape: 'binaural_40hz',
          completed: true
        })
      });

      const res = await postFocusSession(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe('focus-session-1');
      expect(json.data.duration_seconds).toBe(1500);
    });

    it('rejects invalid duration with 400 VALIDATION_ERROR', async () => {
      const req = new NextRequest('http://localhost:3000/api/focus/session', {
        method: 'POST',
        body: JSON.stringify({
          duration_seconds: -10,
          mode: 'sprint'
        })
      });

      const res = await postFocusSession(req);
      expect(res.status).toBe(400);
    });
  });
});
