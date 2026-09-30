import { describe, expect, it } from 'vitest';
import { parseYouTubeUrl } from '../../lib/youtube/parser';

describe('YouTube URL Parser & Classifier', () => {
  describe('Video URLs', () => {
    it('parses standard https://www.youtube.com/watch?v=VIDEO_ID', () => {
      const res = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(res).toEqual({
        type: 'video',
        id: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        normalizedSourceKey: 'video:dQw4w9WgXcQ'
      });
    });

    it('parses watch URL with additional query parameters (&t=120, &feature=share)', () => {
      const res = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s&feature=share');
      expect(res).toEqual({
        type: 'video',
        id: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        normalizedSourceKey: 'video:dQw4w9WgXcQ'
      });
    });

    it('parses mobile URL m.youtube.com', () => {
      const res = parseYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(res.type).toBe('video');
      expect(res.id).toBe('dQw4w9WgXcQ');
      expect(res.normalizedSourceKey).toBe('video:dQw4w9WgXcQ');
    });

    it('parses short youtu.be URL', () => {
      const res = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
      expect(res).toEqual({
        type: 'video',
        id: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        normalizedSourceKey: 'video:dQw4w9WgXcQ'
      });
    });

    it('parses shorts URL https://www.youtube.com/shorts/VIDEO_ID', () => {
      const res = parseYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
      expect(res).toEqual({
        type: 'video',
        id: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        normalizedSourceKey: 'video:dQw4w9WgXcQ'
      });
    });

    it('parses embed URL https://www.youtube.com/embed/VIDEO_ID', () => {
      const res = parseYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(res).toEqual({
        type: 'video',
        id: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        normalizedSourceKey: 'video:dQw4w9WgXcQ'
      });
    });

    it('handles URLs without protocol (auto prepends https://)', () => {
      const res = parseYouTubeUrl('youtube.com/watch?v=dQw4w9WgXcQ');
      expect(res.id).toBe('dQw4w9WgXcQ');
      expect(res.type).toBe('video');
    });
  });

  describe('Playlist URLs', () => {
    it('parses standard https://www.youtube.com/playlist?list=PLAYLIST_ID', () => {
      const res = parseYouTubeUrl('https://www.youtube.com/playlist?list=PL1234567890ABCDEF');
      expect(res).toEqual({
        type: 'playlist',
        id: 'PL1234567890ABCDEF',
        canonicalUrl: 'https://www.youtube.com/playlist?list=PL1234567890ABCDEF',
        normalizedSourceKey: 'playlist:PL1234567890ABCDEF'
      });
    });

    it('parses playlist with extra parameters', () => {
      const res = parseYouTubeUrl('https://www.youtube.com/playlist?list=PL1234567890ABCDEF&si=xyz&disable_polymer=true');
      expect(res.type).toBe('playlist');
      expect(res.id).toBe('PL1234567890ABCDEF');
      expect(res.normalizedSourceKey).toBe('playlist:PL1234567890ABCDEF');
    });
  });

  describe('Invalid and Unsupported URLs', () => {
    it('rejects empty input', () => {
      expect(() => parseYouTubeUrl('')).toThrowError(/URL is required/);
    });

    it('rejects non-URL strings', () => {
      expect(() => parseYouTubeUrl('not a url')).toThrowError(/not a valid URL/);
    });

    it('rejects unsupported domains (e.g. Vimeo, Google)', () => {
      expect(() => parseYouTubeUrl('https://vimeo.com/12345678')).toThrowError(
        /Unsupported domain "vimeo.com"/
      );
      expect(() => parseYouTubeUrl('https://google.com')).toThrowError(/Unsupported domain/);
    });

    it('rejects YouTube channel and user URLs', () => {
      expect(() => parseYouTubeUrl('https://www.youtube.com/@veritasium')).toThrowError(
        /not a supported YouTube video or playlist format/
      );
      expect(() => parseYouTubeUrl('https://www.youtube.com/channel/UC1234567890')).toThrowError(
        /not a supported YouTube video or playlist format/
      );
    });

    it('rejects watch URL with missing or invalid video ID', () => {
      expect(() => parseYouTubeUrl('https://www.youtube.com/watch?v=short')).toThrowError(
        /Invalid or missing "v" parameter/
      );
      expect(() => parseYouTubeUrl('https://www.youtube.com/watch')).toThrowError(
        /Invalid or missing "v" parameter/
      );
    });

    it('rejects unsupported protocols such as ftp:// and file://', () => {
      expect(() => parseYouTubeUrl('ftp://www.youtube.com/watch?v=dQw4w9WgXcQ')).toThrowError(
        /Only HTTP and HTTPS protocols are supported/
      );
    });

    it('parses regional subdomains such as es.youtube.com', () => {
      const res = parseYouTubeUrl('https://es.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(res.id).toBe('dQw4w9WgXcQ');
      expect(res.type).toBe('video');
    });

    it('rejects playlist URL with missing or invalid list ID', () => {
      expect(() => parseYouTubeUrl('https://www.youtube.com/playlist?list=')).toThrowError(
        /Invalid or missing playlist ID/
      );
    });
  });
});
