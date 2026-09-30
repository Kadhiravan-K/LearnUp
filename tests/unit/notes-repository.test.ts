import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotesRepository } from '@/lib/db/notes-repository';
import { AppError } from '@/lib/errors';
import { SupabaseClient } from '@supabase/supabase-js';

// Minimal mock Supabase client that records calls
function createMockClient() {
  return {
    from: vi.fn()
  } as unknown as SupabaseClient;
}

describe('NotesRepository', () => {
  let repo: NotesRepository;
  let client: any;

  beforeEach(() => {
    repo = new NotesRepository();
    client = createMockClient();
    vi.clearAllMocks();
  });

  it('inserts a note', async () => {
    const note = { id: 'note-1', user_id: 'user-1', learning_item_id: 'li-1', youtube_video_id: 'vid1', content: 'hello' };
    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: note, error: null })
    };
    client.from.mockReturnValue({
      insert: vi.fn().mockReturnValue(insertChain)
    });

    const result = await repo.insert(client, {
      userId: 'user-1',
      learningItemId: 'li-1',
      youtubeVideoId: 'vid1',
      content: 'hello'
    });
    expect(result).toEqual(note);
    expect(client.from).toHaveBeenCalledWith('notes');
  });

  it('lists notes for a user with optional filters and ordering', async () => {
    const notes = [{ id: 'n1' }, { id: 'n2' }];
    const orderMock = vi.fn().mockResolvedValue({ error: null, data: notes });
    const eqVideoMock = vi.fn().mockReturnValue({ order: orderMock });
    const eqItemMock = vi.fn().mockReturnValue({ eq: eqVideoMock, order: orderMock });
    const eqUserMock = vi.fn().mockReturnValue({ eq: eqItemMock, order: orderMock });

    client.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: eqUserMock
      })
    });

    const result = await repo.listByUser(client, 'user-1', {
      learningItemId: 'li-1',
      youtubeVideoId: 'vid1'
    });
    expect(result).toEqual(notes);
    expect(eqItemMock).toHaveBeenCalledWith('learning_item_id', 'li-1');
    expect(eqVideoMock).toHaveBeenCalledWith('youtube_video_id', 'vid1');
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('gets a note by id (found)', async () => {
    const note = { id: 'n1' };
    client.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: note, error: null })
          })
        })
      })
    });
    const result = await repo.getById(client, 'user-1', 'n1');
    expect(result).toEqual(note);
  });

  it('gets a note by id (not found)', async () => {
    client.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      })
    });
    const result = await repo.getById(client, 'user-1', 'missing');
    expect(result).toBeNull();
  });

  it('updates a note', async () => {
    const updated = { id: 'n1', content: 'new' };
    client.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updated, error: null })
            })
          })
        })
      })
    });
    const result = await repo.update(client, 'user-1', 'n1', { content: 'new' });
    expect(result).toEqual(updated);
  });

  it('handles RLS violation on update as NOT_FOUND', async () => {
    client.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: '42501', message: 'RLS' } })
            })
          })
        })
      })
    });
    await expect(repo.update(client, 'user-1', 'n1', { content: 'x' })).rejects.toThrowError(AppError);
  });

  it('deletes a note', async () => {
    const deleteChain = {
      eq: vi.fn().mockReturnThis(),
    } as any;
    deleteChain.then = (cb: any) => cb({ error: null });

    client.from.mockReturnValue({
      delete: vi.fn().mockReturnValue(deleteChain)
    });
    await expect(repo.delete(client, 'user-1', 'n1')).resolves.toBeUndefined();
  });

  it('handles RLS violation on delete as NOT_FOUND', async () => {
    const deleteChain = {
      eq: vi.fn().mockReturnThis(),
    } as any;
    deleteChain.then = (cb: any) => cb({ error: { code: '42501', message: 'RLS violation' } });

    client.from.mockReturnValue({
      delete: vi.fn().mockReturnValue(deleteChain)
    });
    await expect(repo.delete(client, 'user-1', 'n1')).rejects.toThrowError(AppError);
  });
});
