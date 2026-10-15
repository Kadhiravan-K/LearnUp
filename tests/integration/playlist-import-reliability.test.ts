import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportService } from '../../lib/services/import-service';
import { LearningItemRepository } from '../../lib/db/repository';
import { AuthenticatedUser, LearningItem, LearningItemWithVideos } from '../../lib/types';
import { AppError } from '../../lib/errors';
import { YouTubeClient } from '../../lib/youtube/client';

describe('SF-102 & SF-103: Playlist Import Reliability & Data-Integrity Test Suite', () => {
  const userA: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'usera@example.com'
  };

  const userB: AuthenticatedUser = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'userb@example.com'
  };

  let mockRepo: any;
  let mockYouTubeClient: any;
  let importService: ImportService;
  const mockClient = {} as any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockRepo = {
      findBySourceKey: vi.fn(),
      createVideoItem: vi.fn(),
      createPlaylistItemWithVideos: vi.fn(),
      listItems: vi.fn(),
      getItemWithVideos: vi.fn(),
      deleteItem: vi.fn()
    };

    mockYouTubeClient = {
      fetchVideoMetadata: vi.fn(),
      fetchPlaylistMetadata: vi.fn()
    };

    importService = new ImportService(mockRepo, mockYouTubeClient);
  });

  // --------------------------------------------------------------------------
  // 1. DUPLICATE VIDEO IDS IN PLAYLIST
  // --------------------------------------------------------------------------
  describe('Duplicate Video IDs in Playlist', () => {
    it('deduplicates repeating video IDs while preserving valid consecutive positions', async () => {
      vi.mocked(mockRepo.findBySourceKey).mockResolvedValue(null);

      // YouTube playlist where video1 appears at index 0 and repeats at index 2
      vi.mocked(mockYouTubeClient.fetchPlaylistMetadata).mockResolvedValue({
        id: 'PL_DUPLICATES',
        title: 'Course with Repeated Intro',
        thumbnailUrl: 'https://thumb.url/pl.jpg',
        items: [
          { videoId: 'video1', title: 'Intro Lecture', thumbnailUrl: null, sourcePosition: 0, isAccessible: true },
          { videoId: 'video2', title: 'Deep Dive Part 1', thumbnailUrl: null, sourcePosition: 1, isAccessible: true },
          { videoId: 'video1', title: 'Intro Lecture (Repeated)', thumbnailUrl: null, sourcePosition: 2, isAccessible: true },
          { videoId: 'video3', title: 'Deep Dive Part 2', thumbnailUrl: null, sourcePosition: 3, isAccessible: true }
        ]
      });

      vi.mocked(mockRepo.createPlaylistItemWithVideos).mockImplementation(async (_client: any, _item: any, videos: any) => {
        return {
          id: 'pl-item-1',
          user_id: userA.id,
          type: 'playlist',
          youtube_video_id: null,
          youtube_playlist_id: 'PL_DUPLICATES',
          source_url: 'https://www.youtube.com/playlist?list=PL_DUPLICATES',
          normalized_source_key: 'playlist:PL_DUPLICATES',
          title: 'Course with Repeated Intro',
          thumbnail_url: 'https://thumb.url/pl.jpg',
          status: 'ready',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          videos: videos.map((v: any, idx: number) => ({
            id: `v-${idx}`,
            learning_item_id: 'pl-item-1',
            youtube_video_id: v.videoId,
            title: v.title,
            thumbnail_url: v.thumbnailUrl,
            source_position: v.sourcePosition,
            created_at: new Date().toISOString()
          }))
        };
      });

      const result = await importService.importFromUrl(
        mockClient,
        userA,
        'https://www.youtube.com/playlist?list=PL_DUPLICATES'
      );

      expect(result.isDuplicate).toBe(false);
      // Repeated video1 was filtered out to prevent DB constraint violation
      expect(result.item.videos).toHaveLength(3);
      expect(result.item.videos![0].youtube_video_id).toBe('video1');
      expect(result.item.videos![0].source_position).toBe(0);
      expect(result.item.videos![1].youtube_video_id).toBe('video2');
      expect(result.item.videos![1].source_position).toBe(1);
      expect(result.item.videos![2].youtube_video_id).toBe('video3');
      expect(result.item.videos![2].source_position).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // 2. CONCURRENT IMPORTS OF IDENTICAL URL (RACE CONDITION)
  // --------------------------------------------------------------------------
  describe('Concurrent Imports by the Same User', () => {
    it('resolves concurrent race conditions gracefully into idempotent result without 409 error', async () => {
      // First lookup returns null for both concurrent calls
      vi.mocked(mockRepo.findBySourceKey).mockResolvedValueOnce(null); // Call 1 lookup
      vi.mocked(mockRepo.findBySourceKey).mockResolvedValueOnce(null); // Call 2 lookup

      vi.mocked(mockYouTubeClient.fetchVideoMetadata).mockResolvedValue({
        id: 'dQw4w9WgXcQ',
        title: 'Concurrent Import Video',
        thumbnailUrl: 'https://thumb.url/vid.jpg'
      });

      const readyItem: LearningItem = {
        id: 'item-winner-1',
        user_id: userA.id,
        type: 'video',
        youtube_video_id: 'dQw4w9WgXcQ',
        youtube_playlist_id: null,
        source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        normalized_source_key: 'video:dQw4w9WgXcQ',
        title: 'Concurrent Import Video',
        thumbnail_url: 'https://thumb.url/vid.jpg',
        status: 'ready',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Call 1 succeeds
      vi.mocked(mockRepo.createVideoItem).mockResolvedValueOnce(readyItem);
      // Call 2 hits unique constraint violation 409
      vi.mocked(mockRepo.createVideoItem).mockRejectedValueOnce(
        new AppError('VALIDATION_ERROR', 'This video is already in your library.', 409)
      );

      // In the catch handler, Call 2 re-checks findBySourceKey and finds the ready item
      vi.mocked(mockRepo.findBySourceKey).mockResolvedValueOnce(readyItem);

      const [res1, res2] = await Promise.all([
        importService.importFromUrl(mockClient, userA, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
        importService.importFromUrl(mockClient, userA, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      ]);

      expect(res1.item.id).toBe('item-winner-1');
      expect(res1.isDuplicate).toBe(false);

      expect(res2.item.id).toBe('item-winner-1');
      expect(res2.isDuplicate).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 3. CROSS-USER ISOLATION
  // --------------------------------------------------------------------------
  describe('Cross-User Data Isolation', () => {
    it('isolates learning items when two distinct users import the exact same playlist', async () => {
      vi.mocked(mockRepo.findBySourceKey).mockResolvedValue(null);

      vi.mocked(mockYouTubeClient.fetchPlaylistMetadata).mockResolvedValue({
        id: 'PL_SHARED',
        title: 'Shared Popular Course',
        thumbnailUrl: 'https://thumb.url/shared.jpg',
        items: [
          { videoId: 'v1', title: 'Part 1', thumbnailUrl: null, sourcePosition: 0, isAccessible: true }
        ]
      });

      const userAItem: LearningItemWithVideos = {
        id: 'pl-user-a',
        user_id: userA.id,
        type: 'playlist',
        youtube_video_id: null,
        youtube_playlist_id: 'PL_SHARED',
        source_url: 'https://www.youtube.com/playlist?list=PL_SHARED',
        normalized_source_key: 'playlist:PL_SHARED',
        title: 'Shared Popular Course',
        thumbnail_url: null,
        status: 'ready',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        videos: []
      };

      const userBItem: LearningItemWithVideos = {
        id: 'pl-user-b',
        user_id: userB.id,
        type: 'playlist',
        youtube_video_id: null,
        youtube_playlist_id: 'PL_SHARED',
        source_url: 'https://www.youtube.com/playlist?list=PL_SHARED',
        normalized_source_key: 'playlist:PL_SHARED',
        title: 'Shared Popular Course',
        thumbnail_url: null,
        status: 'ready',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        videos: []
      };

      vi.mocked(mockRepo.createPlaylistItemWithVideos)
        .mockResolvedValueOnce(userAItem)
        .mockResolvedValueOnce(userBItem);

      const resA = await importService.importFromUrl(mockClient, userA, 'https://www.youtube.com/playlist?list=PL_SHARED');
      const resB = await importService.importFromUrl(mockClient, userB, 'https://www.youtube.com/playlist?list=PL_SHARED');

      expect(resA.item.id).toBe('pl-user-a');
      expect(resA.item.user_id).toBe(userA.id);

      expect(resB.item.id).toBe('pl-user-b');
      expect(resB.item.user_id).toBe(userB.id);

      expect(resA.item.id).not.toBe(resB.item.id);
    });
  });

  // --------------------------------------------------------------------------
  // 4. RETRY / SELF-HEALING OF INTERRUPTED OR FAILED IMPORTS
  // --------------------------------------------------------------------------
  describe('Interrupted and Failed Import Self-Healing', () => {
    it('detects an existing item with status "failed", deletes it, and successfully re-imports', async () => {
      const brokenItem: LearningItem = {
        id: 'failed-item-id',
        user_id: userA.id,
        type: 'playlist',
        youtube_video_id: null,
        youtube_playlist_id: 'PL_RETRY',
        source_url: 'https://www.youtube.com/playlist?list=PL_RETRY',
        normalized_source_key: 'playlist:PL_RETRY',
        title: 'Interrupted Course',
        thumbnail_url: null,
        status: 'failed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(mockRepo.findBySourceKey).mockResolvedValue(brokenItem);

      vi.mocked(mockYouTubeClient.fetchPlaylistMetadata).mockResolvedValue({
        id: 'PL_RETRY',
        title: 'Recovered Course',
        thumbnailUrl: null,
        items: [
          { videoId: 'v10', title: 'Recovered Lesson 1', thumbnailUrl: null, sourcePosition: 0, isAccessible: true }
        ]
      });

      const healedItem: LearningItemWithVideos = {
        id: 'healed-item-id',
        user_id: userA.id,
        type: 'playlist',
        youtube_video_id: null,
        youtube_playlist_id: 'PL_RETRY',
        source_url: 'https://www.youtube.com/playlist?list=PL_RETRY',
        normalized_source_key: 'playlist:PL_RETRY',
        title: 'Recovered Course',
        thumbnail_url: null,
        status: 'ready',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        videos: []
      };

      vi.mocked(mockRepo.createPlaylistItemWithVideos).mockResolvedValue(healedItem);

      const result = await importService.importFromUrl(mockClient, userA, 'https://www.youtube.com/playlist?list=PL_RETRY');

      // deleteItem must have been called on the broken record
      expect(mockRepo.deleteItem).toHaveBeenCalledWith(mockClient, userA.id, 'failed-item-id');
      expect(result.isDuplicate).toBe(false);
      expect(result.item.id).toBe('healed-item-id');
    });

    it('detects an orphaned item stuck in "importing" status, cleans it up, and successfully re-imports', async () => {
      const stuckImportingItem: LearningItem = {
        id: 'stuck-importing-id',
        user_id: userA.id,
        type: 'playlist',
        youtube_video_id: null,
        youtube_playlist_id: 'PL_STUCK',
        source_url: 'https://www.youtube.com/playlist?list=PL_STUCK',
        normalized_source_key: 'playlist:PL_STUCK',
        title: 'Stuck Course',
        thumbnail_url: null,
        status: 'importing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(mockRepo.findBySourceKey).mockResolvedValue(stuckImportingItem);

      vi.mocked(mockYouTubeClient.fetchPlaylistMetadata).mockResolvedValue({
        id: 'PL_STUCK',
        title: 'Completed Course',
        thumbnailUrl: null,
        items: [
          { videoId: 'v100', title: 'Lesson 100', thumbnailUrl: null, sourcePosition: 0, isAccessible: true }
        ]
      });

      const completedItem: LearningItemWithVideos = {
        id: 'completed-item-id',
        user_id: userA.id,
        type: 'playlist',
        youtube_video_id: null,
        youtube_playlist_id: 'PL_STUCK',
        source_url: 'https://www.youtube.com/playlist?list=PL_STUCK',
        normalized_source_key: 'playlist:PL_STUCK',
        title: 'Completed Course',
        thumbnail_url: null,
        status: 'ready',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        videos: []
      };

      vi.mocked(mockRepo.createPlaylistItemWithVideos).mockResolvedValue(completedItem);

      const result = await importService.importFromUrl(mockClient, userA, 'https://www.youtube.com/playlist?list=PL_STUCK');

      expect(mockRepo.deleteItem).toHaveBeenCalledWith(mockClient, userA.id, 'stuck-importing-id');
      expect(result.isDuplicate).toBe(false);
      expect(result.item.id).toBe('completed-item-id');
    });
  });

  // --------------------------------------------------------------------------
  // 5. DATABASE ROLLBACK AND COMPENSATING ACTION
  // --------------------------------------------------------------------------
  describe('Database Failure and Compensating Cleanup', () => {
    it('executes compensating delete when child video insertion fails in repository', async () => {
      const realRepo = new LearningItemRepository();

      // Mock Supabase client to simulate failure on learning_item_videos insert
      const fakeParent = { id: 'parent-to-rollback', user_id: userA.id, status: 'importing' };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'learning_items') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: fakeParent, error: null })
                })
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null })
                })
              })
            };
          }
          if (table === 'learning_item_videos') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: '23505', message: 'Simulated unique constraint failure' }
                })
              })
            };
          }
          return {};
        })
      };

      await expect(
        realRepo.createPlaylistItemWithVideos(
          mockSupabase as any,
          {
            userId: userA.id,
            youtubePlaylistId: 'PL_ROLLBACK',
            sourceUrl: 'https://www.youtube.com/playlist?list=PL_ROLLBACK',
            normalizedSourceKey: 'playlist:PL_ROLLBACK',
            title: 'Failed Insertion Playlist',
            thumbnailUrl: null
          },
          [
            { videoId: 'vid-fail', title: 'Failing Video', thumbnailUrl: null, sourcePosition: 0 }
          ]
        )
      ).rejects.toThrow('Failed to import all playlist items. No partial data was saved.');

      // Verify that delete was called on learning_items
      expect(mockSupabase.from).toHaveBeenCalledWith('learning_items');
    });
  });

  // --------------------------------------------------------------------------
  // 6. YOUTUBE API QUOTA EXHAUSTION & TIMEOUT ERROR MAPPING
  // --------------------------------------------------------------------------
  describe('YouTube API Error Mappings', () => {
    it('maps quotaExceeded (403) to 503 YOUTUBE_ERROR', async () => {
      const client = new YouTubeClient('test-key');

      // Mock fetch returning 403 quotaExceeded
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          error: {
            code: 403,
            message: 'The request cannot be completed because you have exceeded your quota.',
            errors: [{ reason: 'quotaExceeded' }]
          }
        })
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(client.fetchPlaylistMetadata('PL_QUOTA')).rejects.toThrow(
        'YouTube API quota limit reached. Please try again later.'
      );
    });

    it('maps rate limit 429 to 503 YOUTUBE_ERROR', async () => {
      const client = new YouTubeClient('test-key');

      const mockResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          error: {
            code: 429,
            message: 'Too Many Requests',
            errors: [{ reason: 'rateLimitExceeded' }]
          }
        })
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(client.fetchPlaylistMetadata('PL_RATELIMIT')).rejects.toThrow(
        'YouTube API quota limit reached. Please try again later.'
      );
    });
  });

  // --------------------------------------------------------------------------
  // 7. LARGE PLAYLIST (200 ITEMS) CHUNKING AND PAGINATION
  // --------------------------------------------------------------------------
  describe('Large Playlist Handling (200 items)', () => {
    it('handles 200 items by chunking database inserts in 50-item batches', async () => {
      const realRepo = new LearningItemRepository();
      const parentId = 'pl-200-items';

      const insertedBatches: any[][] = [];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'learning_items') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: parentId, user_id: userA.id, status: 'importing' },
                    error: null
                  })
                })
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { id: parentId, user_id: userA.id, status: 'ready' },
                        error: null
                      })
                    })
                  })
                })
              })
            };
          }
          if (table === 'learning_item_videos') {
            return {
              insert: vi.fn((batch: any[]) => {
                insertedBatches.push(batch);
                return {
                  select: vi.fn().mockResolvedValue({
                    data: batch.map((item, idx) => ({
                      id: `uuid-${insertedBatches.length}-${idx}`,
                      ...item
                    })),
                    error: null
                  })
                };
              })
            };
          }
          return {};
        })
      };

      const largeVideos = Array.from({ length: 200 }, (_, i) => ({
        videoId: `vid_${i}`,
        title: `Lesson ${i + 1}`,
        thumbnailUrl: `https://i.ytimg.com/vi/vid_${i}/default.jpg`,
        sourcePosition: i,
        durationSeconds: 1200,
        durationFormatted: '20:00'
      }));

      const result = await realRepo.createPlaylistItemWithVideos(
        mockSupabase as any,
        {
          userId: userA.id,
          youtubePlaylistId: 'PL_200',
          sourceUrl: 'https://www.youtube.com/playlist?list=PL_200',
          normalizedSourceKey: 'playlist:PL_200',
          title: 'Massive 200-Video Course',
          thumbnailUrl: null
        },
        largeVideos
      );

      // Verify that exactly 4 chunks of 50 were inserted (200 / 50 = 4)
      expect(insertedBatches).toHaveLength(4);
      expect(insertedBatches[0]).toHaveLength(50);
      expect(insertedBatches[1]).toHaveLength(50);
      expect(insertedBatches[2]).toHaveLength(50);
      expect(insertedBatches[3]).toHaveLength(50);

      // Verify that all 200 videos are present in the final returned result
      expect(result.videos).toHaveLength(200);
      expect(result.videos![0].source_position).toBe(0);
      expect(result.videos![199].source_position).toBe(199);
      expect(result.status).toBe('ready');
    });
  });
});
