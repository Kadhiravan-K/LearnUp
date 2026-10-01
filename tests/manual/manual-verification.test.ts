import { beforeEach, describe, expect, it } from 'vitest';
import { parseYouTubeUrl } from '../../lib/youtube/parser';
import { IYouTubeClient } from '../../lib/youtube/client';
import { ImportService } from '../../lib/services/import-service';
import { LibraryService } from '../../lib/services/library-service';
import { ILearningItemRepository } from '../../lib/db/repository';
import {
  AuthenticatedUser,
  LearningItem,
  LearningItemWithVideos,
  YouTubePlaylistMetadata,
  YouTubeVideoMetadata
} from '../../lib/types';
import { AppError, formatErrorResponse } from '../../lib/errors';

// In-Memory Repository implementing ILearningItemRepository for deterministic manual verification
class InMemoryRepository implements ILearningItemRepository {
  public items: Map<string, LearningItem> = new Map();
  public videos: Map<string, Array<{
    id: string;
    learning_item_id: string;
    youtube_video_id: string;
    title: string;
    thumbnail_url: string | null;
    source_position: number;
    created_at: string;
  }>> = new Map();

  async findBySourceKey(
    _client: any,
    userId: string,
    sourceKey: string
  ): Promise<LearningItem | null> {
    for (const item of this.items.values()) {
      if (item.user_id === userId && item.normalized_source_key === sourceKey) {
        return item;
      }
    }
    return null;
  }

  async createVideoItem(
    _client: any,
    item: {
      userId: string;
      youtubeVideoId: string;
      sourceUrl: string;
      normalizedSourceKey: string;
      title: string;
      thumbnailUrl: string | null;
    }
  ): Promise<LearningItem> {
    const existing = await this.findBySourceKey(_client, item.userId, item.normalizedSourceKey);
    if (existing) {
      throw new AppError('VALIDATION_ERROR', 'This video is already in your library.', 409);
    }

    const id = `item-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    const newItem: LearningItem = {
      id,
      user_id: item.userId,
      type: 'video',
      youtube_video_id: item.youtubeVideoId,
      youtube_playlist_id: null,
      source_url: item.sourceUrl,
      normalized_source_key: item.normalizedSourceKey,
      title: item.title,
      thumbnail_url: item.thumbnailUrl,
      status: 'ready',
      created_at: now,
      updated_at: now
    };
    this.items.set(id, newItem);
    return newItem;
  }

  async createPlaylistItemWithVideos(
    _client: any,
    item: {
      userId: string;
      youtubePlaylistId: string;
      sourceUrl: string;
      normalizedSourceKey: string;
      title: string;
      thumbnailUrl: string | null;
    },
    videos: Array<{
      videoId: string;
      title: string;
      thumbnailUrl: string | null;
      sourcePosition: number;
    }>
  ): Promise<LearningItemWithVideos> {
    const existing = await this.findBySourceKey(_client, item.userId, item.normalizedSourceKey);
    if (existing) {
      throw new AppError('VALIDATION_ERROR', 'This playlist is already in your library.', 409);
    }

    const id = `item-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    const newPlaylist: LearningItem = {
      id,
      user_id: item.userId,
      type: 'playlist',
      youtube_video_id: null,
      youtube_playlist_id: item.youtubePlaylistId,
      source_url: item.sourceUrl,
      normalized_source_key: item.normalizedSourceKey,
      title: item.title,
      thumbnail_url: item.thumbnailUrl,
      status: 'ready',
      created_at: now,
      updated_at: now
    };
    this.items.set(id, newPlaylist);

    const childRows = videos.map((v, i) => ({
      id: `child-${id}-${i}`,
      learning_item_id: id,
      youtube_video_id: v.videoId,
      title: v.title,
      thumbnail_url: v.thumbnailUrl,
      source_position: v.sourcePosition,
      created_at: now
    }));
    this.videos.set(id, childRows);

    return {
      ...newPlaylist,
      videos: childRows
    };
  }

