import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authModule from '../../lib/auth';
import { AppError } from '../../lib/errors';
import { ImportService } from '../../lib/services/import-service';
import { LibraryService } from '../../lib/services/library-service';
import { AuthenticatedUser, LearningItem, LearningItemWithVideos } from '../../lib/types';
import { YouTubeClient } from '../../lib/youtube/client';

import { GET as listRoute, POST as importRoute } from '../../app/api/learning-items/route';
import { POST as previewLearningItemRoute } from '../../app/api/learning-items/preview/route';
import { DELETE as deleteRoute, GET as getRoute } from '../../app/api/learning-items/[id]/route';
import { GET as listNotesRoute, POST as createNoteRoute } from '../../app/api/notes/route';
import { GET as getNoteRoute, PUT as updateNoteRoute, DELETE as deleteNoteRoute } from '../../app/api/notes/[id]/route';
import { GET as listBookmarksRoute, POST as createBookmarkRoute } from '../../app/api/bookmarks/route';
import { GET as getBookmarkRoute, DELETE as deleteBookmarkRoute } from '../../app/api/bookmarks/[id]/route';
import { GET as getSettingsRoute, PATCH as patchSettingsRoute } from '../../app/api/settings/route';
import { POST as exportSettingsRoute } from '../../app/api/settings/export/route';
import { POST as resetSettingsRoute } from '../../app/api/settings/reset/route';
import { Note, Bookmark, UserSettings } from '../../lib/types';

