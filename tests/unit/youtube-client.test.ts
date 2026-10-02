import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { YouTubeClient } from '../../lib/youtube/client';

describe('YouTube Client & Adapter', () => {
  const originalFetch = global.fetch;
  let client: YouTubeClient;

  beforeEach(() => {
    client = new YouTubeClient('test-api-key');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('fetchVideoMetadata', () => {
    it('fetches and normalizes public video metadata', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'dQw4w9WgXcQ',
              snippet: {
                title: 'Never Gonna Give You Up',
                thumbnails: {
                  high: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }
                }
              },
              status: { privacyStatus: 'public' }
            }
          ]
        })
      } as unknown as Response);

      const meta = await client.fetchVideoMetadata('dQw4w9WgXcQ');
      expect(meta).toEqual({
        id: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
        thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
      });
    });

    it('throws SOURCE_NOT_FOUND when video items array is empty', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] })
      } as unknown as Response);

      await expect(client.fetchVideoMetadata('nonexistent1')).rejects.toThrowError(
        /not found or is unavailable/
      );
    });

    it('throws SOURCE_UNAVAILABLE when video is private', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'private12345',
              snippet: { title: 'Private Video' },
              status: { privacyStatus: 'private' }
            }
          ]
        })
      } as unknown as Response);

      await expect(client.fetchVideoMetadata('private12345')).rejects.toThrowError(
        /is private and cannot be imported/
      );
    });
  });

  describe('fetchPlaylistMetadata & Pagination & Filtering', () => {
    it('handles pagination across multiple pages and preserves source order', async () => {
      global.fetch = vi.fn().mockImplementation((urlStr: string) => {
        const url = new URL(urlStr);
        if (url.pathname.includes('/playlists')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                {
                  id: 'PL123',
                  snippet: {
                    title: 'Course Playlist',
                    thumbnails: { default: { url: 'https://thumb.url/default.jpg' } }
                  },
                  status: { privacyStatus: 'public' }
                }
              ]
            })
          });
        }

        if (url.pathname.includes('/playlistItems')) {
          const pageToken = url.searchParams.get('pageToken');
          if (!pageToken) {
            // First page returns item 0 and nextPageToken
            return Promise.resolve({
              ok: true,
              json: async () => ({
                nextPageToken: 'page_2',
                items: [
                  {
                    snippet: {
                      title: 'Video 1',
                      position: 0,
                      resourceId: { videoId: 'vid11111111' },
                      thumbnails: { default: { url: 'https://thumb.url/1.jpg' } }
                    }
                  }
                ]
              })
            });
          }

          // Second page returns item 1 with no nextPageToken
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                {
                  snippet: {
                    title: 'Video 2',
                    position: 1,
                    resourceId: { videoId: 'vid22222222' },
                    thumbnails: { default: { url: 'https://thumb.url/2.jpg' } }
                  }
                }
              ]
            })
          });
        }

        return Promise.reject(new Error('Unknown URL'));
      });

      const playlist = await client.fetchPlaylistMetadata('PL123');
      expect(playlist.id).toBe('PL123');
      expect(playlist.title).toBe('Course Playlist');
      expect(playlist.items).toHaveLength(2);
      expect(playlist.items[0].videoId).toBe('vid11111111');
      expect(playlist.items[0].sourcePosition).toBe(0);
      expect(playlist.items[1].videoId).toBe('vid22222222');
      expect(playlist.items[1].sourcePosition).toBe(1);
    });

    it('gracefully skips deleted and private playlist items without failing', async () => {
      global.fetch = vi.fn().mockImplementation((urlStr: string) => {
        const url = new URL(urlStr);
        if (url.pathname.includes('/playlists')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                {
                  id: 'PL_with_deleted',
                  snippet: { title: 'Playlist with Deleted' },
                  status: { privacyStatus: 'public' }
                }
              ]
            })
          });
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [
              {
                snippet: {
                  title: 'Accessible Video 1',
                  position: 0,
                  resourceId: { videoId: 'acc11111111' }
                }
              },
              {
                snippet: {
                  title: 'Deleted video',
                  position: 1,
                  resourceId: { videoId: 'del11111111' }
                }
              },
              {
                snippet: {
                  title: 'Private video',
                  position: 2,
                  resourceId: { videoId: 'priv1111111' }
                }
              },
              {
                snippet: {
                  title: 'Accessible Video 2',
                  position: 3,
                  resourceId: { videoId: 'acc22222222' }
                }
              }
            ]
          })
        });
      });

      const playlist = await client.fetchPlaylistMetadata('PL_with_deleted');
      // Only the 2 accessible videos should remain
      expect(playlist.items).toHaveLength(2);
      expect(playlist.items[0].videoId).toBe('acc11111111');
      expect(playlist.items[0].sourcePosition).toBe(0);
      expect(playlist.items[1].videoId).toBe('acc22222222');
      expect(playlist.items[1].sourcePosition).toBe(1);
    });

    it('throws IMPORT_FAILED (503) when quota is exceeded', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            errors: [{ reason: 'quotaExceeded' }],
            message: 'Quota exceeded'
          }
        })
      } as unknown as Response);

      await expect(client.fetchPlaylistMetadata('PL_quota')).rejects.toThrowError(
        /quota limit reached/
      );
    });

    it('extracts real video IDs using public Atom RSS feed when no API key is provided', async () => {
      const zeroAuthClient = new YouTubeClient('');
      const sampleAtomXml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015">
          <title>Public Go Concurrency Playlist</title>
          <entry>
            <yt:videoId>vid_go_001</yt:videoId>
            <title>Go Routines and Channels</title>
          </entry>
          <entry>
            <yt:videoId>vid_go_002</yt:videoId>
            <title>Select &amp; Context</title>
          </entry>
        </feed>`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => sampleAtomXml
      } as unknown as Response);

      const playlist = await zeroAuthClient.fetchPlaylistMetadata('PL_sample_go');
      expect(playlist.title).toBe('Public Go Concurrency Playlist');
      expect(playlist.items).toHaveLength(2);
      expect(playlist.items[0].videoId).toBe('vid_go_001');
      expect(playlist.items[0].title).toBe('Go Routines and Channels');
      expect(playlist.items[1].videoId).toBe('vid_go_002');
      expect(playlist.items[1].title).toBe('Select & Context');
    });

    it('handles deep pagination continuing beyond 20 pages (simulating 25 pages)', async () => {
      const TOTAL_PAGES = 25;

      global.fetch = vi.fn().mockImplementation((urlStr: string) => {
        const url = new URL(urlStr);
        if (url.pathname.includes('/playlists')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                {
                  id: 'PL_deep_pagination',
                  snippet: { title: 'Deep Paginated Playlist' },
                  status: { privacyStatus: 'public' }
                }
              ]
            })
          });
        }

        if (url.pathname.includes('/playlistItems')) {
          const pageToken = url.searchParams.get('pageToken');
          let currentPage = 1;
          if (pageToken && pageToken.startsWith('page_')) {
            currentPage = parseInt(pageToken.replace('page_', ''), 10);
          }

          const hasNextPage = currentPage < TOTAL_PAGES;
          const videoId = `vid_${String(currentPage).padStart(7, '0')}`;

          return Promise.resolve({
            ok: true,
            json: async () => ({
              nextPageToken: hasNextPage ? `page_${currentPage + 1}` : undefined,
              items: [
                {
                  snippet: {
                    title: `Video Part ${currentPage}`,
                    position: currentPage - 1,
                    resourceId: { videoId }
                  }
                }
              ]
            })
          });
        }

        return Promise.reject(new Error('Unknown URL'));
      });

      const playlist = await client.fetchPlaylistMetadata('PL_deep_pagination');
      expect(playlist.id).toBe('PL_deep_pagination');
      expect(playlist.items).toHaveLength(25);
      expect(playlist.items[0].videoId).toBe('vid_0000001');
      expect(playlist.items[0].sourcePosition).toBe(0);
      expect(playlist.items[24].videoId).toBe('vid_0000025');
      expect(playlist.items[24].sourcePosition).toBe(24);
    });

    it('detects repeated nextPageToken values and safely fails with an error to prevent infinite loops', async () => {
      global.fetch = vi.fn().mockImplementation((urlStr: string) => {
        const url = new URL(urlStr);
        if (url.pathname.includes('/playlists')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [
                {
                  id: 'PL_loop',
                  snippet: { title: 'Looping Playlist' },
                  status: { privacyStatus: 'public' }
                }
              ]
            })
          });
        }

        if (url.pathname.includes('/playlistItems')) {
          // Both initial call and subsequent call return the same nextPageToken 'loop_token_1'
          return Promise.resolve({
            ok: true,
            json: async () => ({
              nextPageToken: 'loop_token_1',
              items: [
                {
                  snippet: {
                    title: 'Looping Item',
                    position: 0,
                    resourceId: { videoId: 'loop_vid_11' }
                  }
                }
              ]
            })
          });
        }

        return Promise.reject(new Error('Unknown URL'));
      });

      await expect(client.fetchPlaylistMetadata('PL_loop')).rejects.toThrowError(
        /infinite loop|duplicate page token/i
      );
    });
  });
});
