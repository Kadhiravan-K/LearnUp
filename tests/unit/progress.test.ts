import { describe, it, expect } from 'vitest';
import { isVideoCompleted } from '@/components/player/YouTubePlayer';

describe('isVideoCompleted (90% threshold)', () => {
  it('returns false when position is 0', () => {
    expect(isVideoCompleted(0, 600)).toBe(false);
  });

  it('returns false when position is exactly 50%', () => {
    expect(isVideoCompleted(300, 600)).toBe(false);
  });

  it('returns false when position is at 89%', () => {
    expect(isVideoCompleted(534, 600)).toBe(false);
  });

  it('returns true when position is exactly 90% (boundary - inclusive)', () => {
    expect(isVideoCompleted(540, 600)).toBe(true);
  });

  it('returns true when position is at 91%', () => {
    expect(isVideoCompleted(546, 600)).toBe(true);
  });

  it('returns true when position equals duration (100%)', () => {
    expect(isVideoCompleted(600, 600)).toBe(true);
  });

  it('returns false when duration is 0 (prevents division by zero)', () => {
    expect(isVideoCompleted(100, 0)).toBe(false);
  });

  it('returns false when duration is negative', () => {
    expect(isVideoCompleted(100, -1)).toBe(false);
  });

  it('handles very short videos (10 seconds)', () => {
    expect(isVideoCompleted(9, 10)).toBe(true); // 90% exactly
    expect(isVideoCompleted(10, 10)).toBe(true);  // 100%
  });

  it('handles very long videos (3 hours)', () => {
    const threeHours = 3 * 60 * 60; // 10800 seconds
    const ninetyPercent = Math.floor(threeHours * 0.90); // 9720
    expect(isVideoCompleted(ninetyPercent, threeHours)).toBe(true); // exactly 90%
    expect(isVideoCompleted(ninetyPercent + 1, threeHours)).toBe(true); // 90.01%
  });
});
