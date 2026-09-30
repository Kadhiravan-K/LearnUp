import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { logger } from '../logging';
import { VideoProgress, LibraryProgress } from '../types';

export class ProgressRepository {
  async upsertProgress(
    client: SupabaseClient,
    userId: string,
    youtubeVideoId: string,
    positionSeconds: number,
    durationSeconds: number | null,
    isCompleted: boolean
  ): Promise<VideoProgress> {
    const { data, error } = await client
      .from('video_progress')
      .upsert({
        user_id: userId,
        youtube_video_id: youtubeVideoId,
        position_seconds: positionSeconds,
        duration_seconds: durationSeconds,
        is_completed: isCompleted,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,youtube_video_id' })
      .select('*')
      .single();

    if (error) {
      logger.error('Database error upserting progress', {
        operation: 'upsertProgress',
        userId,
        youtubeVideoId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to save progress', 500);
    }
    return data as VideoProgress;
  }

  async getLibraryProgress(client: SupabaseClient, userId: string): Promise<LibraryProgress[]> {
    const { data, error } = await client
      .from('library_progress_view')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      logger.warn('View library_progress_view not available or failed to query, returning empty progress list', {
        operation: 'getLibraryProgress',
        userId,
        error: error.message
      });
      return [];
    }
    return (data as LibraryProgress[]) || [];
  }

  async getVideoProgress(client: SupabaseClient, userId: string, youtubeVideoId: string): Promise<VideoProgress | null> {
    const { data, error } = await client
      .from('video_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('youtube_video_id', youtubeVideoId)
      .maybeSingle();

    if (error) {
      logger.error('Database error fetching video progress', {
        operation: 'getVideoProgress',
        userId,
        youtubeVideoId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch video progress', 500);
    }
    return data as VideoProgress | null;
  }

  async getAllVideosProgress(client: SupabaseClient, userId: string): Promise<Pick<VideoProgress, 'youtube_video_id' | 'is_completed' | 'position_seconds' | 'duration_seconds'>[]> {
    const { data, error } = await client
      .from('video_progress')
      .select('youtube_video_id, is_completed, position_seconds, duration_seconds')
      .eq('user_id', userId);

    if (error) {
      logger.error('Database error fetching all videos progress', {
        operation: 'getAllVideosProgress',
        userId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch all videos progress', 500);
    }
    return data;
  }
}
