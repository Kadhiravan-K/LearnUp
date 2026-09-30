import { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ILearningItemRepository } from '../../lib/db/repository';
import { AppError } from '../../lib/errors';
import { LibraryService } from '../../lib/services/library-service';
import { AuthenticatedUser, LearningItem, LearningItemWithVideos } from '../../lib/types';

describe('LibraryService', () => {
  let mockRepo: ILearningItemRepository;
  let libraryService: LibraryService;
  const mockClient = {} as SupabaseClient;
  const userA: AuthenticatedUser = { id: 'user-a', email: 'user-a@example.com' };

  beforeEach(() => {
    mockRepo = {
      findBySourceKey: vi.fn(),
      createVideoItem: vi.fn(),
      createPlaylistItemWithVideos: vi.fn(),
      listItems: vi.fn(),
      getItemWithVideos: vi.fn(),
      deleteItem: vi.fn()
    };
    libraryService = new LibraryService(mockRepo);
  });

  it('lists items for the authenticated user', async () => {
    const items: LearningItem[] = [
      {
        id: 'item-1',
        user_id: userA.id,
        type: 'video',
        youtube_video_id: 'vid1',
        youtube_playlist_id: null,
        source_url: 'https://youtube.com/watch?v=vid1',
        normalized_source_key: 'video:vid1',
        title: 'Video 1',
        thumbnail_url: null,
        status: 'ready',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    vi.mocked(mockRepo.listItems).mockResolvedValue(items);

    const result = await libraryService.listUserItems(mockClient, userA);
    expect(result).toEqual(items);
    expect(mockRepo.listItems).toHaveBeenCalledWith(mockClient, userA.id);
  });

  it('retrieves an owned learning item with child playlist videos', async () => {
    const item: LearningItemWithVideos = {
      id: 'pl-1',
      user_id: userA.id,
      type: 'playlist',
      youtube_video_id: null,
      youtube_playlist_id: 'PL1',
      source_url: 'https://youtube.com/playlist?list=PL1',
      normalized_source_key: 'playlist:PL1',
      title: 'Playlist 1',
      thumbnail_url: null,
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      videos: [
        {
          id: 'v-1',
          learning_item_id: 'pl-1',
          youtube_video_id: 'vid1',
          title: 'Lesson 1',
          thumbnail_url: null,
          source_position: 0,
          created_at: new Date().toISOString()
        }
      ]
    };

    vi.mocked(mockRepo.getItemWithVideos).mockResolvedValue(item);

    const result = await libraryService.getItem(mockClient, userA, 'pl-1');
    expect(result.id).toBe('pl-1');
    expect(result.videos).toHaveLength(1);
    expect(mockRepo.getItemWithVideos).toHaveBeenCalledWith(mockClient, userA.id, 'pl-1');
  });

  it('throws NOT_FOUND when requesting an item that does not exist or belongs to another user', async () => {
    vi.mocked(mockRepo.getItemWithVideos).mockRejectedValue(
      new AppError('NOT_FOUND', 'Learning item not found', 404)
    );

    await expect(libraryService.getItem(mockClient, userA, 'nonexistent-id')).rejects.toThrowError(
      /Learning item not found/
    );
  });

  it('removes an owned learning item', async () => {
    vi.mocked(mockRepo.deleteItem).mockResolvedValue(undefined);

    await libraryService.removeItem(mockClient, userA, 'pl-1');
    expect(mockRepo.deleteItem).toHaveBeenCalledWith(mockClient, userA.id, 'pl-1');
  });
});
