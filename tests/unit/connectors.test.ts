import { describe, it, expect } from 'vitest';
import {
  formatNoteForObsidian,
  formatCourseMOCForObsidian,
  syncToObsidian,
  syncToGitHub,
  syncToGoogleCalendar,
  syncToNotion,
  AVAILABLE_CONNECTORS,
  executeConnectorSync
} from '@/lib/connectors';
import { Note, LearningItemWithVideos, Bookmark } from '@/lib/types';

describe('External App Connectors & Local Vault Sync System', () => {
  const mockNote: Note = {
    id: 'note-123',
    user_id: 'user-abc',
    learning_item_id: 'course-456',
    youtube_video_id: 'dQw4w9WgXcQ',
    content: 'Mastered dynamic programming state formulation and memoization table traversal.',
    created_at: '2026-09-29T10:00:00.000Z',
    updated_at: '2026-09-29T10:15:00.000Z'
  };

  const mockCourse: LearningItemWithVideos = {
    id: 'course-456',
    user_id: 'user-abc',
    type: 'video',
    youtube_video_id: 'dQw4w9WgXcQ',
    youtube_playlist_id: null,
    source_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    normalized_source_key: 'youtube_video:dQw4w9WgXcQ',
    title: 'Advanced Dynamic Programming Masterclass',
    description: 'Deep dive into LeetCode Hard algorithms',
    skill_domain: 'Computer Science',
    tags: ['algorithms', 'dp', 'interview'],
    author: 'MIT OpenCourseWare',
    total_duration_seconds: 3600,
    thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    status: 'ready',
    created_at: '2026-09-29T09:00:00.000Z',
    updated_at: '2026-09-29T09:00:00.000Z',
    videos: [
      {
        id: 'vid-1',
        learning_item_id: 'course-456',
        youtube_video_id: 'dQw4w9WgXcQ',
        title: 'Lecture 1: Intro to Dynamic Programming',
        source_position: 1,
        thumbnail_url: null,
        created_at: '2026-09-29T09:00:00.000Z'
      }
    ]
  };

  const mockBookmark: Bookmark = {
    id: 'bm-789',
    user_id: 'user-abc',
    learning_item_id: 'course-456',
    youtube_video_id: 'dQw4w9WgXcQ',
    position_seconds: 1420,
    label: 'State Space Matrix Formulation',
    created_at: '2026-09-29T10:05:00.000Z'
  };

  describe('1. Obsidian Local Vault Sync Engine', () => {
    it('formats notes into valid Obsidian markdown with YAML frontmatter & tags', () => {
      const videoTitle = mockCourse.videos?.[0]?.title || 'Lecture';
      const markdown = formatNoteForObsidian(
        mockNote,
        mockCourse.title,
        videoTitle
      );

      expect(markdown).toContain('---');
      expect(markdown).toContain('id: "note-123"');
      expect(markdown).toContain('course: "Advanced Dynamic Programming Masterclass"');
      expect(markdown).toContain('video: "Lecture 1: Intro to Dynamic Programming"');
      expect(markdown).toContain('tags:');
      expect(markdown).toContain('- LearnUp');
      expect(markdown).toContain('- note');
      expect(markdown).toContain('# Lecture 1: Intro to Dynamic Programming');
      expect(markdown).toContain('[[Advanced Dynamic Programming Masterclass]]');
      expect(markdown).toContain('Mastered dynamic programming state formulation');
    });

    it('formats a course into an Obsidian Map of Content (MOC)', () => {
      const moc = formatCourseMOCForObsidian(mockCourse);

      expect(moc).toContain('---');
      expect(moc).toContain('id: "course-456"');
      expect(moc).toContain('tags:');
      expect(moc).toContain('- moc');
      expect(moc).toContain('# Advanced Dynamic Programming Masterclass');
      expect(moc).toContain('[[Lecture 1: Intro to Dynamic Programming]]');
    });

    it('syncs notes and courses to Obsidian vault structure', async () => {
      const result = await syncToObsidian([mockNote], [mockCourse], [mockBookmark], {
        vaultPath: '/path/to/Obsidian/Vault'
      });

      expect(result.success).toBe(true);
      expect(result.connectorType).toBe('obsidian');
      expect(result.syncedCount).toBe(2); // 1 note + 1 course MOC
      expect(result.details?.files).toHaveLength(2);
    });
  });

  describe('2. GitHub Automated Backup & Commit Engine', () => {
    it('packages study data into GitHub git tree payload with commit metadata', async () => {
      const result = await syncToGitHub([mockNote], [mockCourse], [mockBookmark], {
        repo: 'example-user/LearnUp-vault',
        branch: 'main'
      });

      expect(result.success).toBe(true);
      expect(result.connectorType).toBe('github');
      expect(result.syncedCount).toBe(3); // 1 note + 1 course + 1 bookmark
      expect(result.details?.repo).toBe('example-user/LearnUp-vault');
      expect(result.details?.branch).toBe('main');
      expect(result.details?.manifest.totalCourses).toBe(1);
      expect(result.details?.manifest.totalNotes).toBe(1);
    });
  });

  describe('3. Google Calendar Connector', () => {
    it('does not report successful sync without a real Google Calendar integration', async () => {
      const result = await syncToGoogleCalendar({ calendarId: 'primary' });
      expect(result.success).toBe(false);
      expect(result.connectorType).toBe('google_calendar');
      expect(result.syncedCount).toBe(0);
      expect(result.message).toContain('No events were sent');
    });
  });

  describe('4. Notion Syllabus Workspace Exporter', () => {
    it('creates Notion database sync payload', async () => {
      const result = await syncToNotion([mockNote], [mockCourse], {
        databaseId: 'notion-db-123'
      });

      expect(result.success).toBe(true);
      expect(result.connectorType).toBe('notion');
      expect(result.syncedCount).toBe(2);
      expect(result.details?.databaseId).toBe('notion-db-123');
    });
  });

  describe('5. Available Connectors Catalog & Dispatcher', () => {
    it('provides all 5 core connectors with metadata', () => {
      expect(AVAILABLE_CONNECTORS).toHaveLength(5);
      const types = AVAILABLE_CONNECTORS.map((c) => c.type);
      expect(types).toEqual(['obsidian', 'github', 'google_calendar', 'notion', 'local_fs']);
    });

    it('executes sync for obsidian connector successfully', async () => {
      const result = await executeConnectorSync(
        'obsidian',
        { notes: [mockNote], courses: [mockCourse], bookmarks: [mockBookmark] },
        { vaultPath: '/tmp/obsidian' }
      );

      expect(result.success).toBe(true);
      expect(result.connectorType).toBe('obsidian');
      expect(result.syncedCount).toBeGreaterThan(0);
    });

    it('executes sync for local zero-knowledge AES-GCM vault', async () => {
      const result = await executeConnectorSync(
        'local_fs',
        { notes: [mockNote], courses: [mockCourse], bookmarks: [mockBookmark] },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.connectorType).toBe('local_fs');
      expect(result.syncedCount).toBe(2);
    });
  });
});
