import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authModule from '../../lib/auth';
import { AppError } from '../../lib/errors';
import { ImportService } from '../../lib/services/import-service';
import { LibraryService } from '../../lib/services/library-service';
import { AuthenticatedUser, LearningItem, LearningItemWithVideos } from '../../lib/types';
import { YouTubeClient } from '../../lib/youtube/client';

import { GET as listRoute, POST as importRoute } from '../../app/api/learning-items/route';
import { DELETE as deleteRoute, GET as getRoute } from '../../app/api/learning-items/[id]/route';

describe('API Route Handlers (Integration)', () => {
  const userA: AuthenticatedUser = { id: '11111111-1111-1111-1111-111111111111', email: 'userA@example.com' };
  const userB: AuthenticatedUser = { id: '22222222-2222-2222-2222-222222222222', email: 'userB@example.com' };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.YOUTUBE_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  describe('Authentication Enforcement', () => {
    it('returns 401 AUTH_REQUIRED when request has no Authorization header', async () => {
      const req = new Request('http://localhost:3000/api/learning-items', {
        method: 'GET'
      });

      const res = await listRoute(req as unknown as import('next/server').NextRequest);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 AUTH_REQUIRED for unauthenticated POST request', async () => {
      const req = new Request('http://localhost:3000/api/learning-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' })
      });

      const res = await importRoute(req as unknown as import('next/server').NextRequest);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Input Validation & Error Mapping', () => {
    it('returns 400 INVALID_URL when body is missing url', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request('http://localhost:3000/api/learning-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({})
      });

      const res = await importRoute(req as unknown as import('next/server').NextRequest);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 UNSUPPORTED_SOURCE when URL is not a YouTube URL', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request('http://localhost:3000/api/learning-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({ url: 'https://vimeo.com/12345678' })
      });

      const res = await importRoute(req as unknown as import('next/server').NextRequest);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Import Flow (Video, Playlist, Duplicate, Non-existent)', () => {
    it('successfully imports a new video and returns 201', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const savedItem: LearningItem = {
        id: '10000000-0000-0000-0000-000000000001',
        user_id: userA.id,
        type: 'video',
        youtube_video_id: 'dQw4w9WgXcQ',
        youtube_playlist_id: null,
        source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        normalized_source_key: 'video:dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up',
        thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        status: 'ready',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.spyOn(ImportService.prototype, 'importFromUrl').mockResolvedValue({
        item: savedItem,
        isDuplicate: false
      });

      const req = new Request('http://localhost:3000/api/learning-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
      });

      const res = await importRoute(req as unknown as import('next/server').NextRequest);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe(savedItem.id);
      expect(json.duplicate).toBe(false);
    });

    it('returns 200 with duplicate=true when importing existing source', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const existingItem: LearningItem = {
        id: '10000000-0000-0000-0000-000000000001',
        user_id: userA.id,
        type: 'video',
        youtube_video_id: 'dQw4w9WgXcQ',
        youtube_playlist_id: null,
        source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        normalized_source_key: 'video:dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up',
        thumbnail_url: null,
        status: 'ready',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.spyOn(ImportService.prototype, 'importFromUrl').mockResolvedValue({
        item: existingItem,
        isDuplicate: true
      });

      const req = new Request('http://localhost:3000/api/learning-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
      });

      const res = await importRoute(req as unknown as import('next/server').NextRequest);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.duplicate).toBe(true);
      expect(json.data.id).toBe(existingItem.id);
    });

    it('returns 404 SOURCE_NOT_FOUND when YouTube video does not exist', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      vi.spyOn(ImportService.prototype, 'importFromUrl').mockRejectedValue(
        new AppError('NOT_FOUND', 'YouTube video not found or is unavailable', 404)
      );

      const req = new Request('http://localhost:3000/api/learning-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=nonexistent1' })
      });

      const res = await importRoute(req as unknown as import('next/server').NextRequest);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Ownership and Cross-User Access', () => {
    it('prevents User B from accessing User A learning item (returns 404 NOT_FOUND)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userB,
        accessToken: 'token-b',
        supabase: {} as any
      });

      vi.spyOn(LibraryService.prototype, 'getItem').mockRejectedValue(
        new AppError('NOT_FOUND', 'Learning item not found', 404)
      );

      const req = new Request('http://localhost:3000/api/learning-items/10000000-0000-0000-0000-000000000001', {
        method: 'GET',
        headers: { Authorization: 'Bearer token-b' }
      });

      const res = await getRoute(
        req as unknown as import('next/server').NextRequest,
        { params: { id: '10000000-0000-0000-0000-000000000001' } }
      );

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('prevents User B from deleting User A learning item (returns 404 NOT_FOUND)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userB,
        accessToken: 'token-b',
        supabase: {} as any
      });

      vi.spyOn(LibraryService.prototype, 'removeItem').mockRejectedValue(
        new AppError('NOT_FOUND', 'Learning item not found', 404)
      );

      const req = new Request('http://localhost:3000/api/learning-items/10000000-0000-0000-0000-000000000001', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-b' }
      });

      const res = await deleteRoute(
        req as unknown as import('next/server').NextRequest,
        { params: { id: '10000000-0000-0000-0000-000000000001' } }
      );

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('allows User A to delete their own item and returns 200 { success: true }', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      vi.spyOn(LibraryService.prototype, 'removeItem').mockResolvedValue(undefined);

      const req = new Request('http://localhost:3000/api/learning-items/10000000-0000-0000-0000-000000000001', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-a' }
      });

      const res = await deleteRoute(
        req as unknown as import('next/server').NextRequest,
        { params: { id: '10000000-0000-0000-0000-000000000001' } }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.success).toBe(true);
    });
  });
});
