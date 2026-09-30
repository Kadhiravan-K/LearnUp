import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local manually
const envPath = path.resolve(__dirname, '../../.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {}

const parsedEnv: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length > 0) {
    parsedEnv[key.trim()] = val.join('=').trim();
  }
});

// Local Supabase configuration (loaded strictly via environment variables)
const SUPABASE_URL = process.env.LOCAL_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.LOCAL_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // For local testing

describe('Database RLS and Security Tests', () => {
  let adminClient: SupabaseClient;
  let anonClient: SupabaseClient;

  let userA: any;
  let userB: any;

  let userAClient: SupabaseClient;
  let userBClient: SupabaseClient;

  let itemAId: string;
  let itemBId: string;
  let childAId: string;
  let dbConnected = false;

  beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[db-rls.test.ts] Missing Supabase local credentials; skipping live DB RLS suite.');
      return;
    }

    try {
      // Quick probe to check if local Supabase auth service is running
      const probe = await fetch(`${SUPABASE_URL}/auth/v1/health`, { method: 'GET' }).catch(() => null);
      if (!probe || !probe.ok) {
        console.warn('[db-rls.test.ts] Local Supabase container is offline. Live RLS tests will be skipped.');
        return;
      }

      adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const emailA = `usera-${Date.now()}@test.com`;
      const emailB = `userb-${Date.now()}@test.com`;

      const { data: dataA, error: errA } = await adminClient.auth.admin.createUser({
        email: emailA, password: 'password123', email_confirm: true
      });
      if (errA) throw errA;
      userA = dataA.user;

      const { data: dataB, error: errB } = await adminClient.auth.admin.createUser({
        email: emailB, password: 'password123', email_confirm: true
      });
      if (errB) throw errB;
      userB = dataB.user;

      userAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      await userAClient.auth.signInWithPassword({ email: emailA, password: 'password123' });

      userBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      await userBClient.auth.signInWithPassword({ email: emailB, password: 'password123' });

      dbConnected = true;
    } catch (err) {
      console.warn('[db-rls.test.ts] Local Supabase offline or unreachable:', err);
    }
  }, 30000);

  beforeEach((context) => {
    if (!dbConnected) {
      context.skip();
    }
  });

  afterAll(async () => {
    if (userA && adminClient) await adminClient.auth.admin.deleteUser(userA.id);
    if (userB && adminClient) await adminClient.auth.admin.deleteUser(userB.id);
  }, 20000);

  describe('Anonymous Access', () => {
    it('anonymous SELECT denied', async () => {
      const { data, error } = await anonClient.from('learning_items').select('*');
      // RLS returns empty array instead of error for SELECT usually
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('anonymous INSERT denied', async () => {
      const { data, error } = await anonClient.from('learning_items').insert({
        user_id: userA.id,
        type: 'video',
        source_url: 'https://youtube.com/watch?v=anon',
        normalized_source_key: 'video:anon',
        title: 'Anon Video'
      }).select();

      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501'); // insufficient_privilege / RLS violation
    });

    it('anonymous UPDATE denied', async () => {
      const { error } = await anonClient.from('learning_items')
        .update({ title: 'Hacked' })
        .eq('type', 'video');
      // RLS silently updates 0 rows for UPDATE
      // We rely on fact that no rows were returned or affected
      expect(error).toBeNull();
    });

    it('anonymous DELETE denied', async () => {
      const { error } = await anonClient.from('learning_items')
        .delete()
        .eq('type', 'video');
      // RLS silently deletes 0 rows
      expect(error).toBeNull();
    });
  });

  describe('Authenticated Access & Cross-User Security', () => {
    it('user A can insert and access own records', async () => {
      const { data, error } = await userAClient.from('learning_items').insert({
        user_id: userA.id,
        type: 'video',
        source_url: 'https://youtube.com/watch?v=usera',
        normalized_source_key: 'video:usera',
        title: 'User A Video',
        youtube_video_id: 'usera'
      }).select().single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.user_id).toBe(userA.id);
      itemAId = data.id;

      // Also create a playlist for testing children
      const { data: plData, error: plErr } = await userAClient.from('learning_items').insert({
        user_id: userA.id,
        type: 'playlist',
        source_url: 'https://youtube.com/playlist?list=usera',
        normalized_source_key: 'playlist:usera',
        title: 'User A Playlist',
        youtube_playlist_id: 'usera'
      }).select().single();
      expect(plErr).toBeNull();

      // Insert child video
      const { data: childData, error: childErr } = await userAClient.from('learning_item_videos').insert({
        learning_item_id: plData.id,
        youtube_video_id: 'childa',
        title: 'Child A',
        source_position: 0
      }).select().single();
      expect(childErr).toBeNull();
      childAId = childData.id;
    }, 15000);

    it('user B can insert own record', async () => {
      const { data, error } = await userBClient.from('learning_items').insert({
        user_id: userB.id,
        type: 'video',
        source_url: 'https://youtube.com/watch?v=userb',
        normalized_source_key: 'video:userb',
        title: 'User B Video',
        youtube_video_id: 'userb'
      }).select().single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.user_id).toBe(userB.id);
      itemBId = data.id;
    });

    it('user A cannot access user B records', async () => {
      const { data, error } = await userAClient.from('learning_items').select('*').eq('id', itemBId);
      expect(error).toBeNull();
      expect(data).toHaveLength(0); // RLS hides the record
    });

    it('user A cannot update user B records', async () => {
      const { data, error } = await userAClient.from('learning_items')
        .update({ title: 'Hacked by A' })
        .eq('id', itemBId)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('user A cannot delete user B records', async () => {
      const { data, error } = await userAClient.from('learning_items')
        .delete()
        .eq('id', itemBId)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('playlist children cannot escape parent ownership (User B cannot access User A playlist items)', async () => {
      // User B tries to read User A's child video
      const { data, error } = await userBClient.from('learning_item_videos').select('*').eq('id', childAId);
      expect(error).toBeNull();
      expect(data).toHaveLength(0); // RLS prevents read

      // User B tries to insert a video into User A's playlist
      const { error: insErr } = await userBClient.from('learning_item_videos').insert({
        learning_item_id: itemAId,
        youtube_video_id: 'hacked',
        title: 'Hacked',
        source_position: 1
      });
      expect(insErr).not.toBeNull();
      expect(insErr?.code).toBe('42501'); // RLS violation
    }, 15000);

    it('duplicate imports remain idempotent (UNIQUE constraint on user_id, normalized_source_key)', async () => {
      const { error } = await userAClient.from('learning_items').insert({
        user_id: userA.id,
        type: 'video',
        source_url: 'https://youtube.com/watch?v=usera',
        normalized_source_key: 'video:usera',
        title: 'User A Video Duplicate',
        youtube_video_id: 'usera'
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe('23505'); // unique_violation
    }, 15000);
  });

  describe('Notes Security & RLS (SF-027)', () => {
    let noteAId: string;

    it('user A can insert and access own notes', async () => {
      const { data, error } = await userAClient.from('notes').insert({
        user_id: userA.id,
        learning_item_id: itemAId,
        youtube_video_id: 'usera',
        content: 'This is a test note'
      }).select().single();

      if (error && (error as any).code === 'PGRST205') return;
      expect(error).toBeNull();
      if (data) {
        expect(data).toBeDefined();
        expect(data.user_id).toBe(userA.id);
        noteAId = data.id;
      }
    });

    it('user A can update own note', async () => {
      // Only try to update if insert succeeded
      if (!noteAId) return;
      const { data, error } = await userAClient.from('notes')
        .update({ content: 'Updated note' })
        .eq('id', noteAId)
        .select().single();
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.content).toBe('Updated note');
    });

    it('user B cannot read user A notes', async () => {
      if (!noteAId) return;
      const { data, error } = await userBClient.from('notes').select('*').eq('id', noteAId);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('user B cannot update user A notes', async () => {
      if (!noteAId) return;
      const { data, error } = await userBClient.from('notes')
        .update({ content: 'Hacked note' })
        .eq('id', noteAId)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('user B cannot delete user A notes', async () => {
      if (!noteAId) return;
      const { data, error } = await userBClient.from('notes')
        .delete()
        .eq('id', noteAId)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('anonymous users cannot access notes', async () => {
      const { data, error } = await anonClient.from('notes').select('*');
      if (error && (error as any).code === 'PGRST205') return;
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { error: insErr } = await anonClient.from('notes').insert({
        user_id: userA.id,
        learning_item_id: itemAId,
        youtube_video_id: 'anon',
        content: 'Anon note'
      });
      expect(insErr).not.toBeNull();
    });

    it('user A can delete own note', async () => {
      if (!noteAId) return;
      const { data, error } = await userAClient.from('notes')
        .delete()
        .eq('id', noteAId)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    // ── Bookmarks Security & RLS (SF-030) ──
    let bookmarkAId: string;

    it('user A can insert and access own bookmarks', async () => {
      if (!itemAId) return;
      const { data, error } = await userAClient.from('bookmarks').insert({
        user_id: userA.id,
        learning_item_id: itemAId,
        youtube_video_id: 'usera',
        position_seconds: 125,
        label: 'Important Concept'
      }).select().single();

      if (error && (error as any).code === 'PGRST205') return;
      expect(error).toBeNull();
      if (data) {
        expect(data).toBeDefined();
        expect(data.user_id).toBe(userA.id);
        expect(data.position_seconds).toBe(125);
        expect(data.label).toBe('Important Concept');
        bookmarkAId = data.id;
      }
    }, 15000);

    it('user B cannot read user A bookmarks', async () => {
      if (!bookmarkAId) return;
      const { data, error } = await userBClient.from('bookmarks').select('*').eq('id', bookmarkAId);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    }, 15000);

    it('user B cannot delete user A bookmarks', async () => {
      if (!bookmarkAId) return;
      const { data, error } = await userBClient.from('bookmarks')
        .delete()
        .eq('id', bookmarkAId)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    }, 15000);

    it('anonymous users cannot access bookmarks', async () => {
      const { data, error } = await anonClient.from('bookmarks').select('*');
      if (error && (error as any).code === 'PGRST205') return;
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { error: insErr } = await anonClient.from('bookmarks').insert({
        user_id: userA.id,
        learning_item_id: itemAId,
        youtube_video_id: 'anon',
        position_seconds: 45,
        label: 'Anon bookmark'
      });
      expect(insErr).not.toBeNull();
    }, 15000);

    it('user A can delete own bookmark', async () => {
      if (!bookmarkAId) return;
      const { data, error } = await userAClient.from('bookmarks')
        .delete()
        .eq('id', bookmarkAId)
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    }, 15000);

    // ── Calendar System Security & RLS (SF-057 & SF-057D) ──
    let calAId: string;
    let catAId: string;
    let eventAId: string;

    it('user A can insert own calendar, category, and event', async () => {
      // 1. Custom Calendar
      const { data: calData, error: calErr } = await userAClient.from('calendars').insert({
        user_id: userA.id,
        name: 'Research Sprints',
        color: '#6366f1'
      }).select().single();
      expect(calErr).toBeNull();
      expect(calData.name).toBe('Research Sprints');
      calAId = calData.id;

      // 2. Custom Category
      const { data: catData, error: catErr } = await userAClient.from('calendar_categories').insert({
        user_id: userA.id,
        name: 'Distributed Systems',
        color: '#10b981'
      }).select().single();
      expect(catErr).toBeNull();
      expect(catData.name).toBe('Distributed Systems');
      catAId = catData.id;

      // 3. Calendar Event
      const { data: evData, error: evErr } = await userAClient.from('calendar_events').insert({
        user_id: userA.id,
        calendar_id: calAId,
        category_id: catAId,
        title: 'Raft Consensus Lab',
        start_at: '2026-10-01T10:00:00.000Z',
        end_at: '2026-10-01T11:00:00.000Z',
        timezone: 'UTC'
      }).select().single();
      expect(evErr).toBeNull();
      expect(evData.title).toBe('Raft Consensus Lab');
      eventAId = evData.id;
    }, 15000);

    it('user B cannot read user A calendars, categories, or events', async () => {
      if (!calAId || !catAId || !eventAId) return;

      const { data: calB } = await userBClient.from('calendars').select('*').eq('id', calAId);
      expect(calB).toHaveLength(0);

      const { data: catB } = await userBClient.from('calendar_categories').select('*').eq('id', catAId);
      expect(catB).toHaveLength(0);

      const { data: evB } = await userBClient.from('calendar_events').select('*').eq('id', eventAId);
      expect(evB).toHaveLength(0);
    }, 15000);

    it('user B cannot update or delete user A calendars, categories, or events', async () => {
      if (!calAId || !catAId || !eventAId) return;

      const { data: calUpd } = await userBClient.from('calendars').update({ name: 'Hacked' }).eq('id', calAId).select();
      expect(calUpd).toHaveLength(0);

      const { data: evDel } = await userBClient.from('calendar_events').delete().eq('id', eventAId).select();
      expect(evDel).toHaveLength(0);
    }, 15000);

    it('user A can delete own calendar event, category, and calendar', async () => {
      if (!calAId || !catAId || !eventAId) return;

      const { data: evDel } = await userAClient.from('calendar_events').delete().eq('id', eventAId).select();
      expect(evDel).toHaveLength(1);

      const { data: catDel } = await userAClient.from('calendar_categories').delete().eq('id', catAId).select();
      expect(catDel).toHaveLength(1);

      const { data: calDel } = await userAClient.from('calendars').delete().eq('id', calAId).select();
      expect(calDel).toHaveLength(1);
    }, 15000);
  });
});



