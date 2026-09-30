import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { logger } from '../logging';
import {
  LearningItem,
  LearningItemVideo,
  LearningItemWithVideos
} from '../types';

export interface ILearningItemRepository {
  findBySourceKey(
    client: SupabaseClient,
    userId: string,
    sourceKey: string
  ): Promise<LearningItem | null>;

  createVideoItem(
    client: SupabaseClient,
    item: {
      userId: string;
      youtubeVideoId: string;
      sourceUrl: string;
      normalizedSourceKey: string;
      title: string;
      description?: string | null;
      skillDomain?: string | null;
      tags?: string[];
      author?: string | null;
      totalDurationSeconds?: number;
      thumbnailUrl: string | null;
    }
  ): Promise<LearningItem>;

  createPlaylistItemWithVideos(
    client: SupabaseClient,
    item: {
      userId: string;
      youtubePlaylistId: string;
      sourceUrl: string;
      normalizedSourceKey: string;
      title: string;
      description?: string | null;
      skillDomain?: string | null;
      tags?: string[];
      author?: string | null;
      totalDurationSeconds?: number;
      thumbnailUrl: string | null;
    },
    videos: Array<{
      videoId: string;
      title: string;
      thumbnailUrl: string | null;
      sourcePosition: number;
      durationSeconds?: number;
      durationFormatted?: string;
    }>
  ): Promise<LearningItemWithVideos>;

  listItems(client: SupabaseClient, userId: string): Promise<LearningItem[]>;

  getItemWithVideos(
    client: SupabaseClient,
    userId: string,
    itemId: string
  ): Promise<LearningItemWithVideos>;

  deleteItem(client: SupabaseClient, userId: string, itemId: string): Promise<void>;

  updateItem?(
    client: SupabaseClient,
    userId: string,
    itemId: string,
    updates: {
      title?: string;
      description?: string | null;
      tags?: string[];
    }
  ): Promise<LearningItem>;

  updatePlaylistVideos?(
    client: SupabaseClient,
    userId: string,
    itemId: string,
    videos: Array<{
      id?: string;
      youtube_video_id: string;
      title: string;
      thumbnail_url?: string | null;
      source_position: number;
      duration_seconds?: number | null;
    }>
  ): Promise<LearningItemWithVideos>;
}

export class LearningItemRepository implements ILearningItemRepository {
  async findBySourceKey(
    client: SupabaseClient,
    userId: string,
    sourceKey: string
  ): Promise<LearningItem | null> {
    const { data, error } = await client
      .from('learning_items')
      .select('*')
      .eq('user_id', userId)
      .eq('normalized_source_key', sourceKey)
      .maybeSingle();

    if (error) {
      logger.error('Database error finding item by source key', {
        operation: 'findBySourceKey',
        userId,
        sourceKey,
        error: error.message
      });
      throw new AppError('INTERNAL_ERROR', 'Failed to query library', 500);
    }

    return data as LearningItem | null;
  }

