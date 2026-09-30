import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authModule from '@/lib/auth';
import { GET as getAnalytics } from '@/app/api/analytics/route';
import { NextRequest } from 'next/server';

describe('Analytics & Intelligence Hub API Integration Tests', () => {
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
      if (table === 'learning_items') {
        return createMockChain([
          {
            id: 'course-1',
            user_id: mockUser.id,
            title: 'Medical Neuroscience',
            skill_domain: 'Medicine',
            total_duration_seconds: 7200
          }
        ]);
      }
      if (table === 'video_progress') {
        return createMockChain([
          {
            id: 'prog-1',
            user_id: mockUser.id,
            position_seconds: 3600,
            updated_at: new Date().toISOString()
          }
        ]);
      }
      if (table === 'focus_sessions') {
        return createMockChain([
          {
            id: 'focus-1',
            user_id: mockUser.id,
            duration_seconds: 1500,
            completed: true,
            created_at: new Date().toISOString()
          }
        ]);
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

  it('GET /api/analytics returns dynamic telemetry computed from user rows', async () => {
    const req = new NextRequest('http://localhost:3000/api/analytics');
    const res = await getAnalytics(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.totalMinutes).toBeGreaterThan(0);
    expect(json.data.skillDomains).toHaveLength(1);
    expect(json.data.skillDomains[0].name).toBe('Medicine');
    expect(json.data.consistencyHeatmap).toHaveLength(365);
    expect(json.data.activeStreakDays).toBe(1);
  });
});