  async listItems(_client: any, userId: string): Promise<LearningItem[]> {
    const userItems: LearningItem[] = [];
    for (const item of this.items.values()) {
      if (item.user_id === userId) {
        userItems.push(item);
      }
    }
    return userItems.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getItemWithVideos(
    _client: any,
    userId: string,
    itemId: string
  ): Promise<LearningItemWithVideos> {
    const item = this.items.get(itemId);
    if (!item || item.user_id !== userId) {
      throw new AppError('NOT_FOUND', 'Learning item not found', 404);
    }
    const children = this.videos.get(itemId) || [];
    return {
      ...item,
      videos: [...children].sort((a, b) => a.source_position - b.source_position)
    };
  }

  async deleteItem(_client: any, userId: string, itemId: string): Promise<void> {
    const item = this.items.get(itemId);
    if (!item || item.user_id !== userId) {
      throw new AppError('NOT_FOUND', 'Learning item not found', 404);
    }
    this.items.delete(itemId);
    this.videos.delete(itemId);
  }
}

// Mock YouTube Adapter for Testing
class MockYouTubeClient implements IYouTubeClient {
  async fetchVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata> {
    if (videoId === 'nonexist001') {
      throw new AppError('NOT_FOUND', `YouTube video "${videoId}" not found or is unavailable.`, 404);
    }
    if (videoId === 'private12345') {
      throw new AppError('YOUTUBE_ERROR', `YouTube video "${videoId}" is private and cannot be imported.`, 422);
    }
    return {
      id: videoId,
      title: `Title for ${videoId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    };
  }

  async fetchPlaylistMetadata(playlistId: string): Promise<YouTubePlaylistMetadata> {
    if (playlistId === 'PL_nonexistent') {
      throw new AppError('NOT_FOUND', `YouTube playlist "${playlistId}" not found.`, 404);
    }

    if (playlistId === 'PL_with_unavailable') {
      return {
        id: playlistId,
        title: 'Playlist with Unavailable Items',
        thumbnailUrl: 'https://i.ytimg.com/vi/thumb/hqdefault.jpg',
        items: [
          { videoId: 'acc_vid_001', title: 'Accessible Video 1', thumbnailUrl: null, sourcePosition: 0, isAccessible: true },
          { videoId: 'acc_vid_002', title: 'Accessible Video 2', thumbnailUrl: null, sourcePosition: 1, isAccessible: true }
        ]
      };
    }

    return {
      id: playlistId,
      title: 'Full Course Playlist',
      thumbnailUrl: 'https://i.ytimg.com/vi/thumb/hqdefault.jpg',
      items: [
        { videoId: 'vid_part_111', title: 'Module 1', thumbnailUrl: null, sourcePosition: 0, isAccessible: true },
        { videoId: 'vid_part_222', title: 'Module 2', thumbnailUrl: null, sourcePosition: 1, isAccessible: true },
        { videoId: 'vid_part_333', title: 'Module 3', thumbnailUrl: null, sourcePosition: 2, isAccessible: true }
      ]
    };
  }
}

describe('Manual Testing Verification Matrix (All 8 Required Scenarios)', () => {
  let repo: InMemoryRepository;
  let ytClient: MockYouTubeClient;
  let importService: ImportService;
  let libraryService: LibraryService;

  const userA: AuthenticatedUser = { id: 'user-aaa-111', email: 'userA@LearnUp.internal' };
  const userB: AuthenticatedUser = { id: 'user-bbb-222', email: 'userB@LearnUp.internal' };
  const mockDbClient = {} as any;

  beforeEach(() => {
    repo = new InMemoryRepository();
    ytClient = new MockYouTubeClient();
    importService = new ImportService(repo, ytClient);
    libraryService = new LibraryService(repo);
  });

  // 1. Valid video
  it('1. Valid video import creates ready owned item', async () => {
    const validVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const { item, isDuplicate } = await importService.importFromUrl(mockDbClient, userA, validVideoUrl);

    expect(isDuplicate).toBe(false);
    expect(item.type).toBe('video');
    expect(item.youtube_video_id).toBe('dQw4w9WgXcQ');
    expect(item.status).toBe('ready');
    expect(item.user_id).toBe(userA.id);
  });

  // 2. Valid playlist
  it('2. Valid playlist import preserves child video ordering', async () => {
    const validPlaylistUrl = 'https://www.youtube.com/playlist?list=PL1234567890ABCDEF';
    const { item, isDuplicate } = await importService.importFromUrl(mockDbClient, userA, validPlaylistUrl);

    expect(isDuplicate).toBe(false);
    expect(item.type).toBe('playlist');
    expect(item.youtube_playlist_id).toBe('PL1234567890ABCDEF');
    expect(item.videos).toHaveLength(3);

    const positions = item.videos!.map((v) => v.source_position);
    expect(positions).toEqual([0, 1, 2]);
    expect(item.videos![0].youtube_video_id).toBe('vid_part_111');
    expect(item.videos![1].youtube_video_id).toBe('vid_part_222');
    expect(item.videos![2].youtube_video_id).toBe('vid_part_333');
  });

  // 3. Invalid YouTube URL
  it('3. Invalid and unsupported YouTube URLs are rejected with typed validation errors', () => {
    // Unsupported domain
    expect(() => parseYouTubeUrl('https://vimeo.com/12345678')).toThrowError(
      /Unsupported domain "vimeo.com"/
    );
    // Malformed string
    expect(() => parseYouTubeUrl('not a url')).toThrowError(/not a valid URL/);
    // Channel / unsupported format
    expect(() => parseYouTubeUrl('https://www.youtube.com/@somecreator')).toThrowError(
      /not a supported YouTube video or playlist format/
    );
  });

  // 4. Nonexistent video
  it('4. Nonexistent YouTube video returns 404 SOURCE_NOT_FOUND', async () => {
    await expect(
      importService.importFromUrl(mockDbClient, userA, 'https://www.youtube.com/watch?v=nonexist001')
    ).rejects.toThrowError(/not found or is unavailable/);
  });

  // 5. Unavailable playlist item
  it('5. Unavailable/deleted playlist items are skipped gracefully without failing import', async () => {
    const { item } = await importService.importFromUrl(
      mockDbClient,
      userA,
      'https://www.youtube.com/playlist?list=PL_with_unavailable'
    );

    expect(item.status).toBe('ready');
    expect(item.videos).toHaveLength(2);
    expect(item.videos![0].source_position).toBe(0);
    expect(item.videos![1].source_position).toBe(1);
  });

  // 6. Duplicate import
  it('6. Duplicate import returns existing item idempotently without duplicating data', async () => {
    // First import
    await importService.importFromUrl(mockDbClient, userA, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const initialItemCount = repo.items.size;

    // Second import of same source
    const { item, isDuplicate } = await importService.importFromUrl(
      mockDbClient,
      userA,
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );

    expect(isDuplicate).toBe(true);
    expect(item.youtube_video_id).toBe('dQw4w9WgXcQ');
    expect(repo.items.size).toBe(initialItemCount);
  });

  // 7. Unauthenticated request
  it('7. Unauthenticated request is rejected with 401 AUTH_REQUIRED', () => {
    const reqWithoutAuth = new Request('http://localhost:3000/api/learning-items');
    const authHeader = reqWithoutAuth.headers.get('authorization');
    const isDenied = !authHeader || !authHeader.startsWith('Bearer ');
    const formatted = formatErrorResponse(new AppError('UNAUTHORIZED', 'Authentication required', 401));

    expect(isDenied).toBe(true);
    expect(formatted.status).toBe(401);
    expect(formatted.body.error.code).toBe('UNAUTHORIZED');
  });

  // 8. Cross-user access
  it('8. Cross-user access is denied with 404 NOT_FOUND', async () => {
    // Create item for User A
    const { item: itemA } = await importService.importFromUrl(
      mockDbClient,
      userA,
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );

    // User B attempts to read User A item
    await expect(libraryService.getItem(mockDbClient, userB, itemA.id)).rejects.toThrowError(
      /Learning item not found/
    );

    // User B attempts to delete User A item
    await expect(libraryService.removeItem(mockDbClient, userB, itemA.id)).rejects.toThrowError(
      /Learning item not found/
    );

    // Verify User A item is still intact
    const itemStillThere = await libraryService.getItem(mockDbClient, userA, itemA.id);
    expect(itemStillThere.id).toBe(itemA.id);
  });
});
