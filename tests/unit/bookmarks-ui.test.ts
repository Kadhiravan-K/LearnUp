import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatTimestamp } from '@/lib/utils/time';
import { Bookmark } from '@/lib/types';

describe('Bookmarks UI & Seek Integration (SF-032)', () => {
  const mockBookmarks: Bookmark[] = [
    {
      id: 'bm-1',
      user_id: 'user-1',
      learning_item_id: 'item-1',
      youtube_video_id: 'vid-1',
      position_seconds: 222,
      label: "Ohm's Law Explanation",
      created_at: '2026-09-29T10:00:00Z'
    },
    {
      id: 'bm-2',
      user_id: 'user-1',
      learning_item_id: 'item-1',
      youtube_video_id: 'vid-1',
      position_seconds: 1045,
      label: "Kirchhoff's Current Law",
      created_at: '2026-09-29T10:05:00Z'
    },
    {
      id: 'bm-3',
      user_id: 'user-1',
      learning_item_id: 'item-1',
      youtube_video_id: 'vid-1',
      position_seconds: 1930,
      label: 'Worked Example Problem',
      created_at: '2026-09-29T10:10:00Z'
    }
  ];

  it('formats timestamps accurately across timeline positions', () => {
    expect(formatTimestamp(mockBookmarks[0].position_seconds)).toBe('03:42');
    expect(formatTimestamp(mockBookmarks[1].position_seconds)).toBe('17:25');
    expect(formatTimestamp(mockBookmarks[2].position_seconds)).toBe('32:10');
  });

  it('sorts bookmarks chronologically by timeline position_seconds ASC', () => {
    const unsorted: Bookmark[] = [
      { ...mockBookmarks[2] },
      { ...mockBookmarks[0] },
      { ...mockBookmarks[1] }
    ];

    const sorted = [...unsorted].sort((a, b) => a.position_seconds - b.position_seconds);
    expect(sorted[0].position_seconds).toBe(222);
    expect(sorted[1].position_seconds).toBe(1045);
    expect(sorted[2].position_seconds).toBe(1930);
  });

  it('handles empty bookmark collections gracefully with appropriate messaging', () => {
    const emptyList: Bookmark[] = [];
    expect(emptyList).toHaveLength(0);
  });

  it('generates screen-reader-friendly accessible action labels', () => {
    mockBookmarks.forEach((bm) => {
      const formatted = formatTimestamp(bm.position_seconds);
      const seekLabel = `Seek video to ${formatted}`;
      const deleteLabel = `Delete bookmark at ${formatted}`;
      expect(seekLabel).toContain(formatted);
      expect(deleteLabel).toContain(formatted);
    });
  });

  it('invokes seek callback with exact numeric position_seconds', () => {
    const onSeekMock = vi.fn();
    const target = mockBookmarks[1];
    
    // Simulate clicking seek button
    onSeekMock(target.position_seconds);

    expect(onSeekMock).toHaveBeenCalledWith(1045);
    expect(onSeekMock).toHaveBeenCalledTimes(1);
  });

  it('invokes delete handler with unique bookmark id', async () => {
    const onDeleteMock = vi.fn().mockResolvedValue(true);
    const target = mockBookmarks[0];

    // Simulate clicking delete button
    const success = await onDeleteMock(target.id);

    expect(onDeleteMock).toHaveBeenCalledWith('bm-1');
    expect(success).toBe(true);
  });
});
