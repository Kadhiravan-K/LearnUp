import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { logger } from '../logging';
import { Note } from '../types';

export interface INotesRepository {
  insert(
    client: SupabaseClient,
    note: {
      userId: string;
      learningItemId: string;
      youtubeVideoId: string;
      content: string;
    }
  ): Promise<Note>;

  getById(client: SupabaseClient, userId: string, noteId: string): Promise<Note | null>;

  listByUser(
    client: SupabaseClient,
    userId: string,
    filters?: { learningItemId?: string; youtubeVideoId?: string }
  ): Promise<Note[]>;

  update(
    client: SupabaseClient,
    userId: string,
    noteId: string,
    changes: { content: string }
  ): Promise<Note>;

  delete(client: SupabaseClient, userId: string, noteId: string): Promise<void>;
}

export class NotesRepository implements INotesRepository {
  async insert(
    client: SupabaseClient,
    note: { userId: string; learningItemId: string; youtubeVideoId: string; content: string }
  ): Promise<Note> {
    const { data, error } = await client
      .from('notes')
      .insert({
        user_id: note.userId,
        learning_item_id: note.learningItemId,
        youtube_video_id: note.youtubeVideoId,
        content: note.content
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to insert note', { operation: 'insertNote', userId: note.userId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to create note', 500);
    }
    return data as Note;
  }

  async getById(client: SupabaseClient, userId: string, noteId: string): Promise<Note | null> {
    const { data, error } = await client
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      logger.error('Failed to fetch note', { operation: 'getNote', userId, noteId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch note', 500);
    }
    return data as Note | null;
  }

  async listByUser(
    client: SupabaseClient,
    userId: string,
    filters?: { learningItemId?: string; youtubeVideoId?: string }
  ): Promise<Note[]> {
    let query = client
      .from('notes')
      .select('*')
      .eq('user_id', userId);

    if (filters?.learningItemId) {
      query = query.eq('learning_item_id', filters.learningItemId);
    }
    if (filters?.youtubeVideoId) {
      query = query.eq('youtube_video_id', filters.youtubeVideoId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      logger.error('Failed to list notes', { operation: 'listNotes', userId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to list notes', 500);
    }
    return (data as Note[]) || [];
  }

  async update(
    client: SupabaseClient,
    userId: string,
    noteId: string,
    changes: { content: string }
  ): Promise<Note> {
    const { data, error } = await client
      .from('notes')
      .update({ content: changes.content, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) {
      if (error.code === '42501') {
        // RLS violation – treat as NOT_FOUND for security
        throw new AppError('NOT_FOUND', 'Note not found', 404);
      }
      logger.error('Failed to update note', { operation: 'updateNote', userId, noteId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to update note', 500);
    }
    return data as Note;
  }

  async delete(client: SupabaseClient, userId: string, noteId: string): Promise<void> {
    const { error } = await client
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);
    if (error) {
      if (error.code === '42501') {
        throw new AppError('NOT_FOUND', 'Note not found', 404);
      }
      logger.error('Failed to delete note', { operation: 'deleteNote', userId, noteId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to delete note', 500);
    }
  }
}