describe('QA API Test Suite — Complete MVP Coverage', () => {
  const userA: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'userA@studyflow.internal'
  };
  const userB: AuthenticatedUser = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'userB@studyflow.internal'
  };

  const sampleVideoItem: LearningItem = {
    id: '33333333-3333-3333-3333-333333333333',
    user_id: userA.id,
    type: 'video',
    youtube_video_id: 'dQw4w9WgXcQ',
    youtube_playlist_id: null,
    source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    normalized_source_key: 'video:dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    status: 'ready',
    created_at: '2026-09-24T12:00:00.000Z',
    updated_at: '2026-09-24T12:00:00.000Z'
  };

  const samplePlaylistItem: LearningItemWithVideos = {
    id: '44444444-4444-4444-4444-444444444444',
    user_id: userA.id,
    type: 'playlist',
    youtube_video_id: null,
    youtube_playlist_id: 'PL1234567890ABCDEF',
    source_url: 'https://www.youtube.com/playlist?list=PL1234567890ABCDEF',
    normalized_source_key: 'playlist:PL1234567890ABCDEF',
    title: 'Full Course Playlist',
    thumbnail_url: 'https://i.ytimg.com/vi/thumb/hqdefault.jpg',
    status: 'ready',
    created_at: '2026-09-24T12:00:00.000Z',
    updated_at: '2026-09-24T12:00:00.000Z',
    videos: [
      {
        id: 'child-1',
        learning_item_id: '44444444-4444-4444-4444-444444444444',
        youtube_video_id: 'vid11111111',
        title: 'Video 1',
        thumbnail_url: null,
        source_position: 0,
        created_at: '2026-09-24T12:00:00.000Z'
      },
      {
        id: 'child-2',
        learning_item_id: '44444444-4444-4444-4444-444444444444',
        youtube_video_id: 'vid22222222',
        title: 'Video 2',
        thumbnail_url: null,
        source_position: 1,
        created_at: '2026-09-24T12:00:00.000Z'
      }
    ]
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.YOUTUBE_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  // =========================================================================
  // 1. POST /api/learning-items
  // =========================================================================
  describe('Endpoint: POST /api/learning-items', () => {
    describe('Authentication', () => {
      it('rejects request with missing Authorization header (401 UNAUTHORIZED)', async () => {
        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error.code).toBe('UNAUTHORIZED');
      });

      it('rejects request with invalid or expired token (401 UNAUTHORIZED)', async () => {
        vi.spyOn(authModule, 'requireAuth').mockRejectedValue(
          new AppError('UNAUTHORIZED', 'Invalid or expired session token.', 401)
        );
        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer invalid-token'
          },
          body: JSON.stringify({ url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error.code).toBe('UNAUTHORIZED');
      });
    });

    describe('Input Validation & Malformed Input', () => {
      beforeEach(() => {
        vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
          user: userA,
          accessToken: 'token-a',
          supabase: {} as any
        });
      });

      it('rejects non-JSON malformed request body (400 VALIDATION_ERROR)', async () => {
        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: '{ invalid json '
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });

      it('rejects oversized payload (413 Payload Too Large)', async () => {
        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': '5000',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(413);
        const json = await res.json();
        expect(json.error.message).toBe('Payload too large');
      });

      it('rejects missing url field in JSON body (400 VALIDATION_ERROR)', async () => {
        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ wrongField: 'value' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });

      it('rejects empty string url in JSON body (400 VALIDATION_ERROR)', async () => {
        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: '' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });

      it('rejects non-YouTube URL domain (400 VALIDATION_ERROR)', async () => {
        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: 'https://vimeo.com/12345678' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });

      it('rejects malformed string not a URL (400 VALIDATION_ERROR)', async () => {
        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: 'not a valid url' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });

      it('rejects unsupported YouTube channel URL (400 VALIDATION_ERROR)', async () => {
        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: 'https://www.youtube.com/@veritasium' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });

      it('rejects watch URL with missing video id parameter (400 VALIDATION_ERROR)', async () => {
        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=bad' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });

      it('rejects playlist URL with empty list parameter (400 VALIDATION_ERROR)', async () => {
        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: 'https://www.youtube.com/playlist?list=' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('Happy Path & Duplicate Import (Idempotency)', () => {
      beforeEach(() => {
        vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
          user: userA,
          accessToken: 'token-a',
          supabase: {} as any
        });
      });

      it('imports a video successfully (201 Created with duplicate: false)', async () => {
        vi.spyOn(ImportService.prototype, 'importFromUrl').mockResolvedValue({
          item: sampleVideoItem,
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
        const res = await importRoute(req as any);
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.data.id).toBe(sampleVideoItem.id);
        expect(json.duplicate).toBe(false);
      });

      it('imports a playlist successfully with child ordering (201 Created)', async () => {
        vi.spyOn(ImportService.prototype, 'importFromUrl').mockResolvedValue({
          item: samplePlaylistItem,
          isDuplicate: false
        });

        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: 'https://www.youtube.com/playlist?list=PL1234567890ABCDEF' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.data.type).toBe('playlist');
        expect(json.data.videos).toHaveLength(2);
        expect(json.data.videos[0].source_position).toBe(0);
        expect(json.data.videos[1].source_position).toBe(1);
        expect(json.duplicate).toBe(false);
      });

      it('returns existing item idempotently on duplicate import (200 OK with duplicate: true)', async () => {
        vi.spyOn(ImportService.prototype, 'importFromUrl').mockResolvedValue({
          item: sampleVideoItem,
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
        const res = await importRoute(req as any);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.data.id).toBe(sampleVideoItem.id);
        expect(json.duplicate).toBe(true);
      });
    });

    describe('YouTube External Provider Failures & Rate Limits', () => {
      beforeEach(() => {
        vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
          user: userA,
          accessToken: 'token-a',
          supabase: {} as any
        });
      });

      it('handles nonexistent YouTube video (404 NOT_FOUND)', async () => {
        vi.spyOn(ImportService.prototype, 'importFromUrl').mockRejectedValue(
          new AppError('NOT_FOUND', 'YouTube video not found or is unavailable', 404)
        );

        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=nonexist001' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error.code).toBe('NOT_FOUND');
      });

      it('handles private or restricted YouTube video (422 YOUTUBE_ERROR)', async () => {
        vi.spyOn(ImportService.prototype, 'importFromUrl').mockRejectedValue(
          new AppError('YOUTUBE_ERROR', 'YouTube video is private and cannot be imported.', 422)
        );

        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=private00001' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(422);
        const json = await res.json();
        expect(json.error.code).toBe('YOUTUBE_ERROR');
      });

      it('handles YouTube API quota exhaustion (503 YOUTUBE_ERROR)', async () => {
        vi.spyOn(ImportService.prototype, 'importFromUrl').mockRejectedValue(
          new AppError('YOUTUBE_ERROR', 'YouTube API quota limit reached. Please try again later.', 503)
        );

        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(503);
        const json = await res.json();
        expect(json.error.code).toBe('YOUTUBE_ERROR');
      });

      it('handles external network connectivity failure (502 YOUTUBE_ERROR)', async () => {
        vi.spyOn(ImportService.prototype, 'importFromUrl').mockRejectedValue(
          new AppError('YOUTUBE_ERROR', 'Unable to reach YouTube service', 502)
        );

        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(502);
        const json = await res.json();
        expect(json.error.code).toBe('YOUTUBE_ERROR');
      });
    });

    describe('Database Failures during Import', () => {
      beforeEach(() => {
        vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
          user: userA,
          accessToken: 'token-a',
          supabase: {} as any
        });
      });

      it('handles database persistence failure (500 YOUTUBE_ERROR)', async () => {
        vi.spyOn(ImportService.prototype, 'importFromUrl').mockRejectedValue(
          new AppError('YOUTUBE_ERROR', 'Failed to save video to library', 500)
        );

        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error.code).toBe('YOUTUBE_ERROR');
      });

      it('handles child video failure with rollback compensation (500 YOUTUBE_ERROR)', async () => {
        vi.spyOn(ImportService.prototype, 'importFromUrl').mockRejectedValue(
          new AppError('YOUTUBE_ERROR', 'Failed to import all playlist items. No partial data was saved.', 500)
        );

        const req = new Request('http://localhost:3000/api/learning-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-a'
          },
          body: JSON.stringify({ url: 'https://www.youtube.com/playlist?list=PL1234567890ABCDEF' })
        });
        const res = await importRoute(req as any);
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error.code).toBe('YOUTUBE_ERROR');
      });
    });
  });

  // =========================================================================
  // 2. GET /api/learning-items
  // =========================================================================
  describe('Endpoint: GET /api/learning-items', () => {
    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      const req = new Request('http://localhost:3000/api/learning-items', { method: 'GET' });
      const res = await listRoute(req as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 200 OK with list of user items (Happy Path)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });
      vi.spyOn(LibraryService.prototype, 'listUserItems').mockResolvedValue([sampleVideoItem]);

      const req = new Request('http://localhost:3000/api/learning-items', {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await listRoute(req as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe(sampleVideoItem.id);
    });

    it('handles database query error on listing (500 INTERNAL_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });
      vi.spyOn(LibraryService.prototype, 'listUserItems').mockRejectedValue(
        new AppError('INTERNAL_ERROR', 'Failed to retrieve library items', 500)
      );

      const req = new Request('http://localhost:3000/api/learning-items', {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await listRoute(req as any);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // =========================================================================
  // 3. GET /api/learning-items/:id
  // =========================================================================
  describe('Endpoint: GET /api/learning-items/:id', () => {
    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      const req = new Request('http://localhost:3000/api/learning-items/33333333-3333-3333-3333-333333333333', {
        method: 'GET'
      });
      const res = await getRoute(req as any, {
        params: { id: '33333333-3333-3333-3333-333333333333' }
      });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects malformed UUID parameter (400 VALIDATION_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request('http://localhost:3000/api/learning-items/not-a-valid-uuid', {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await getRoute(req as any, { params: { id: 'not-a-valid-uuid' } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 200 OK for owned video item (Happy Path)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });
      vi.spyOn(LibraryService.prototype, 'getItem').mockResolvedValue(sampleVideoItem);

      const req = new Request(`http://localhost:3000/api/learning-items/${sampleVideoItem.id}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await getRoute(req as any, { params: { id: sampleVideoItem.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(sampleVideoItem.id);
      expect(json.data.type).toBe('video');
    });

    it('returns 200 OK for owned playlist item with ordered child videos (Happy Path)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });
      vi.spyOn(LibraryService.prototype, 'getItem').mockResolvedValue(samplePlaylistItem);

      const req = new Request(`http://localhost:3000/api/learning-items/${samplePlaylistItem.id}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await getRoute(req as any, { params: { id: samplePlaylistItem.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(samplePlaylistItem.id);
      expect(json.data.videos).toHaveLength(2);
      expect(json.data.videos[0].source_position).toBe(0);
      expect(json.data.videos[1].source_position).toBe(1);
    });

    it('denies cross-user access when User B requests User A item (404 NOT_FOUND)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userB,
        accessToken: 'token-b',
        supabase: {} as any
      });
      vi.spyOn(LibraryService.prototype, 'getItem').mockRejectedValue(
        new AppError('NOT_FOUND', 'Learning item not found', 404)
      );

      const req = new Request(`http://localhost:3000/api/learning-items/${sampleVideoItem.id}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer token-b' }
      });
      const res = await getRoute(req as any, { params: { id: sampleVideoItem.id } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 NOT_FOUND for non-existent item UUID', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });
      vi.spyOn(LibraryService.prototype, 'getItem').mockRejectedValue(
        new AppError('NOT_FOUND', 'Learning item not found', 404)
      );

      const req = new Request('http://localhost:3000/api/learning-items/99999999-9999-9999-9999-999999999999', {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await getRoute(req as any, {
        params: { id: '99999999-9999-9999-9999-999999999999' }
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('handles database error on retrieval (500 INTERNAL_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });
      vi.spyOn(LibraryService.prototype, 'getItem').mockRejectedValue(
        new AppError('INTERNAL_ERROR', 'Failed to retrieve learning item', 500)
      );

      const req = new Request(`http://localhost:3000/api/learning-items/${sampleVideoItem.id}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await getRoute(req as any, { params: { id: sampleVideoItem.id } });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // =========================================================================
  // 4. DELETE /api/learning-items/:id
  // =========================================================================
  describe('Endpoint: DELETE /api/learning-items/:id', () => {
    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      const req = new Request(`http://localhost:3000/api/learning-items/${sampleVideoItem.id}`, {
        method: 'DELETE'
      });
      const res = await deleteRoute(req as any, { params: { id: sampleVideoItem.id } });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects malformed UUID parameter (400 VALIDATION_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request('http://localhost:3000/api/learning-items/malformed-id', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await deleteRoute(req as any, { params: { id: 'malformed-id' } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('deletes owned item and returns 200 OK (Happy Path)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });
      vi.spyOn(LibraryService.prototype, 'removeItem').mockResolvedValue(undefined);

      const req = new Request(`http://localhost:3000/api/learning-items/${sampleVideoItem.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await deleteRoute(req as any, { params: { id: sampleVideoItem.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.success).toBe(true);
    });

    it('denies cross-user deletion when User B attempts to delete User A item (404 NOT_FOUND)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userB,
        accessToken: 'token-b',
        supabase: {} as any
      });
      vi.spyOn(LibraryService.prototype, 'removeItem').mockRejectedValue(
        new AppError('NOT_FOUND', 'Learning item not found', 404)
      );

      const req = new Request(`http://localhost:3000/api/learning-items/${sampleVideoItem.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-b' }
      });
      const res = await deleteRoute(req as any, { params: { id: sampleVideoItem.id } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 NOT_FOUND when attempting to delete non-existent item UUID', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });
      vi.spyOn(LibraryService.prototype, 'removeItem').mockRejectedValue(
        new AppError('NOT_FOUND', 'Learning item not found', 404)
      );

      const req = new Request('http://localhost:3000/api/learning-items/99999999-9999-9999-9999-999999999999', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await deleteRoute(req as any, {
        params: { id: '99999999-9999-9999-9999-999999999999' }
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('handles database error on delete operation (500 INTERNAL_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });
      vi.spyOn(LibraryService.prototype, 'removeItem').mockRejectedValue(
        new AppError('INTERNAL_ERROR', 'Failed to delete learning item', 500)
      );

      const req = new Request(`http://localhost:3000/api/learning-items/${sampleVideoItem.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await deleteRoute(req as any, { params: { id: sampleVideoItem.id } });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // =========================================================================
  // 5. GET /api/notes
  // =========================================================================
  describe('Endpoint: GET /api/notes', () => {
    const sampleNote: Note = {
      id: '55555555-5555-5555-5555-555555555555',
      user_id: userA.id,
      learning_item_id: sampleVideoItem.id,
      youtube_video_id: 'dQw4w9WgXcQ',
      content: 'Important study note',
      created_at: '2026-09-24T12:00:00.000Z',
      updated_at: '2026-09-24T12:00:00.000Z'
    };

    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      const req = new Request('http://localhost:3000/api/notes', { method: 'GET' });
      const res = await listNotesRoute(req as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('returns list of notes for authenticated user (200 OK)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ error: null, data: [sampleNote] })
            })
          })
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request('http://localhost:3000/api/notes', {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await listNotesRoute(req as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe(sampleNote.id);
    });
  });

  // =========================================================================
  // 6. POST /api/notes
  // =========================================================================
  describe('Endpoint: POST /api/notes', () => {
    const sampleNote: Note = {
      id: '55555555-5555-5555-5555-555555555555',
      user_id: userA.id,
      learning_item_id: sampleVideoItem.id,
      youtube_video_id: 'dQw4w9WgXcQ',
      content: 'New created note',
      created_at: '2026-09-24T12:00:00.000Z',
      updated_at: '2026-09-24T12:00:00.000Z'
    };

    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      const req = new Request('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learningItemId: sampleVideoItem.id,
          youtubeVideoId: 'dQw4w9WgXcQ',
          content: 'Note'
        })
      });
      const res = await createNoteRoute(req as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects missing learningItemId (400 VALIDATION_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({
          youtubeVideoId: 'dQw4w9WgXcQ',
          content: 'Missing learning item'
        })
      });
      const res = await createNoteRoute(req as any);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid learningItemId UUID (400 VALIDATION_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({
          learningItemId: 'invalid-uuid-123',
          youtubeVideoId: 'dQw4w9WgXcQ',
          content: 'Invalid UUID'
        })
      });
      const res = await createNoteRoute(req as any);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects empty content (400 VALIDATION_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({
          learningItemId: sampleVideoItem.id,
          youtubeVideoId: 'dQw4w9WgXcQ',
          content: ''
        })
      });
      const res = await createNoteRoute(req as any);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates note successfully (201 Created)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: sampleNote, error: null })
          })
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({
          learningItemId: sampleVideoItem.id,
          youtubeVideoId: 'dQw4w9WgXcQ',
          content: 'New created note'
        })
      });
      const res = await createNoteRoute(req as any);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe(sampleNote.id);
      expect(json.data.content).toBe(sampleNote.content);
    });
  });

  // =========================================================================
  // 7. GET /api/notes/:id
  // =========================================================================
  describe('Endpoint: GET /api/notes/:id', () => {
    const noteId = '55555555-5555-5555-5555-555555555555';
    const sampleNote: Note = {
      id: noteId,
      user_id: userA.id,
      learning_item_id: sampleVideoItem.id,
      youtube_video_id: 'dQw4w9WgXcQ',
      content: 'Important study note',
      created_at: '2026-09-24T12:00:00.000Z',
      updated_at: '2026-09-24T12:00:00.000Z'
    };

    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      const req = new Request(`http://localhost:3000/api/notes/${noteId}`, { method: 'GET' });
      const res = await getNoteRoute(req as any, { params: { id: noteId } });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects malformed UUID parameter (400 VALIDATION_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request('http://localhost:3000/api/notes/invalid-uuid-format', {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await getNoteRoute(req as any, { params: { id: 'invalid-uuid-format' } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns note for authenticated owner (200 OK)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: sampleNote, error: null })
              })
            })
          })
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request(`http://localhost:3000/api/notes/${noteId}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await getNoteRoute(req as any, { params: { id: noteId } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(noteId);
    });

    it('returns 404 NOT_FOUND for non-existent note', async () => {
      const nonExistentId = '99999999-9999-9999-9999-999999999999';
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request(`http://localhost:3000/api/notes/${nonExistentId}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await getNoteRoute(req as any, { params: { id: nonExistentId } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('denies cross-user note retrieval (404 NOT_FOUND)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userB,
        accessToken: 'token-b',
        supabase: mockSupabase as any
      });

      const req = new Request(`http://localhost:3000/api/notes/${noteId}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer token-b' }
      });
      const res = await getNoteRoute(req as any, { params: { id: noteId } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // 8. PUT /api/notes/:id
  // =========================================================================
  describe('Endpoint: PUT /api/notes/:id', () => {
    const noteId = '55555555-5555-5555-5555-555555555555';
    const updatedNote: Note = {
      id: noteId,
      user_id: userA.id,
      learning_item_id: sampleVideoItem.id,
      youtube_video_id: 'dQw4w9WgXcQ',
      content: 'Updated note content',
      created_at: '2026-09-24T12:00:00.000Z',
      updated_at: '2026-09-24T12:30:00.000Z'
    };

    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      const req = new Request(`http://localhost:3000/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Updated' })
      });
      const res = await updateNoteRoute(req as any, { params: { id: noteId } });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects empty content payload (400 VALIDATION_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request(`http://localhost:3000/api/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({ content: '' })
      });
      const res = await updateNoteRoute(req as any, { params: { id: noteId } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('updates note successfully for owner (200 OK)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: updatedNote, error: null })
                })
              })
            })
          })
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request(`http://localhost:3000/api/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({ content: 'Updated note content' })
      });
      const res = await updateNoteRoute(req as any, { params: { id: noteId } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.content).toBe('Updated note content');
    });

    it('denies cross-user update via RLS (404 NOT_FOUND)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: { code: '42501', message: 'RLS violation' } })
                })
              })
            })
          })
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userB,
        accessToken: 'token-b',
        supabase: mockSupabase as any
      });

      const req = new Request(`http://localhost:3000/api/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-b'
        },
        body: JSON.stringify({ content: 'Hacked content' })
      });
      const res = await updateNoteRoute(req as any, { params: { id: noteId } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // 9. DELETE /api/notes/:id
  // =========================================================================
  describe('Endpoint: DELETE /api/notes/:id', () => {
    const noteId = '55555555-5555-5555-5555-555555555555';

    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      const req = new Request(`http://localhost:3000/api/notes/${noteId}`, { method: 'DELETE' });
      const res = await deleteNoteRoute(req as any, { params: { id: noteId } });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('deletes owned note successfully (200 OK)', async () => {
      const deleteChain = {
        eq: vi.fn().mockReturnThis()
      } as any;
      deleteChain.then = (cb: any) => cb({ error: null });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue(deleteChain)
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request(`http://localhost:3000/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await deleteNoteRoute(req as any, { params: { id: noteId } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.success).toBe(true);
    });

    it('denies cross-user deletion via RLS (404 NOT_FOUND)', async () => {
      const deleteChain = {
        eq: vi.fn().mockReturnThis()
      } as any;
      deleteChain.then = (cb: any) => cb({ error: { code: '42501', message: 'RLS violation' } });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue(deleteChain)
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userB,
        accessToken: 'token-b',
        supabase: mockSupabase as any
      });

      const req = new Request(`http://localhost:3000/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-b' }
      });
      const res = await deleteNoteRoute(req as any, { params: { id: noteId } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // 9. GET /api/bookmarks (SF-031)
  // =========================================================================
  describe('Endpoint: GET /api/bookmarks', () => {
    const sampleBookmark: Bookmark = {
      id: '66666666-6666-6666-6666-666666666666',
      user_id: userA.id,
      learning_item_id: sampleVideoItem.id,
      youtube_video_id: 'dQw4w9WgXcQ',
      position_seconds: 120,
      label: 'Introduction Section',
      created_at: '2026-09-24T12:00:00.000Z'
    };

    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      const req = new Request('http://localhost:3000/api/bookmarks', { method: 'GET' });
      const res = await listBookmarksRoute(req as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('returns list of bookmarks for authenticated user (200 OK)', async () => {
      const orderCreatedMock = vi.fn().mockResolvedValue({ error: null, data: [sampleBookmark] });
      const orderPosMock = vi.fn().mockReturnValue({ order: orderCreatedMock });
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: orderPosMock
            })
          })
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request('http://localhost:3000/api/bookmarks', {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await listBookmarksRoute(req as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe(sampleBookmark.id);
      expect(json.data[0].position_seconds).toBe(120);
    });
  });

  // =========================================================================
  // 10. POST /api/bookmarks (SF-031)
  // =========================================================================
  describe('Endpoint: POST /api/bookmarks', () => {
    const sampleBookmark: Bookmark = {
      id: '66666666-6666-6666-6666-666666666666',
      user_id: userA.id,
      learning_item_id: sampleVideoItem.id,
      youtube_video_id: 'dQw4w9WgXcQ',
      position_seconds: 45,
      label: 'Key Highlight',
      created_at: '2026-09-24T12:00:00.000Z'
    };

    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      const req = new Request('http://localhost:3000/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learningItemId: sampleVideoItem.id,
          youtubeVideoId: 'dQw4w9WgXcQ',
          positionSeconds: 45
        })
      });
      const res = await createBookmarkRoute(req as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects missing learningItemId (400 VALIDATION_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request('http://localhost:3000/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({
          youtubeVideoId: 'dQw4w9WgXcQ',
          positionSeconds: 45
        })
      });
      const res = await createBookmarkRoute(req as any);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects negative positionSeconds (400 VALIDATION_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request('http://localhost:3000/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({
          learningItemId: sampleVideoItem.id,
          youtubeVideoId: 'dQw4w9WgXcQ',
          positionSeconds: -10
        })
      });
      const res = await createBookmarkRoute(req as any);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates bookmark successfully (201 Created)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: sampleBookmark, error: null })
          })
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request('http://localhost:3000/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-a'
        },
        body: JSON.stringify({
          learningItemId: sampleVideoItem.id,
          youtubeVideoId: 'dQw4w9WgXcQ',
          positionSeconds: 45,
          label: 'Key Highlight'
        })
      });
      const res = await createBookmarkRoute(req as any);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe(sampleBookmark.id);
      expect(json.data.position_seconds).toBe(45);
      expect(json.data.label).toBe('Key Highlight');
    });
  });

  // =========================================================================
  // 11. GET /api/bookmarks/:id (SF-031)
  // =========================================================================
  describe('Endpoint: GET /api/bookmarks/:id', () => {
    const bookmarkId = '66666666-6666-6666-6666-666666666666';
    const sampleBookmark: Bookmark = {
      id: bookmarkId,
      user_id: userA.id,
      learning_item_id: sampleVideoItem.id,
      youtube_video_id: 'dQw4w9WgXcQ',
      position_seconds: 60,
      label: 'Bookmark 1',
      created_at: '2026-09-24T12:00:00.000Z'
    };

    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      const req = new Request(`http://localhost:3000/api/bookmarks/${bookmarkId}`, { method: 'GET' });
      const res = await getBookmarkRoute(req as any, { params: { id: bookmarkId } });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects malformed UUID parameter (400 VALIDATION_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request('http://localhost:3000/api/bookmarks/bad-uuid', {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await getBookmarkRoute(req as any, { params: { id: 'bad-uuid' } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns bookmark for owner (200 OK)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: sampleBookmark, error: null })
              })
            })
          })
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request(`http://localhost:3000/api/bookmarks/${bookmarkId}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await getBookmarkRoute(req as any, { params: { id: bookmarkId } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(bookmarkId);
    });

    it('returns 404 NOT_FOUND for non-existent bookmark', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request(`http://localhost:3000/api/bookmarks/${bookmarkId}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await getBookmarkRoute(req as any, { params: { id: bookmarkId } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // 12. DELETE /api/bookmarks/:id (SF-031)
  // =========================================================================
  describe('Endpoint: DELETE /api/bookmarks/:id', () => {
    const bookmarkId = '66666666-6666-6666-6666-666666666666';

    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      const req = new Request(`http://localhost:3000/api/bookmarks/${bookmarkId}`, { method: 'DELETE' });
      const res = await deleteBookmarkRoute(req as any, { params: { id: bookmarkId } });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('deletes owned bookmark successfully (200 OK)', async () => {
      const deleteChain = {
        eq: vi.fn().mockReturnThis()
      } as any;
      deleteChain.then = (cb: any) => cb({ error: null });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue(deleteChain)
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request(`http://localhost:3000/api/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await deleteBookmarkRoute(req as any, { params: { id: bookmarkId } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.success).toBe(true);
    });

    it('denies cross-user deletion via RLS (404 NOT_FOUND)', async () => {
      const deleteChain = {
        eq: vi.fn().mockReturnThis()
      } as any;
      deleteChain.then = (cb: any) => cb({ error: { code: '42501', message: 'RLS violation' } });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue(deleteChain)
        })
      };
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userB,
        accessToken: 'token-b',
        supabase: mockSupabase as any
      });

      const req = new Request(`http://localhost:3000/api/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-b' }
      });
      const res = await deleteBookmarkRoute(req as any, { params: { id: bookmarkId } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Endpoint: GET /api/settings', () => {
    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockRejectedValue(
        new AppError('UNAUTHORIZED', 'Authentication required. Missing Bearer token.', 401)
      );

      const req = new Request('http://localhost:3000/api/settings');
      const res = await getSettingsRoute(req as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('returns settings for authenticated user (200 OK)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  user_id: userA.id,
                  theme_mode: 'light',
                  accent_color: 'indigo'
                },
                error: null
              })
            })
          })
        })
      };

      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request('http://localhost:3000/api/settings', {
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await getSettingsRoute(req as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.theme_mode).toBe('light');
    });
  });

  describe('Endpoint: PATCH /api/settings', () => {
    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockRejectedValue(
        new AppError('UNAUTHORIZED', 'Authentication required. Missing Bearer token.', 401)
      );

      const req = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ theme_mode: 'dark' })
      });
      const res = await patchSettingsRoute(req as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects invalid enum values (400 VALIDATION_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer token-a' },
        body: JSON.stringify({ theme_mode: 'cyberpunk-neon' })
      });
      const res = await patchSettingsRoute(req as any);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('updates user settings successfully (200 OK)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  user_id: userA.id,
                  theme_mode: 'dark',
                  accent_color: 'violet'
                },
                error: null
              })
            })
          })
        })
      };

      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer token-a' },
        body: JSON.stringify({ theme_mode: 'dark', accent_color: 'violet' })
      });
      const res = await patchSettingsRoute(req as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.theme_mode).toBe('dark');
      expect(json.data.accent_color).toBe('violet');
    });
  });

  describe('Endpoint: POST /api/settings/reset', () => {
    it('resets learning progress for authenticated user (200 OK)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        })
      };

      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: mockSupabase as any
      });

      const req = new Request('http://localhost:3000/api/settings/reset', {
        method: 'POST',
        headers: { Authorization: 'Bearer token-a' }
      });
      const res = await resetSettingsRoute(req as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toContain('reset successfully');
    });
  });

  describe('Endpoint: POST /api/learning-items/preview', () => {
    it('rejects unauthenticated request (401 UNAUTHORIZED)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockRejectedValue(
        new AppError('UNAUTHORIZED', 'Authentication required. Missing Bearer token.', 401)
      );

      const req = new Request('http://localhost:3000/api/learning-items/preview', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
      });
      const res = await previewLearningItemRoute(req as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects invalid URL in preview (400 VALIDATION_ERROR)', async () => {
      vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
        user: userA,
        accessToken: 'token-a',
        supabase: {} as any
      });

      const req = new Request('http://localhost:3000/api/learning-items/preview', {
        method: 'POST',
        headers: { Authorization: 'Bearer token-a' },
        body: JSON.stringify({ url: '' })
      });
      const res = await previewLearningItemRoute(req as any);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });
});



