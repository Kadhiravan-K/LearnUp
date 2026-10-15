import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCommunityTemplates,
  saveContributedTemplate,
  deleteContributedTemplate,
  sanitizeText,
  contributedTemplateSchema,
  CURATED_TEMPLATES
} from '@/lib/templates/communityTemplates';

let localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] || null,
  setItem: (key: string, value: any) => {
    localStorageStore[key] = value.toString();
  },
  removeItem: (key: string) => {
    delete localStorageStore[key];
  },
  clear: () => {
    localStorageStore = {};
  }
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: localStorageMock
  },
  writable: true
});

describe('Community Templates Domain & Security Unit Tests', () => {
  beforeEach(() => {
    localStorageStore = {};
  });

  describe('Input Sanitization & XSS Prevention', () => {
    it('strips script tags and executable JavaScript protocols', () => {
      const malicious = '<script>alert("xss")</script>Hello <b>World</b><script src="bad.js"></script>';
      const sanitized = sanitizeText(malicious);
      expect(sanitized).toBe('Hello World');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('strips javascript: pseudo-protocols', () => {
      const unsafe = 'javascript:evil()';
      expect(sanitizeText(unsafe)).toBe('evil()');
    });

    it('handles empty or undefined values safely', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
    });
  });

  describe('Zod Schema Validation', () => {
    it('accepts a valid blueprint payload', () => {
      const valid = {
        title: 'Distributed Systems with Raft',
        description: 'Comprehensive study of distributed consensus state machines.',
        category: 'roadmap',
        author: 'Systems Engineer',
        tags: ['Distributed', 'Raft', 'Go'],
        estimatedDuration: '30 Hours',
        difficulty: 'advanced',
        data: {
          nodes: [{ title: 'Leader Election', description: 'Term timers & heartbeats' }]
        }
      };

      const result = contributedTemplateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects titles that are too short', () => {
      const invalid = {
        title: 'Go', // < 3 characters
        description: 'Valid length description here.',
        category: 'roadmap',
        data: {}
      };

      const result = contributedTemplateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Title must be at least 3 characters');
      }
    });

    it('rejects descriptions that are too short', () => {
      const invalid = {
        title: 'Valid Title',
        description: 'Short', // < 10 characters
        category: 'playlist',
        data: {}
      };

      const result = contributedTemplateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Description must be at least 10 characters');
      }
    });

    it('rejects unsupported categories', () => {
      const invalid = {
        title: 'Valid Title',
        description: 'Valid length description here.',
        category: 'invalid_category',
        data: {}
      };

      const result = contributedTemplateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Template Retrieval and Truthful Metadata', () => {
    it('returns official curated templates when no contributions exist', () => {
      const templates = getCommunityTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(7);
      expect(templates[0].isCurated).toBe(true);
      expect(templates[0].difficulty).toBeDefined();
    });

    it('saves user contribution and assigns truthful metadata without fake metrics', () => {
      const saved = saveContributedTemplate({
        title: 'Reinforcement Learning from Human Feedback',
        description: 'Instruction tuning, reward modeling, and proximal policy optimization.',
        category: 'roadmap',
        author: 'AI Researcher <script>xss()</script>',
        tags: ['RLHF', 'PPO', 'LLMs'],
        estimatedDuration: '25 Hours',
        difficulty: 'advanced',
        data: { type: 'roadmap' }
      });

      expect(saved.id).toMatch(/^contributed_/);
      expect(saved.isCurated).toBe(false);
      expect(saved.author).toBe('AI Researcher'); // sanitized
      expect(saved.difficulty).toBe('advanced');
      expect(saved.downloadsCount).toBe(0); // truthful, not fabricated

      const all = getCommunityTemplates();
      expect(all.some((t) => t.id === saved.id)).toBe(true);
    });

    it('deletes user-contributed blueprint by id', () => {
      const saved = saveContributedTemplate({
        title: 'Temporary Study Guide',
        description: 'A temporary roadmap that will be deleted in this test.',
        category: 'focus',
        author: 'Tester',
        tags: ['Temporary'],
        data: {}
      });

      expect(getCommunityTemplates().some((t) => t.id === saved.id)).toBe(true);
      const deleted = deleteContributedTemplate(saved.id);
      expect(deleted).toBe(true);
      expect(getCommunityTemplates().some((t) => t.id === saved.id)).toBe(false);
    });
  });
});
