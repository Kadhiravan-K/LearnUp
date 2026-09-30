import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookmarksRepository } from '@/lib/db/bookmarks-repository';
import { AppError } from '@/lib/errors';
import { SupabaseClient } from '@supabase/supabase-js';

function createMockClient() {
  return {
    from: vi.fn()
  } as unknown as SupabaseClient;
}

describe('BookmarksRepository', () => {
  let repo: BookmarksRepository;
  let client: any;

  beforeEach(() => {
    repo = new BookmarksRepository();
    client = createMockClient();
    vi.clearAllMocks();
  });

  it('inserts a bookmark', async () => {
    const bookmark = {
      id: 'bm-1',
      user_id: 'user-1',
      learning_item_id: 'li-1',
      youtube_video_id: 'vid1',
      position_seconds: 125,
      label: 'Key Concept',
      created_at: '2026-09-28T00:00:00Z'
    };

    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: bookmark, error: null })
    };
    client.from.mockReturnValue({
      insert: vi.fn().mockReturnValue(insertChain)
    });

    const result = await repo.insert(client, {
      userId: 'user-1',
      learningItemId: 'li-1',
      youtubeVideoId: 'vid1',
      positionSeconds: 125,
      label: 'Key Concept'
    });

    expect(result).toEqual(bookmark);
    expect(client.from).toHaveBeenCalledWith('bookmarks');
  });

  it('rejects insertion with negative positionSeconds', async () => {
    await expect(
      repo.insert(client, {
        userId: 'user-1',
        learningItemId: 'li-1',
        youtubeVideoId: 'vid1',
        positionSeconds: -5
      })
    ).rejects.toThrowError(AppError);
  });

  it('lists bookmarks for a user ordered by position_seconds and created_at', async () => {
    const bookmarks = [{ id: 'b1', position_seconds: 30 }, { id: 'b2', position_seconds: 90 }];
    const orderCreatedMock = vi.fn().mockResolvedValue({ error: null, data: bookmarks });
    const orderPosMock = vi.fn().mockReturnValue({ order: orderCreatedMock });
    const eqVideoMock = vi.fn().mockReturnValue({ order: orderPosMock });
    const eqItemMock = vi.fn().mockReturnValue({ eq: eqVideoMock, order: orderPosMock });
    const eqUserMock = vi.fn().mockReturnValue({ eq: eqItemMock, order: orderPosMock });

    client.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: eqUserMock
      })
    });

    const result = await repo.listByUser(client, 'user-1', {
      learningItemId: 'li-1',
      youtubeVideoId: 'vid1'
    });

    expect(result).toEqual(bookmarks);
    expect(eqItemMock).toHaveBeenCalledWith('learning_item_id', 'li-1');
    expect(eqVideoMock).toHaveBeenCalledWith('youtube_video_id', 'vid1');
    expect(orderPosMock).toHaveBeenCalledWith('position_seconds', { ascending: true });
    expect(orderCreatedMock).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('gets a bookmark by id (found)', async () => {
    const bookmark = { id: 'b1' };
    client.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: bookmark, error: null })
          })
        })
      })
    });
    const result = await repo.getById(client, 'user-1', 'b1');
    expect(result).toEqual(bookmark);
  });

  it('gets a bookmark by id (not found)', async () => {
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

  it('deletes a bookmark', async () => {
    const deleteChain = {
      eq: vi.fn().mockReturnThis(),
    } as any;
    deleteChain.then = (cb: any) => cb({ error: null });

    client.from.mockReturnValue({
      delete: vi.fn().mockReturnValue(deleteChain)
    });
    await expect(repo.delete(client, 'user-1', 'b1')).resolves.toBeUndefined();
  });

  it('handles RLS violation on delete as NOT_FOUND', async () => {
    const deleteChain = {
      eq: vi.fn().mockReturnThis(),
    } as any;
    deleteChain.then = (cb: any) => cb({ error: { code: '42501', message: 'RLS violation' } });

    client.from.mockReturnValue({
      delete: vi.fn().mockReturnValue(deleteChain)
    });
    await expect(repo.delete(client, 'user-1', 'b1')).rejects.toThrowError(AppError);
  });
});
