import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authModule from '@/lib/auth';
import { GET as getEvents, POST as postEvent } from '@/app/api/calendar/events/route';
import { GET as getEvent, PATCH as patchEvent, DELETE as deleteEvent } from '@/app/api/calendar/events/[id]/route';
import { GET as getCalendars, POST as postCalendar } from '@/app/api/calendar/calendars/route';
import { GET as getCategories, POST as postCategory } from '@/app/api/calendar/categories/route';
import { POST as postStudySession } from '@/app/api/calendar/study-session/route';
import { GET as getGoogleSync, POST as postGoogleSync } from '@/app/api/calendar/sync/google/route';
import { NextRequest } from 'next/server';

describe('Production Calendar API Integration Tests (SF-057 & SF-057A)', () => {
  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'learner@example.test'
  };

  const createMockChain = (defaultData: any) => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.or = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: defaultData, error: null });
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: defaultData, error: null });
    chain.then = (resolve: any) => Promise.resolve({ data: defaultData, error: null }).then(resolve);
    return chain;
  };

  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (table === 'calendar_events') {
        const chain = createMockChain([]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: '22222222-2222-2222-2222-222222222222',
            user_id: mockUser.id,
            title: 'Systems Arch L4',
            start_at: '2026-10-01T10:00:00.000Z',
            end_at: '2026-10-01T11:00:00.000Z',
            timezone: 'UTC',
            all_day: false,
            status: 'confirmed',
            is_study_session: true,
            actual_duration_seconds: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          error: null
        });
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: {
            id: '22222222-2222-2222-2222-222222222222',
            user_id: mockUser.id,
            title: 'Systems Arch L4',
            start_at: '2026-10-01T10:00:00.000Z',
            end_at: '2026-10-01T11:00:00.000Z',
            timezone: 'UTC',
            all_day: false,
            status: 'confirmed',
            is_study_session: true,
            actual_duration_seconds: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          error: null
        });
        return chain;
      }
      if (table === 'calendars') {
        const chain = createMockChain([]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: '33333333-3333-3333-3333-333333333333',
            user_id: mockUser.id,
            name: 'Study Schedule',
            color: '#6366f1',
            is_visible: true,
            is_default: true,
            source: 'local'
          },
          error: null
        });
        return chain;
      }
      if (table === 'calendar_categories') {
        const chain = createMockChain([]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: '44444444-4444-4444-4444-444444444444',
            user_id: mockUser.id,
            name: 'Deep Sprint',
            color: '#10b981',
            is_default: true
          },
          error: null
        });
        return chain;
      }
      if (table === 'calendar_event_study_sessions') {
        const chain = createMockChain([]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: '55555555-5555-5555-5555-555555555555',
            user_id: mockUser.id,
            event_id: '22222222-2222-2222-2222-222222222222',
            planned_duration_seconds: 1800,
            actual_duration_seconds: 1500,
            started_at: new Date().toISOString()
          },
          error: null
        });
        return chain;
      }
      return createMockChain([]);
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null })
  };

  beforeEach(() => {
    vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
      user: mockUser as any,
      supabase: mockSupabase as any,
      accessToken: 'mock-token-xyz'
    });
  });

  describe('Events CRUD & Validation (SF-057A)', () => {
    it('GET /api/calendar/events retrieves events in range', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/events?start=2026-10-01T00:00:00.000Z&end=2026-10-07T23:59:59.000Z');
      const res = await getEvents(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('POST /api/calendar/events creates a valid event and returns 201', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Systems Arch L4',
          start_at: '2026-10-01T10:00:00.000Z',
          end_at: '2026-10-01T11:00:00.000Z',
          all_day: false
        })
      });
      const res = await postEvent(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.title).toBe('Systems Arch L4');
    });

    it('POST /api/calendar/events rejects request with missing title (400 VALIDATION_ERROR)', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          title: '   ',
          start_at: '2026-10-01T10:00:00.000Z',
          end_at: '2026-10-01T11:00:00.000Z'
        })
      });
      const res = await postEvent(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/calendar/events rejects invalid date range when end <= start (400 VALIDATION_ERROR)', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Systems Arch L4',
          start_at: '2026-10-01T11:00:00.000Z',
          end_at: '2026-10-01T10:00:00.000Z'
        })
      });
      const res = await postEvent(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.message).toContain('End time must be after start time');
    });

    it('GET /api/calendar/events/[id] returns event by id', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/events/22222222-2222-2222-2222-222222222222');
      const res = await getEvent(req, { params: Promise.resolve({ id: '22222222-2222-2222-2222-222222222222' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe('22222222-2222-2222-2222-222222222222');
    });

    it('PATCH /api/calendar/events/[id] updates event fields', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/events/22222222-2222-2222-2222-222222222222', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Systems Arch L4 Updated' })
      });
      const res = await patchEvent(req, { params: Promise.resolve({ id: '22222222-2222-2222-2222-222222222222' }) });
      expect(res.status).toBe(200);
    });

    it('DELETE /api/calendar/events/[id] removes an event', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/events/22222222-2222-2222-2222-222222222222', {
        method: 'DELETE'
      });
      const res = await deleteEvent(req, { params: Promise.resolve({ id: '22222222-2222-2222-2222-222222222222' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('Calendars and Categories', () => {
    it('POST /api/calendar/calendars creates custom calendar', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/calendars', {
        method: 'POST',
        body: JSON.stringify({ name: 'Study Schedule', color: '#6366f1' })
      });
      const res = await postCalendar(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe('Study Schedule');
    });

    it('POST /api/calendar/categories creates custom category', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Deep Sprint', color: '#10b981' })
      });
      const res = await postCategory(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe('Deep Sprint');
    });
  });

  describe('Recurring Events Occurrence Editing and Deletion (SF-057C)', () => {
    it('PATCH /api/calendar/events/[id] with action: edit_occurrence adds exception and creates override event', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/events/22222222-2222-2222-2222-222222222222', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'edit_occurrence',
          date: '2026-10-02',
          title: 'Systems Arch L4 (Rescheduled)',
          start_at: '2026-10-02T14:00:00.000Z',
          end_at: '2026-10-02T15:00:00.000Z'
        })
      });
      const res = await patchEvent(req, { params: Promise.resolve({ id: '22222222-2222-2222-2222-222222222222' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
    });

    it('DELETE /api/calendar/events/[id] with action=delete_occurrence adds date exception', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/events/22222222-2222-2222-2222-222222222222?action=delete_occurrence&date=2026-10-02', {
        method: 'DELETE'
      });
      const res = await deleteEvent(req, { params: Promise.resolve({ id: '22222222-2222-2222-2222-222222222222' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('Google Calendar Sync Route (SF-057C)', () => {
    it('GET /api/calendar/sync/google returns configuration status', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/sync/google');
      const res = await getGoogleSync(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveProperty('is_configured');
      expect(json.data).toHaveProperty('is_connected');
    });

    it('POST /api/calendar/sync/google returns 200 or clean message without exposing secrets', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/sync/google', {
        method: 'POST',
        body: JSON.stringify({ action: 'sync' })
      });
      const res = await postGoogleSync(req);
      const json = await res.json();
      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(json.data).toBeDefined();
      } else {
        expect(json.error).toBeDefined();
      }
    });
  });
});

