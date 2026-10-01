import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/mcp/route';
import { MCP_TOOLS, MCP_RESOURCES } from '@/lib/mcp';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: 'test-user-123', email: 'test@LearnUp.io' },
    supabase: {}
  })
}));

vi.mock('@/lib/db/repository', () => {
  return {
    LearningItemRepository: class {
      listByUser = vi.fn().mockResolvedValue([
        { id: 'course-1', title: 'Rust Systems Programming' }
      ]);
    }
  };
});

vi.mock('@/lib/db/notes-repository', () => {
  return {
    NotesRepository: class {
      listByUser = vi.fn().mockResolvedValue([
        { id: 'note-1', content: 'Ownership and Borrowing rules in Rust', learning_item_id: 'course-1' }
      ]);
      insert = vi.fn().mockResolvedValue({
        id: 'note-2',
        content: 'Lifetimes annotation',
        learning_item_id: 'course-1',
        youtube_video_id: 'vid-1'
      });
    }
  };
});

vi.mock('@/lib/db/bookmarks-repository', () => {
  return {
    BookmarksRepository: class {
      listByUser = vi.fn().mockResolvedValue([]);
    }
  };
});

vi.mock('@/lib/db/settings-repository', () => ({
  settingsRepository: {
    getByUserId: vi.fn().mockResolvedValue({
      streak_threshold_minutes: 30,
      theme_mode: 'dark'
    })
  }
}));

vi.mock('@/lib/connectors', () => ({
  executeConnectorSync: vi.fn().mockResolvedValue({
    connectorType: 'obsidian',
    success: true,
    syncedCount: 5,
    message: 'Mock sync complete',
    syncedAt: '2026-09-29T12:00:00Z'
  })
}));

describe('Model Context Protocol (MCP) Server Endpoint (SF-038)', () => {
  describe('MCP Metadata & Tool Catalog', () => {
    it('exposes all 5 JSON-RPC MCP tools with valid schemas', () => {
      expect(MCP_TOOLS).toHaveLength(5);
      const names = MCP_TOOLS.map((t) => t.name);
      expect(names).toEqual([
        'LearnUp_search_notes',
        'LearnUp_create_note',
        'LearnUp_get_courses',
        'LearnUp_get_telemetry',
        'LearnUp_sync_connector'
      ]);
    });

    it('exposes all 3 MCP URI resources', () => {
      expect(MCP_RESOURCES).toHaveLength(3);
      const uris = MCP_RESOURCES.map((r) => r.uri);
      expect(uris).toEqual([
        'LearnUp://courses',
        'LearnUp://notes',
        'LearnUp://telemetry'
      ]);
    });
  });

  describe('MCP JSON-RPC 2.0 Request Handlers', () => {
    it('handles tools/list request', async () => {
      const req = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        })
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.jsonrpc).toBe('2.0');
      expect(json.id).toBe(1);
      expect(json.result.tools).toHaveLength(5);
    });

    it('handles resources/list request', async () => {
      const req = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'resources/list'
        })
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.jsonrpc).toBe('2.0');
      expect(json.id).toBe(2);
      expect(json.result.resources).toHaveLength(3);
    });

    it('handles tools/call for LearnUp_search_notes', async () => {
      const req = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'LearnUp_search_notes',
            arguments: { query: 'Borrowing' }
          }
        })
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.result.content[0].type).toBe('text');
      expect(json.result.content[0].text).toContain('Ownership and Borrowing');
    });

    it('handles tools/call for LearnUp_create_note', async () => {
      const req = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'LearnUp_create_note',
            arguments: {
              learningItemId: 'course-1',
              youtubeVideoId: 'vid-1',
              content: 'Lifetimes annotation'
            }
          }
        })
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.result.content[0].text).toContain('Lifetimes annotation');
    });

    it('returns Method not found error for invalid JSON-RPC method', async () => {
      const req = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 5,
          method: 'unknown_method'
        })
      });

      const res = await POST(req);
      const json = await res.json();
      expect(json.error.code).toBe(-32601);
      expect(json.error.message).toContain('Method not found');
    });
  });
});
