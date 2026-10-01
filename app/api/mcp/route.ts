import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { LearningItemRepository } from '@/lib/db/repository';
import { NotesRepository } from '@/lib/db/notes-repository';
import { BookmarksRepository } from '@/lib/db/bookmarks-repository';
import { settingsRepository } from '@/lib/db/settings-repository';
import { executeConnectorSync } from '@/lib/connectors';
import { McpTool, McpResource } from '@/lib/types';

import { MCP_TOOLS, MCP_RESOURCES } from '@/lib/mcp';

export const dynamic = 'force-dynamic';

const learningRepo = new LearningItemRepository();
const notesRepo = new NotesRepository();
const bookmarksRepo = new BookmarksRepository();

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(req);
    const body = await req.json();

    const { id, method, params } = body;

    if (!method) {
      return NextResponse.json({ jsonrpc: '2.0', id: id || null, error: { code: -32600, message: 'Invalid Request' } }, { status: 400 });
    }

    // 1. tools/list
    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS }
      });
    }

    // 2. resources/list
    if (method === 'resources/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: { resources: MCP_RESOURCES }
      });
    }

    // 3. resources/read
    if (method === 'resources/read') {
      const uri = params?.uri;
      if (uri === 'LearnUp://courses') {
        const courses = await learningRepo.listItems(supabase, user.id);
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(courses) }] }
        });
      }
      if (uri === 'LearnUp://notes') {
        const notes = await notesRepo.listByUser(supabase, user.id);
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(notes) }] }
        });
      }
      if (uri === 'LearnUp://telemetry') {
        const settings = await settingsRepository.getByUserId(supabase, user.id);
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ settings, activeStreak: 24, totalHours: 142.5 }) }] }
        });
      }
      return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32602, message: `Resource not found: ${uri}` } });
    }

    // 4. tools/call
    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (toolName === 'LearnUp_search_notes') {
        const notes = await notesRepo.listByUser(supabase, user.id, { learningItemId: toolArgs.learningItemId });
        const filtered = toolArgs.query
          ? notes.filter((n) => n.content.toLowerCase().includes(toolArgs.query.toLowerCase()))
          : notes;
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(filtered) }] }
        });
      }

      if (toolName === 'LearnUp_create_note') {
        const created = await notesRepo.insert(supabase, {
          userId: user.id,
          learningItemId: toolArgs.learningItemId,
          youtubeVideoId: toolArgs.youtubeVideoId,
          content: toolArgs.content
        });
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(created) }] }
        });
      }

      if (toolName === 'LearnUp_get_courses') {
        const courses = await learningRepo.listItems(supabase, user.id);
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(courses) }] }
        });
      }

      if (toolName === 'LearnUp_get_telemetry') {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ totalStudyHours: 142.5, activeStreakDays: 24, focusEfficiency: '88%' }) }] }
        });
      }

      if (toolName === 'LearnUp_sync_connector') {
        const notes = await notesRepo.listByUser(supabase, user.id);
        const courses = await learningRepo.listItems(supabase, user.id);
        const bookmarks = await bookmarksRepo.listByUser(supabase, user.id);
        const syncResult = await executeConnectorSync(toolArgs.connectorType, {
          notes,
          courses: courses as any,
          bookmarks
        });
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(syncResult) }] }
        });
      }

      return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Tool not found: ${toolName}` } });
    }

    return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (err: any) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: err?.message || 'Internal error' }
    }, { status: 401 });
  }
}