  async createVideoItem(
    client: SupabaseClient,
    item: {
      userId: string;
      youtubeVideoId: string;
      sourceUrl: string;
      normalizedSourceKey: string;
      title: string;
      description?: string | null;
      skillDomain?: string | null;
      tags?: string[];
      author?: string | null;
      totalDurationSeconds?: number;
      thumbnailUrl: string | null;
    }
  ): Promise<LearningItem> {
    const fullPayload: Record<string, any> = {
      user_id: item.userId,
      type: 'video',
      youtube_video_id: item.youtubeVideoId,
      youtube_playlist_id: null,
      source_url: item.sourceUrl,
      normalized_source_key: item.normalizedSourceKey,
      title: item.title,
      description: item.description || null,
      skill_domain: item.skillDomain || 'Systems Architecture',
      tags: item.tags || [],
      author: item.author || null,
      total_duration_seconds: item.totalDurationSeconds || 0,
      thumbnail_url: item.thumbnailUrl,
      status: 'ready'
    };

    let { data, error } = await client
      .from('learning_items')
      .insert(fullPayload)
      .select('*')
      .single();

    // Fallback to baseline core columns if optional metadata columns are not in schema cache
    if (error && error.code !== '23505') {
      const corePayload = {
        user_id: item.userId,
        type: 'video',
        youtube_video_id: item.youtubeVideoId,
        youtube_playlist_id: null,
        source_url: item.sourceUrl,
        normalized_source_key: item.normalizedSourceKey,
        title: item.title,
        thumbnail_url: item.thumbnailUrl,
        status: 'ready'
      };

      const fallbackResult = await client
        .from('learning_items')
        .insert(corePayload)
        .select('*')
        .single();

      if (!fallbackResult.error) {
        data = fallbackResult.data;
        error = null;
      }
    }

    if (error) {
      if (error.code === '23505') {
        throw new AppError('VALIDATION_ERROR', 'This video is already in your library.', 409);
      }
      logger.error('Failed to create video item', {
        operation: 'createVideoItem',
        userId: item.userId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to save video to library', 500);
    }

    return data as LearningItem;
  }

  async createPlaylistItemWithVideos(
    client: SupabaseClient,
    item: {
      userId: string;
      youtubePlaylistId: string;
      sourceUrl: string;
      normalizedSourceKey: string;
      title: string;
      description?: string | null;
      skillDomain?: string | null;
      tags?: string[];
      author?: string | null;
      totalDurationSeconds?: number;
      thumbnailUrl: string | null;
    },
    videos: Array<{
      videoId: string;
      title: string;
      thumbnailUrl: string | null;
      sourcePosition: number;
      durationSeconds?: number;
      durationFormatted?: string;
    }>
  ): Promise<LearningItemWithVideos> {
    // 1. Insert parent playlist record with status 'importing'
    const fullPayload: Record<string, any> = {
      user_id: item.userId,
      type: 'playlist',
      youtube_video_id: null,
      youtube_playlist_id: item.youtubePlaylistId,
      source_url: item.sourceUrl,
      normalized_source_key: item.normalizedSourceKey,
      title: item.title,
      description: item.description || null,
      skill_domain: item.skillDomain || 'Systems Architecture',
      tags: item.tags || [],
      author: item.author || null,
      total_duration_seconds: item.totalDurationSeconds || 0,
      thumbnail_url: item.thumbnailUrl,
      status: 'importing'
    };

    let { data: parent, error: parentError } = await client
      .from('learning_items')
      .insert(fullPayload)
      .select('*')
      .single();

    // Fallback to baseline core columns if optional metadata columns are not in schema cache
    if (parentError && parentError.code !== '23505') {
      const corePayload = {
        user_id: item.userId,
        type: 'playlist',
        youtube_video_id: null,
        youtube_playlist_id: item.youtubePlaylistId,
        source_url: item.sourceUrl,
        normalized_source_key: item.normalizedSourceKey,
        title: item.title,
        thumbnail_url: item.thumbnailUrl,
        status: 'importing'
      };

      const fallbackParent = await client
        .from('learning_items')
        .insert(corePayload)
        .select('*')
        .single();

      if (!fallbackParent.error) {
        parent = fallbackParent.data;
        parentError = null;
      }
    }

    if (parentError) {
      if (parentError.code === '23505') {
        throw new AppError('VALIDATION_ERROR', 'This playlist is already in your library.', 409);
      }
      logger.error('Failed to create playlist item', {
        operation: 'createPlaylistItemWithVideos:parent',
        userId: item.userId,
        error: parentError.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to save playlist to library', 500);
    }

    const playlistId = parent.id;

    // 2. Insert child videos
    if (videos.length > 0) {
      const fullRows = videos.map((v) => ({
        learning_item_id: playlistId,
        youtube_video_id: v.videoId,
        title: v.title,
        thumbnail_url: v.thumbnailUrl,
        source_position: v.sourcePosition,
        duration_seconds: v.durationSeconds || 0,
        duration_formatted: v.durationFormatted || '00:00'
      }));

      let { data: insertedVideos, error: childError } = await client
        .from('learning_item_videos')
        .insert(fullRows)
        .select('*');

      // Fallback to core columns for child videos
      if (childError) {
        const coreRows = videos.map((v) => ({
          learning_item_id: playlistId,
          youtube_video_id: v.videoId,
          title: v.title,
          thumbnail_url: v.thumbnailUrl,
          source_position: v.sourcePosition
        }));

        const fallbackChildren = await client
          .from('learning_item_videos')
          .insert(coreRows)
          .select('*');

        if (!fallbackChildren.error) {
          insertedVideos = fallbackChildren.data;
          childError = null;
        }
      }

      if (childError) {
        logger.error('Failed to insert child videos, executing rollback compensation', {
          operation: 'createPlaylistItemWithVideos:children',
          playlistId,
          error: childError.message
        });

        // Compensating action: clean up the parent row so we don't leave an incomplete/false-success state (FR-014)
        await client.from('learning_items').delete().eq('id', playlistId).eq('user_id', item.userId);

        throw new AppError(
          'DATABASE_ERROR',
          'Failed to import all playlist items. No partial data was saved.',
          500
        );
      }

      // 3. Mark parent as 'ready'
      const { data: updatedParent, error: updateError } = await client
        .from('learning_items')
        .update({ status: 'ready', updated_at: new Date().toISOString() })
        .eq('id', playlistId)
        .eq('user_id', item.userId)
        .select('*')
        .single();

      if (updateError) {
        logger.error('Failed to mark playlist ready', {
          operation: 'createPlaylistItemWithVideos:ready',
          playlistId,
          error: updateError.message
        });
      }

      return {
        ...(updatedParent || parent),
        status: 'ready',
        videos: (insertedVideos as LearningItemVideo[]) || []
      };
    }

    // If playlist is empty, mark ready immediately
    const { data: readyParent } = await client
      .from('learning_items')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', playlistId)
      .eq('user_id', item.userId)
      .select('*')
      .single();

    return {
      ...(readyParent || parent),
      status: 'ready',
      videos: []
    };
  }

  async listItems(client: SupabaseClient, userId: string): Promise<LearningItem[]> {
    const { data, error } = await client
      .from('learning_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Database error listing items', {
        operation: 'listItems',
        userId,
        error: error.message
      });
      throw new AppError('INTERNAL_ERROR', 'Failed to retrieve library items', 500);
    }

    return (data as LearningItem[]) || [];
  }

  async getItemWithVideos(
    client: SupabaseClient,
    userId: string,
    itemId: string
  ): Promise<LearningItemWithVideos> {
    const { data: item, error: itemError } = await client
      .from('learning_items')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', userId)
      .maybeSingle();

    if (itemError) {
      logger.error('Database error fetching item', {
        operation: 'getItemWithVideos:item',
        userId,
        itemId,
        error: itemError.message
      });
      throw new AppError('INTERNAL_ERROR', 'Failed to retrieve learning item', 500);
    }

    if (!item) {
      throw new AppError('NOT_FOUND', 'Learning item not found', 404);
    }

    if (item.type === 'playlist') {
      const { data: videos, error: videosError } = await client
        .from('learning_item_videos')
        .select('*')
        .eq('learning_item_id', itemId)
        .order('source_position', { ascending: true });

      if (videosError) {
        logger.error('Database error fetching child videos', {
          operation: 'getItemWithVideos:children',
          userId,
          itemId,
          error: videosError.message
        });
        throw new AppError('INTERNAL_ERROR', 'Failed to retrieve playlist videos', 500);
      }

      return {
        ...(item as LearningItem),
        videos: (videos as LearningItemVideo[]) || []
      };
    }

    return item as LearningItem;
  }

  async deleteItem(client: SupabaseClient, userId: string, itemId: string): Promise<void> {
    // Check existence and ownership first
    const { data: existing, error: checkError } = await client
      .from('learning_items')
      .select('id')
      .eq('id', itemId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      logger.error('Database error checking item before delete', {
        operation: 'deleteItem:check',
        userId,
        itemId,
        error: checkError.message
      });
      throw new AppError('INTERNAL_ERROR', 'Failed to delete learning item', 500);
    }

    if (!existing) {
      throw new AppError('NOT_FOUND', 'Learning item not found', 404);
    }

    const { error: deleteError } = await client
      .from('learning_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId);

    if (deleteError) {
      logger.error('Database error deleting item', {
        operation: 'deleteItem',
        userId,
        itemId,
        error: deleteError.message
      });
      throw new AppError('INTERNAL_ERROR', 'Failed to delete learning item', 500);
    }
  }

  async updateItem(
    client: SupabaseClient,
    userId: string,
    itemId: string,
    updates: {
      title?: string;
      description?: string | null;
      tags?: string[];
    }
  ): Promise<LearningItem> {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (updates.title !== undefined) updatePayload.title = updates.title;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.tags !== undefined) updatePayload.tags = updates.tags;

    const { data, error } = await client
      .from('learning_items')
      .update(updatePayload)
      .eq('id', itemId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      logger.error('Database error updating learning item', {
        operation: 'updateItem',
        userId,
        itemId,
        error: error.message
      });
      throw new AppError('INTERNAL_ERROR', 'Failed to update learning item', 500);
    }

    return data as LearningItem;
  }

  async updatePlaylistVideos(
    client: SupabaseClient,
    userId: string,
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
    // 1. Verify parent ownership
    const parent = await this.getItemWithVideos(client, userId, itemId);
    if (!parent) {
      throw new AppError('NOT_FOUND', 'Learning item not found', 404);
    }

    // 2. Fetch existing children
    const { data: existingChildren, error: fetchErr } = await client
      .from('learning_item_videos')
      .select('id, youtube_video_id')
      .eq('learning_item_id', itemId);

    if (fetchErr) {
      logger.error('Failed to fetch existing child videos for update', {
        operation: 'updatePlaylistVideos:fetch',
        itemId,
        error: fetchErr.message
      });
      throw new AppError('INTERNAL_ERROR', 'Failed to update playlist order', 500);
    }

    const newVideoIds = new Set(videos.map((v) => v.youtube_video_id));
    const idsToDelete = (existingChildren || [])
      .filter((c) => !newVideoIds.has(c.youtube_video_id))
      .map((c) => c.id);

    // Delete removed child rows
    if (idsToDelete.length > 0) {
      await client
        .from('learning_item_videos')
        .delete()
        .in('id', idsToDelete);
    }

    // Update or insert child rows
    for (const v of videos) {
      const existing = (existingChildren || []).find((c) => c.youtube_video_id === v.youtube_video_id);
      if (existing) {
        await client
          .from('learning_item_videos')
          .update({
            title: v.title,
            source_position: v.source_position,
            thumbnail_url: v.thumbnail_url ?? null
          })
          .eq('id', existing.id);
      } else {
        await client
          .from('learning_item_videos')
          .insert({
            learning_item_id: itemId,
            youtube_video_id: v.youtube_video_id,
            title: v.title,
            thumbnail_url: v.thumbnail_url ?? null,
            source_position: v.source_position,
            duration_seconds: v.duration_seconds ?? 0
          });
      }
    }

    return this.getItemWithVideos(client, userId, itemId);
  }
}
