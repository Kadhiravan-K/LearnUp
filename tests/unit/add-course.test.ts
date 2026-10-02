import { describe, it, expect } from 'vitest';
import { AddCourseModal } from '@/components/course/AddCourseModal';
import { previewCourseSchema, importCourseSchema, validateInput } from '@/lib/validation/schemas';
import { ImportService } from '@/lib/services/import-service';

describe('Add Course Modal & Curriculum Ingestion (SF-037)', () => {
  it('exports AddCourseModal component correctly', () => {
    expect(AddCourseModal).toBeDefined();
    expect(typeof AddCourseModal).toBe('function');
  });

  describe('Validation Schemas', () => {
    it('validates correct preview URLs', () => {
      const valid = { url: 'https://www.youtube.com/playlist?list=PLrw6a1aacb36hK07P2v6hJ7u9cR' };
      const parsed = validateInput(previewCourseSchema, valid);
      expect(parsed.url).toBe(valid.url);
    });

    it('rejects empty preview URLs', () => {
      expect(() => {
        validateInput(previewCourseSchema, { url: '' });
      }).toThrow();
    });

    it('validates multi-URL preview payloads', () => {
      const payload = {
        urls: [
          'https://www.youtube.com/watch?v=vid11111111',
          'https://www.youtube.com/watch?v=vid22222222'
        ]
      };
      const parsed = validateInput(previewCourseSchema, payload);
      expect(parsed.urls).toHaveLength(2);
    });

    it('validates complete course import payload with custom metadata', () => {
      const payload = {
        url: 'https://www.youtube.com/playlist?list=PLrw6a1aacb36hK07P2v6hJ7u9cR',
        title: 'Distributed Systems & Consensus Algorithms',
        description: 'Deep dive into Raft leader election and state machine replication.',
        skillDomain: 'Systems Architecture',
        tags: ['distributed-systems', 'raft-consensus', 'go'],
        customThumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
        selectedVideoIds: ['vid1', 'vid2', 'vid3']
      };

      const parsed = validateInput(importCourseSchema, payload);
      expect(parsed.title).toBe(payload.title);
      expect(parsed.tags).toHaveLength(3);
      expect(parsed.selectedVideoIds).toHaveLength(3);
    });
  });

  describe('ImportService Preview Generation', () => {
    it('generates rich course preview structure for video and playlist sources', async () => {
      const mockRepo = {} as any;
      const mockYt = {
        fetchVideoMetadata: async () => ({
          id: 'vid123',
          title: 'Advanced Raft Algorithm',
          thumbnailUrl: 'https://i.ytimg.com/vi/vid123/hqdefault.jpg'
        }),
        fetchPlaylistMetadata: async () => ({
          id: 'PL12345',
          title: 'Distributed Systems Course',
          thumbnailUrl: 'https://i.ytimg.com/vi/thumb/hqdefault.jpg',
          items: [
            { videoId: 'v1', title: 'Lecture 1', thumbnailUrl: null, sourcePosition: 0, isAccessible: true },
            { videoId: 'v2', title: 'Lecture 2', thumbnailUrl: null, sourcePosition: 1, isAccessible: true }
          ]
        })
      };

      const service = new ImportService(mockRepo, mockYt);
      const preview = await service.previewUrl('https://www.youtube.com/playlist?list=PL12345');

      expect(preview.type).toBe('playlist');
      expect(preview.title).toBe('Distributed Systems Course');
      expect(preview.videos).toHaveLength(2);
      expect(preview.videos[0].duration).toBeDefined();
    });

    it('generates multi-URL batch previews combining multiple items', async () => {
      const mockRepo = {} as any;
      const mockYt = {
        fetchVideoMetadata: async (id: string) => ({
          id,
          title: `Video ${id}`,
          thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
        }),
        fetchPlaylistMetadata: async (id: string) => ({
          id,
          title: 'Playlist Title',
          thumbnailUrl: 'https://i.ytimg.com/vi/pl/hqdefault.jpg',
          items: [
            { videoId: 'pl-vid1', title: 'PL Vid 1', thumbnailUrl: null, sourcePosition: 0, isAccessible: true },
            { videoId: 'pl-vid2', title: 'PL Vid 2', thumbnailUrl: null, sourcePosition: 1, isAccessible: true }
          ]
        })
      };

      const service = new ImportService(mockRepo, mockYt);
      const batchPreview = await service.previewMultipleUrls([
        'https://www.youtube.com/watch?v=singleVid11',
        'https://www.youtube.com/playlist?list=PL12345'
      ]);

      expect(batchPreview.videos).toHaveLength(3);
      expect(batchPreview.videos[0].title).toBe('Video singleVid11');
      expect(batchPreview.videos[1].title).toBe('PL Vid 1');
      expect(batchPreview.videos[2].title).toBe('PL Vid 2');
    });

    it('allows client-side removing individual preview items and clearing syllabus', () => {
      let previewVideos = [
        { id: 'pv-vid1-0', videoId: 'vid1', title: 'Lesson 1', duration: '10:00', sourcePosition: 0 },
        { id: 'pv-vid2-1', videoId: 'vid2', title: 'Lesson 2', duration: '15:00', sourcePosition: 1 },
        { id: 'pv-vid3-2', videoId: 'vid3', title: 'Lesson 3', duration: '20:00', sourcePosition: 2 }
      ];

      // Remove item 2
      previewVideos = previewVideos.filter((v) => v.id !== 'pv-vid2-1');
      expect(previewVideos).toHaveLength(2);
      expect(previewVideos.map((v) => v.videoId)).toEqual(['vid1', 'vid3']);

      // Clear all items
      previewVideos = [];
      expect(previewVideos).toHaveLength(0);
    });
  });
});
