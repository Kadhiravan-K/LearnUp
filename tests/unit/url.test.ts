import { describe, it, expect } from 'vitest';
import { isValidYouTubeUrl } from '@/lib/utils/url';

describe('isValidYouTubeUrl Unit Tests', () => {
  it('validates standard youtube.com watch URLs', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('validates standard youtube.com playlist URLs', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/playlist?list=PL1234567890')).toBe(true);
  });
  
  it('validates youtu.be short URLs', () => {
    expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });
  
  it('rejects unsupported domains (e.g., Vimeo, Dailymotion)', () => {
    expect(isValidYouTubeUrl('https://vimeo.com/12345678')).toBe(false);
    expect(isValidYouTubeUrl('https://dailymotion.com/video/x7tgad0')).toBe(false);
  });

  it('rejects arbitrary malformed strings', () => {
    expect(isValidYouTubeUrl('not-a-url')).toBe(false);
    expect(isValidYouTubeUrl('')).toBe(false);
  });
});
