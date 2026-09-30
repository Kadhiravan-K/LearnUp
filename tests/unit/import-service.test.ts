import { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ILearningItemRepository } from '../../lib/db/repository';
import { ImportService } from '../../lib/services/import-service';
import { AuthenticatedUser, LearningItem, LearningItemWithVideos } from '../../lib/types';
import { IYouTubeClient } from '../../lib/youtube/client';

describe('ImportService', () => {
  let mockRepo: ILearningItemRepository;
  let mockYouTubeClient: IYouTubeClient;
  let importService: ImportService;
  const mockClient = {} as SupabaseClient;
  const user: AuthenticatedUser = { id: 'user-uuid-1', email: 'test@example.com' };

  beforeEach(() => {
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

  it('imports a video successfully when it does not already exist', async () => {
    vi.mocked(mockRepo.findBySourceKey).mockResolvedValue(null);
    vi.mocked(mockYouTubeClient.fetchVideoMetadata).mockResolvedValue({
      id: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      thumbnailUrl: 'https://thumb.url/video.jpg'
    });

    const expectedItem: LearningItem = {
      id: 'item-uuid-1',
      user_id: user.id,
      type: 'video',
      youtube_video_id: 'dQw4w9WgXcQ',
      youtube_playlist_id: null,
      source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      normalized_source_key: 'video:dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      thumbnail_url: 'https://thumb.url/video.jpg',
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    vi.mocked(mockRepo.createVideoItem).mockResolvedValue(expectedItem);

    const result = await importService.importFromUrl(
      mockClient,
      user,
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );

    expect(result.isDuplicate).toBe(false);
    expect(result.item.id).toBe('item-uuid-1');
    expect(mockRepo.findBySourceKey).toHaveBeenCalledWith(mockClient, user.id, 'video:dQw4w9WgXcQ');
    expect(mockYouTubeClient.fetchVideoMetadata).toHaveBeenCalledWith('dQw4w9WgXcQ');
    expect(mockRepo.createVideoItem).toHaveBeenCalled();
  });

  it('returns existing item idempotently when already imported (duplicate import)', async () => {
    const existingItem: LearningItem = {
      id: 'existing-uuid-1',
      user_id: user.id,
      type: 'video',
      youtube_video_id: 'dQw4w9WgXcQ',
      youtube_playlist_id: null,
      source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      normalized_source_key: 'video:dQw4w9WgXcQ',
      title: 'Existing Video',
      thumbnail_url: null,
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    vi.mocked(mockRepo.findBySourceKey).mockResolvedValue(existingItem);

    const result = await importService.importFromUrl(
      mockClient,
      user,
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );

    expect(result.isDuplicate).toBe(true);
    expect(result.item.id).toBe('existing-uuid-1');
    // Ensure YouTube API was never queried for duplicate
    expect(mockYouTubeClient.fetchVideoMetadata).not.toHaveBeenCalled();
    expect(mockRepo.createVideoItem).not.toHaveBeenCalled();
  });

  it('imports a playlist with child items and preserves order', async () => {
    vi.mocked(mockRepo.findBySourceKey).mockResolvedValue(null);
    vi.mocked(mockYouTubeClient.fetchPlaylistMetadata).mockResolvedValue({
      id: 'PL12345',
      title: 'Full Playlist Course',
      thumbnailUrl: 'https://thumb.url/playlist.jpg',
      items: [
        {
          videoId: 'vidA',
          title: 'Lesson 1',
          thumbnailUrl: null,
          sourcePosition: 0,
          isAccessible: true
        },
        {
          videoId: 'vidB',
          title: 'Lesson 2',
          thumbnailUrl: null,
          sourcePosition: 1,
          isAccessible: true
        }
      ]
    });

    const expectedPlaylist: LearningItemWithVideos = {
      id: 'playlist-uuid-1',
      user_id: user.id,
      type: 'playlist',
      youtube_video_id: null,
      youtube_playlist_id: 'PL12345',
      source_url: 'https://www.youtube.com/playlist?list=PL12345',
      normalized_source_key: 'playlist:PL12345',
      title: 'Full Playlist Course',
      thumbnail_url: 'https://thumb.url/playlist.jpg',
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      videos: [
        {
          id: 'v1',
          learning_item_id: 'playlist-uuid-1',
          youtube_video_id: 'vidA',
          title: 'Lesson 1',
          thumbnail_url: null,
          source_position: 0,
          created_at: new Date().toISOString()
        },
        {
          id: 'v2',
          learning_item_id: 'playlist-uuid-1',
          youtube_video_id: 'vidB',
          title: 'Lesson 2',
          thumbnail_url: null,
          source_position: 1,
          created_at: new Date().toISOString()
        }
      ]
    };

    vi.mocked(mockRepo.createPlaylistItemWithVideos).mockResolvedValue(expectedPlaylist);

    const result = await importService.importFromUrl(
      mockClient,
      user,
      'https://www.youtube.com/playlist?list=PL12345'
    );

    expect(result.isDuplicate).toBe(false);
    expect(result.item.type).toBe('playlist');
    expect(result.item.videos).toHaveLength(2);
    expect(result.item.videos![0].source_position).toBe(0);
    expect(result.item.videos![1].source_position).toBe(1);
    expect(mockYouTubeClient.fetchPlaylistMetadata).toHaveBeenCalledWith('PL12345');
  });
});
