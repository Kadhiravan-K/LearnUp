import { describe, it, expect } from 'vitest';
import type { LearningItem, LibraryProgress } from '@/lib/types';
import type { LibraryItemWithProgress } from '@/lib/hooks/useLibrary';

// Helper function implementing the dashboard calculation & sorting logic
export function calculateDashboardMetrics(items: LibraryItemWithProgress[]) {
  const totalItems = items.length;
  const completedItems = items.filter((item) => item.progress?.is_completed).length;
  const inProgressItems = items.filter(
    (item) => (item.progress?.progress_percentage || 0) > 0 && !item.progress?.is_completed
  ).length;

  const sortedForContinue = [...items].sort((a, b) => {
    const aProgress = a.progress?.progress_percentage || 0;
    const bProgress = b.progress?.progress_percentage || 0;
    const aCompleted = a.progress?.is_completed ? 1 : 0;
    const bCompleted = b.progress?.is_completed ? 1 : 0;

    if (aCompleted !== bCompleted) {
      return aCompleted - bCompleted;
    }
    return bProgress - aProgress;
  });

  return { totalItems, completedItems, inProgressItems, sortedForContinue };
}

describe('Dashboard Metrics & Continue Learning Logic (SF-035)', () => {
  const sampleItems: LibraryItemWithProgress[] = [
    {
      id: 'item-not-started',
      user_id: 'user-1',
      type: 'video',
      youtube_video_id: 'vid1',
      youtube_playlist_id: null,
      source_url: 'https://youtube.com/watch?v=vid1',
      normalized_source_key: 'video:vid1',
      title: 'Intro Video',
      thumbnail_url: null,
      status: 'ready',
      created_at: '2026-09-24T12:00:00.000Z',
      updated_at: '2026-09-24T12:00:00.000Z',
      progress: {
        learning_item_id: 'item-not-started',
        is_completed: false,
        progress_percentage: 0
      }
    },
    {
      id: 'item-in-progress-40',
      user_id: 'user-1',
      type: 'playlist',
      youtube_video_id: null,
      youtube_playlist_id: 'pl1',
      source_url: 'https://youtube.com/playlist?list=pl1',
      normalized_source_key: 'playlist:pl1',
      title: 'Full Course',
      thumbnail_url: null,
      status: 'ready',
      created_at: '2026-09-24T12:00:00.000Z',
      updated_at: '2026-09-24T12:00:00.000Z',
      progress: {
        learning_item_id: 'item-in-progress-40',
        is_completed: false,
        progress_percentage: 40
      }
    },
    {
      id: 'item-in-progress-80',
      user_id: 'user-1',
      type: 'video',
      youtube_video_id: 'vid2',
      youtube_playlist_id: null,
      source_url: 'https://youtube.com/watch?v=vid2',
      normalized_source_key: 'video:vid2',
      title: 'Advanced Guide',
      thumbnail_url: null,
      status: 'ready',
      created_at: '2026-09-24T12:00:00.000Z',
      updated_at: '2026-09-24T12:00:00.000Z',
      progress: {
        learning_item_id: 'item-in-progress-80',
        is_completed: false,
        progress_percentage: 80
      }
    },
    {
      id: 'item-completed',
      user_id: 'user-1',
      type: 'video',
      youtube_video_id: 'vid3',
      youtube_playlist_id: null,
      source_url: 'https://youtube.com/watch?v=vid3',
      normalized_source_key: 'video:vid3',
      title: 'Completed Quickstart',
      thumbnail_url: null,
      status: 'ready',
      created_at: '2026-09-24T12:00:00.000Z',
      updated_at: '2026-09-24T12:00:00.000Z',
      progress: {
        learning_item_id: 'item-completed',
        is_completed: true,
        progress_percentage: 100
      }
    }
  ];

  it('accurately calculates metric summary counts', () => {
    const { totalItems, inProgressItems, completedItems } = calculateDashboardMetrics(sampleItems);
    expect(totalItems).toBe(4);
    expect(inProgressItems).toBe(2);
    expect(completedItems).toBe(1);
  });

  it('orders items so in-progress appear first (highest progress first) and completed at the end', () => {
    const { sortedForContinue } = calculateDashboardMetrics(sampleItems);
    const sortedIds = sortedForContinue.map((i) => i.id);

    expect(sortedIds).toEqual([
      'item-in-progress-80',
      'item-in-progress-40',
      'item-not-started',
      'item-completed'
    ]);
  });

  it('handles empty library list cleanly', () => {
    const { totalItems, inProgressItems, completedItems, sortedForContinue } = calculateDashboardMetrics([]);
    expect(totalItems).toBe(0);
    expect(inProgressItems).toBe(0);
    expect(completedItems).toBe(0);
    expect(sortedForContinue).toEqual([]);
  });
});
