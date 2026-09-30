import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { logger } from '../logging';
import { Bookmark } from '../types';

export interface IBookmarksRepository {
  insert(
    client: SupabaseClient,
    bookmark: {
      userId: string;
      learningItemId: string;
      youtubeVideoId: string;
      positionSeconds: number;
      label?: string;
    }
  ): Promise<Bookmark>;

  getById(client: SupabaseClient, userId: string, bookmarkId: string): Promise<Bookmark | null>;

  listByUser(
    client: SupabaseClient,
    userId: string,
    filters?: { learningItemId?: string; youtubeVideoId?: string }
  ): Promise<Bookmark[]>;

  delete(client: SupabaseClient, userId: string, bookmarkId: string): Promise<void>;
}

export class BookmarksRepository implements IBookmarksRepository {
  async insert(
    client: SupabaseClient,
    bookmark: {
      userId: string;
      learningItemId: string;
      youtubeVideoId: string;
      positionSeconds: number;
      label?: string;
    }
  ): Promise<Bookmark> {
    if (bookmark.positionSeconds < 0) {
      throw new AppError('VALIDATION_ERROR', 'positionSeconds must be greater than or equal to 0', 400);
    }

    const { data, error } = await client
      .from('bookmarks')
      .insert({
        user_id: bookmark.userId,
        learning_item_id: bookmark.learningItemId,
        youtube_video_id: bookmark.youtubeVideoId,
        position_seconds: Math.floor(bookmark.positionSeconds),
        label: bookmark.label ? bookmark.label.trim() : ''
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to insert bookmark', {
        operation: 'insertBookmark',
        userId: bookmark.userId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to create bookmark', 500);
    }
    return data as Bookmark;
  }

  async getById(client: SupabaseClient, userId: string, bookmarkId: string): Promise<Bookmark | null> {
    const { data, error } = await client
      .from('bookmarks')
      .select('*')
      .eq('id', bookmarkId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch bookmark', {
        operation: 'getBookmark',
        userId,
        bookmarkId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch bookmark', 500);
    }
    return data as Bookmark | null;
  }

  async listByUser(
    client: SupabaseClient,
    userId: string,
    filters?: { learningItemId?: string; youtubeVideoId?: string }
  ): Promise<Bookmark[]> {
    let query = client
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId);

    if (filters?.learningItemId) {
      query = query.eq('learning_item_id', filters.learningItemId);
    }
    if (filters?.youtubeVideoId) {
      query = query.eq('youtube_video_id', filters.youtubeVideoId);
    }

    const { data, error } = await query
      .order('position_seconds', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to list bookmarks', {
        operation: 'listBookmarks',
        userId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to list bookmarks', 500);
    }
    return (data as Bookmark[]) || [];
  }

  async delete(client: SupabaseClient, userId: string, bookmarkId: string): Promise<void> {
    const { error } = await client
      .from('bookmarks')
      .delete()
      .eq('id', bookmarkId)
      .eq('user_id', userId);

    if (error) {
      if (error.code === '42501') {
        throw new AppError('NOT_FOUND', 'Bookmark not found', 404);
      }
      logger.error('Failed to delete bookmark', {
        operation: 'deleteBookmark',
        userId,
        bookmarkId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to delete bookmark', 500);
    }
  }
}
