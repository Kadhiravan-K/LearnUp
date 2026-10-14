import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authModule from '../../lib/auth';
import { ImportService } from '../../lib/services/import-service';
import { LearningItemRepository } from '../../lib/db/repository';
import { AuthenticatedUser, LearningItem, LearningItemWithVideos } from '../../lib/types';
import { POST as importRoute } from '../../app/api/learning-items/route';
import { readBoundedJson } from '../../lib/utils/request';
import { AppError } from '../../lib/errors';

describe('SF-101: Import Payload Resilience & Bounded JSON Integration Tests', () => {
  const testUser: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'testuser@LearnUp.internal'
  };

  const sampleVideoItem: LearningItem = {
    id: '33333333-3333-3333-3333-333333333333',
    user_id: testUser.id,
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
    user_id: testUser.id,
    type: 'playlist',
    youtube_video_id: null,
    youtube_playlist_id: 'PL1234567890ABCDEF',
    source_url: 'https://www.youtube.com/playlist?list=PL1234567890ABCDEF',
    normalized_source_key: 'playlist:PL1234567890ABCDEF',
    title: 'Advanced Distributed Systems',
    thumbnail_url: 'https://i.ytimg.com/vi/thumb/hqdefault.jpg',
    status: 'ready',
    created_at: '2026-09-24T12:00:00.000Z',
    updated_at: '2026-09-24T12:00:00.000Z',
    videos: [
      {
        id: 'child-1',
        learning_item_id: '44444444-4444-4444-4444-444444444444',
        youtube_video_id: 'vid1111abcd',
        title: 'Lecture 1',
        thumbnail_url: null,
        source_position: 0,
        created_at: '2026-09-24T12:00:00.000Z'
      },
      {
        id: 'child-2',
        learning_item_id: '44444444-4444-4444-4444-444444444444',
        youtube_video_id: 'vid2222abcd',
        title: 'Lecture 2',
        thumbnail_url: null,
        source_position: 1,
        created_at: '2026-09-24T12:00:00.000Z'
      },
      {
        id: 'child-3',
        learning_item_id: '44444444-4444-4444-4444-444444444444',
        youtube_video_id: 'vid3333abcd',
        title: 'Lecture 3',
        thumbnail_url: null,
        source_position: 2,
        created_at: '2026-09-24T12:00:00.000Z'
      }
    ]
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.YOUTUBE_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
      user: testUser,
      accessToken: 'token-test',
      supabase: {} as any
    });
  });

  // 1. Valid import body larger than 4 KB
  it('accepts a valid import body larger than 4 KB (prevents 413 false-positive)', async () => {
    vi.spyOn(ImportService.prototype, 'importFromUrl').mockResolvedValue({
      item: sampleVideoItem,
      isDuplicate: false
    });

    const longDescription = 'Distributed Systems In-Depth '.repeat(200);
    const bodyObj = {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Advanced Distributed Systems Lecture',
      description: longDescription,
      skillDomain: 'Systems Architecture',
      tags: ['distributed-systems', 'architecture', 'raft', 'consensus']
    };
    const bodyStr = JSON.stringify(bodyObj);
    expect(bodyStr.length).toBeGreaterThan(4096);

    const req = new Request('http://localhost:3000/api/learning-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(bodyStr.length),
        Authorization: 'Bearer token-test'
      },
      body: bodyStr
    });

    const res = await importRoute(req as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBe(sampleVideoItem.id);
    expect(json.duplicate).toBe(false);
  });

  // 2. Valid playlist with approximately 80 selected video IDs
  it('accepts a valid playlist with 80 selected video IDs', async () => {
    let capturedOptions: any = null;
    vi.spyOn(ImportService.prototype, 'importFromUrl').mockImplementation(async (_client, _user, options) => {
      capturedOptions = options;
      return {
        item: samplePlaylistItem,
        isDuplicate: false
      };
    });

    const selectedVideoIds = Array.from({ length: 80 }, (_, i) => {
      const padded = String(i).padStart(4, '0');
      return `vid${padded}abcd`; // exactly 11 characters
    });

    const payload = {
      url: 'https://www.youtube.com/playlist?list=PL1234567890ABCDEF',
      title: 'MIT 6.824: Distributed Systems',
      description: 'Spring semester course covering MapReduce, Raft, Paxos, and KV stores.',
      selectedVideoIds
    };
    const payloadStr = JSON.stringify(payload);

    const req = new Request('http://localhost:3000/api/learning-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-test'
      },
      body: payloadStr
    });

    const res = await importRoute(req as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBe(samplePlaylistItem.id);
    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions.selectedVideoIds).toHaveLength(80);
    expect(capturedOptions.selectedVideoIds[0]).toBe('vid0000abcd');
  });

  // 3. Request exceeding the enforced maximum (with Content-Length)
  it('rejects a request exceeding the enforced maximum with Content-Length (413)', async () => {
    const req = new Request('http://localhost:3000/api/learning-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '1048577', // 1 byte over 1 MiB
        Authorization: 'Bearer token-test'
      },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    });

    const res = await importRoute(req as any);
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toBe('Payload too large');
  });

  // 4. Oversized request without Content-Length (incremental stream bounding)
  it('rejects an oversized request without Content-Length header via stream (413)', async () => {
    const chunkSize = 64 * 1024;
    const totalChunks = 17; // 17 * 64 KB = 1088 KB > 1024 KB
    let chunksSent = 0;

    const stream = new ReadableStream({
      pull(controller) {
        if (chunksSent < totalChunks) {
          controller.enqueue(new Uint8Array(chunkSize).fill(65));
          chunksSent++;
        } else {
          controller.close();
        }
      }
    });

    const req = new Request('http://localhost:3000/api/learning-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-test'
      },
      body: stream,
      duplex: 'half'
    } as any);

    const res = await importRoute(req as any);
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toBe('Payload too large');
  });

  // 5. Malformed JSON
  it('rejects malformed non-JSON request body (400 VALIDATION_ERROR)', async () => {
    const req = new Request('http://localhost:3000/api/learning-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-test'
      },
      body: '{ this is not valid json :['
    });

    const res = await importRoute(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toBe('Invalid JSON request body');
  });

  // 6. Invalid source identity
  it('rejects invalid or non-YouTube domain URL (400 VALIDATION_ERROR)', async () => {
    const req = new Request('http://localhost:3000/api/learning-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-test'
      },
      body: JSON.stringify({ url: 'https://vimeo.com/987654321' })
    });

    const res = await importRoute(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects empty string in selectedVideoIds (400 VALIDATION_ERROR)', async () => {
    const req = new Request('http://localhost:3000/api/learning-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-test'
      },
      body: JSON.stringify({
        url: 'https://www.youtube.com/playlist?list=PL1234567890ABCDEF',
        selectedVideoIds: ['validId1234', '']
      })
    });

    const res = await importRoute(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toContain('Video ID cannot be empty');
  });

  // 7. Normal single-video import
  it('imports a normal single video successfully (201 Created, duplicate: false)', async () => {
    vi.spyOn(ImportService.prototype, 'importFromUrl').mockResolvedValue({
      item: sampleVideoItem,
      isDuplicate: false
    });

    const req = new Request('http://localhost:3000/api/learning-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-test'
      },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    });

    const res = await importRoute(req as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBe(sampleVideoItem.id);
    expect(json.duplicate).toBe(false);
  });

  // 8. Duplicate import behavior
  it('handles duplicate import idempotently (200 OK, duplicate: true)', async () => {
    vi.spyOn(ImportService.prototype, 'importFromUrl').mockResolvedValue({
      item: sampleVideoItem,
      isDuplicate: true
    });

    const req = new Request('http://localhost:3000/api/learning-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-test'
      },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    });

    const res = await importRoute(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(sampleVideoItem.id);
    expect(json.duplicate).toBe(true);
  });

  // 9. Check 6: Importing three distinct YouTube URLs
  it('imports three distinct newline-joined YouTube URLs creating expected learning records without invalid URL error', async () => {
    let capturedInput: any = null;
    vi.spyOn(ImportService.prototype, 'importFromUrl').mockImplementation(async (_client, _user, input) => {
      capturedInput = input;
      return {
        item: samplePlaylistItem,
        isDuplicate: false
      };
    });

    const threeUrlsNewline = [
      'https://www.youtube.com/watch?v=vid1111abcd',
      'https://www.youtube.com/watch?v=vid2222abcd',
      'https://www.youtube.com/watch?v=vid3333abcd'
    ].join('\n');

    const req = new Request('http://localhost:3000/api/learning-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-test'
      },
      body: JSON.stringify({
        url: threeUrlsNewline,
        title: '3-Part Course Series'
      })
    });

    const res = await importRoute(req as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBe(samplePlaylistItem.id);
    expect(capturedInput.url).toContain('vid1111abcd');
    expect(capturedInput.url).toContain('vid2222abcd');
    expect(capturedInput.url).toContain('vid3333abcd');
    expect(json.data.videos).toHaveLength(3);
  });

  // 10. Check 7: Duplicate video IDs within playlist are deduplicated
  it('deduplicates duplicate video IDs within a playlist to prevent child insertion constraint violation', async () => {
    const mockRepo = {
      findBySourceKey: vi.fn().mockResolvedValue(null),
      createPlaylistItemWithVideos: vi.fn().mockImplementation(async (_client, parent, videos) => {
        return {
          id: 'test-playlist-dedup',
          ...parent,
          videos
        };
      })
    } as any;

    const mockYtClient = {
      fetchPlaylistMetadata: vi.fn().mockResolvedValue({
        id: 'PL_DEDUP_TEST',
        title: 'Playlist With Duplicates',
        thumbnailUrl: null,
        items: [
          { videoId: 'dupVid11111', title: 'Video 1 (First)', thumbnailUrl: null, sourcePosition: 0, isAccessible: true },
          { videoId: 'dupVid22222', title: 'Video 2', thumbnailUrl: null, sourcePosition: 1, isAccessible: true },
          { videoId: 'dupVid11111', title: 'Video 1 (Duplicate Entry)', thumbnailUrl: null, sourcePosition: 2, isAccessible: true }
        ]
      })
    } as any;

    const service = new ImportService(mockRepo, () => mockYtClient);
    const result = await service.importFromUrl({} as any, testUser, {
      url: 'https://www.youtube.com/playlist?list=PL_DEDUP_TEST'
    });

    expect(result.item).toBeDefined();
    // Verify that the repository received deduplicated child videos (length 2 instead of 3)
    const passedVideos = mockRepo.createPlaylistItemWithVideos.mock.calls[0][2];
    expect(passedVideos).toHaveLength(2);
    expect(passedVideos[0].videoId).toBe('dupVid11111');
    expect(passedVideos[1].videoId).toBe('dupVid22222');
  });

  // 11. Check 7: Failed child insertion triggers rollback compensation and allows clean retry
  it('executes rollback compensation on child insertion failure and allows clean retry', async () => {
    const deletedItemIds: string[] = [];
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'learning_items') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'test-failing-parent-id', status: 'importing' },
                  error: null
                })
              })
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn((field: string, val: string) => {
                if (field === 'id') deletedItemIds.push(val);
                return {
                  eq: vi.fn().mockResolvedValue({ error: null })
                };
              })
            })
          };
        }
        if (table === 'learning_item_videos') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Foreign key or uniqueness constraint failure', code: '23505' }
              })
            })
          };
        }
        return {};
      })
    } as any;

    const repo = new LearningItemRepository();
    await expect(
      repo.createPlaylistItemWithVideos(mockClient, {
        userId: testUser.id,
        youtubePlaylistId: 'PL_FAIL_TEST',
        sourceUrl: 'https://www.youtube.com/playlist?list=PL_FAIL_TEST',
        normalizedSourceKey: 'playlist:PL_FAIL_TEST',
        title: 'Failing Playlist',
        thumbnailUrl: null
      }, [
        { videoId: 'failVid1', title: 'Video 1', thumbnailUrl: null, sourcePosition: 0 }
      ])
    ).rejects.toThrow('Failed to import all playlist items. No partial data was saved.');

    // Verify parent compensation cleanup was called
    expect(deletedItemIds).toContain('test-failing-parent-id');
  });

  // 12. Check 8: readBoundedJson edge cases
  describe('readBoundedJson Edge Cases', () => {
    it('rejects malformed Content-Length header with 400', async () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': 'invalid-number' },
        body: JSON.stringify({ ok: true })
      });
      await expect(readBoundedJson(req)).rejects.toThrow('Invalid Content-Length header');
    });

    it('rejects negative Content-Length header with 400', async () => {
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': '-5' },
        body: JSON.stringify({ ok: true })
      });
      await expect(readBoundedJson(req)).rejects.toThrow('Invalid Content-Length header');
    });

    it('handles invalid environment limits by safely defaulting to 1 MiB', async () => {
      process.env.MAX_IMPORT_PAYLOAD_BYTES = 'not-a-valid-int';
      const body = JSON.stringify({ valid: 'small' });
      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'Content-Length': String(body.length) },
        body
      });
      const parsed = await readBoundedJson<{ valid: string }>(req);
      expect(parsed.valid).toBe('small');
    });

    it('rejects aborted request with 400', async () => {
      const controller = new AbortController();
      controller.abort();

      const req = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 123 }),
        signal: controller.signal
      });

      await expect(readBoundedJson(req)).rejects.toThrow('Request was aborted');
    });
  });
});
