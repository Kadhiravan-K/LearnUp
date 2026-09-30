import { SupabaseClient } from '@supabase/supabase-js';
import { ILearningItemRepository } from '../db/repository';
import { logger } from '../logging';
import { AuthenticatedUser, LearningItem, LearningItemWithVideos } from '../types';

export class LibraryService {
  constructor(private readonly repository: ILearningItemRepository) {}

  async listUserItems(client: SupabaseClient, user: AuthenticatedUser): Promise<LearningItem[]> {
    logger.info('Listing library items for user', {
      operation: 'listUserItems',
      userId: user.id
    });
    return this.repository.listItems(client, user.id);
  }

  async getItem(
    client: SupabaseClient,
    user: AuthenticatedUser,
    itemId: string
  ): Promise<LearningItemWithVideos> {
    logger.info('Fetching learning item', {
      operation: 'getItem',
      userId: user.id,
      itemId
    });
    return this.repository.getItemWithVideos(client, user.id, itemId);
  }

  async removeItem(client: SupabaseClient, user: AuthenticatedUser, itemId: string): Promise<void> {
    logger.info('Removing learning item', {
      operation: 'removeItem',
      userId: user.id,
      itemId
    });
    await this.repository.deleteItem(client, user.id, itemId);
    logger.info('Learning item removed successfully', {
      operation: 'removeItem:success',
      userId: user.id,
      itemId
    });
  }

  async updateItem(
    client: SupabaseClient,
    user: AuthenticatedUser,
    itemId: string,
    updates: {
      title?: string;
      description?: string | null;
      tags?: string[];
    }
  ): Promise<LearningItem> {
    logger.info('Updating learning item metadata', {
      operation: 'updateItem',
      userId: user.id,
      itemId
    });
    if (this.repository.updateItem) {
      return this.repository.updateItem(client, user.id, itemId, updates);
    }
    const item = await this.repository.getItemWithVideos(client, user.id, itemId);
    return item;
  }

  async updatePlaylistVideos(
    client: SupabaseClient,
    user: AuthenticatedUser,
    itemId: string,
    videos: Array<{
      id?: string;
      youtube_video_id: string;
      title: string;
      thumbnail_url?: string | null;
      source_position: number;
      duration_seconds?: number | null;
    }>
  ): Promise<LearningItemWithVideos> {
    logger.info('Updating playlist videos sequence', {
      operation: 'updatePlaylistVideos',
      userId: user.id,
      itemId,
      videoCount: videos.length
    });
    if (this.repository.updatePlaylistVideos) {
      return this.repository.updatePlaylistVideos(client, user.id, itemId, videos);
    }
    return this.repository.getItemWithVideos(client, user.id, itemId);
  }
}
