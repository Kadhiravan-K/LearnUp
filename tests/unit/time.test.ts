import { describe, it, expect } from 'vitest';
import { formatTimestamp } from '@/lib/utils/time';

describe('formatTimestamp utility', () => {
  it('formats seconds under a minute', () => {
    expect(formatTimestamp(0)).toBe('00:00');
    expect(formatTimestamp(5)).toBe('00:05');
    expect(formatTimestamp(59)).toBe('00:59');
  });

  it('formats minutes and seconds', () => {
    expect(formatTimestamp(60)).toBe('01:00');
    expect(formatTimestamp(75)).toBe('01:15');
    expect(formatTimestamp(599)).toBe('09:59');
    expect(formatTimestamp(600)).toBe('10:00');
    expect(formatTimestamp(3599)).toBe('59:59');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatTimestamp(3600)).toBe('1:00:00');
    expect(formatTimestamp(3665)).toBe('1:01:05');
    expect(formatTimestamp(7200)).toBe('2:00:00');
    expect(formatTimestamp(36000)).toBe('10:00:00');
  });

  it('handles negative or invalid values safely', () => {
    expect(formatTimestamp(-10)).toBe('00:00');
    expect(formatTimestamp(NaN)).toBe('00:00');
  });

  it('floors fractional seconds', () => {
    expect(formatTimestamp(12.7)).toBe('00:12');
    expect(formatTimestamp(65.9)).toBe('01:05');
  });
});
