import { describe, expect, it } from 'vitest';
import {
  isItemCompleted,
  isItemInProgress,
  isItemNotStarted,
  filterLibraryItems,
  getLibraryFilterCounts,
} from '../../components/library/LibraryFilterBar';
import type { LibraryItemWithProgress } from '../../lib/hooks/useLibrary';

function createMockItem(
  id: string,
  progress?: { is_completed: boolean; progress_percentage: number }
): LibraryItemWithProgress {
  return {
    id,
    user_id: 'user-123',
    type: 'video',
    youtube_video_id: `vid-${id}`,
    youtube_playlist_id: null,
    source_url: `https://youtube.com/watch?v=vid-${id}`,
    normalized_source_key: `video:vid-${id}`,
    title: `Item ${id}`,
    thumbnail_url: null,
    status: 'ready',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    progress: progress
      ? {
          learning_item_id: id,
          is_completed: progress.is_completed,
          progress_percentage: progress.progress_percentage,
        }
      : undefined,
  };
}

describe('Library Status Filtering Logic (SF-041)', () => {
  const notStartedItem = createMockItem('not-started');
  const zeroProgressItem = createMockItem('zero-pct', { is_completed: false, progress_percentage: 0 });
  const inProgressItem1 = createMockItem('in-prog-1', { is_completed: false, progress_percentage: 35 });
  const inProgressItem2 = createMockItem('in-prog-2', { is_completed: false, progress_percentage: 90 });
  const completedFlagItem = createMockItem('completed-flag', { is_completed: true, progress_percentage: 75 });
  const completedHundredItem = createMockItem('completed-hundred', { is_completed: false, progress_percentage: 100 });

  const allItems: LibraryItemWithProgress[] = [
    notStartedItem,
    zeroProgressItem,
    inProgressItem1,
    inProgressItem2,
    completedFlagItem,
    completedHundredItem,
  ];

  describe('isItemCompleted', () => {
    it('returns true when is_completed flag is true', () => {
      expect(isItemCompleted(completedFlagItem)).toBe(true);
    });

    it('returns true when progress_percentage is 100% or greater', () => {
      expect(isItemCompleted(completedHundredItem)).toBe(true);
    });

    it('returns false for items with 0% or partial progress', () => {
      expect(isItemCompleted(notStartedItem)).toBe(false);
      expect(isItemCompleted(zeroProgressItem)).toBe(false);
      expect(isItemCompleted(inProgressItem1)).toBe(false);
    });
  });

  describe('isItemInProgress', () => {
    it('returns true for items with progress > 0% and not completed', () => {
      expect(isItemInProgress(inProgressItem1)).toBe(true);
      expect(isItemInProgress(inProgressItem2)).toBe(true);
    });

    it('returns false for items with 0% progress or undefined progress', () => {
      expect(isItemInProgress(notStartedItem)).toBe(false);
      expect(isItemInProgress(zeroProgressItem)).toBe(false);
    });

    it('returns false for completed items even if progress is positive', () => {
      expect(isItemInProgress(completedFlagItem)).toBe(false);
      expect(isItemInProgress(completedHundredItem)).toBe(false);
    });
  });

  describe('isItemNotStarted', () => {
    it('returns true for items with 0% progress and not completed', () => {
      expect(isItemNotStarted(notStartedItem)).toBe(true);
      expect(isItemNotStarted(zeroProgressItem)).toBe(true);
    });

    it('returns false for in-progress and completed items', () => {
      expect(isItemNotStarted(inProgressItem1)).toBe(false);
      expect(isItemNotStarted(completedFlagItem)).toBe(false);
      expect(isItemNotStarted(completedHundredItem)).toBe(false);
    });
  });

  describe('filterLibraryItems', () => {
    it('returns all items when filter is "all"', () => {
      const filtered = filterLibraryItems(allItems, 'all');
      expect(filtered).toHaveLength(6);
      expect(filtered).toEqual(allItems);
    });

    it('returns only in-progress items when filter is "in_progress"', () => {
      const filtered = filterLibraryItems(allItems, 'in_progress');
      expect(filtered).toHaveLength(2);
      expect(filtered.map((item) => item.id)).toEqual(['in-prog-1', 'in-prog-2']);
    });

    it('returns only completed items when filter is "completed"', () => {
      const filtered = filterLibraryItems(allItems, 'completed');
      expect(filtered).toHaveLength(2);
      expect(filtered.map((item) => item.id)).toEqual(['completed-flag', 'completed-hundred']);
    });

    it('returns only not-started items when filter is "not_started"', () => {
      const filtered = filterLibraryItems(allItems, 'not_started');
      expect(filtered).toHaveLength(2);
      expect(filtered.map((item) => item.id)).toEqual(['not-started', 'zero-pct']);
    });

    it('handles empty item array safely for all filters', () => {
      expect(filterLibraryItems([], 'all')).toEqual([]);
      expect(filterLibraryItems([], 'in_progress')).toEqual([]);
      expect(filterLibraryItems([], 'completed')).toEqual([]);
      expect(filterLibraryItems([], 'not_started')).toEqual([]);
    });
  });

  describe('getLibraryFilterCounts', () => {
    it('correctly tallies all, in_progress, completed, and not_started counts', () => {
      const counts = getLibraryFilterCounts(allItems);
      expect(counts).toEqual({
        all: 6,
        in_progress: 2,
        completed: 2,
        not_started: 2,
      });
    });

    it('returns zeros for empty item list', () => {
      const counts = getLibraryFilterCounts([]);
      expect(counts).toEqual({
        all: 0,
        in_progress: 0,
        completed: 0,
        not_started: 0,
      });
    });
  });
});

