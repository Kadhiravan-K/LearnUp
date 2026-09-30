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
  });
});
