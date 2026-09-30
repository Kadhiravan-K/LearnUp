// API routes for Notes collection – list and create
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { NotesRepository } from '@/lib/db/notes-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput } from '@/lib/validation/schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const notesRepo = new NotesRepository();

// Validation schema for creating a note
const createNoteSchema = z.object({
  learningItemId: z.string().uuid('Invalid learningItemId'),
  youtubeVideoId: z.string().min(1, 'youtubeVideoId is required'),
  content: z.string().min(1, 'content is required')
});

/**
 * GET /api/notes – List all notes owned by the authenticated user.
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const learningItemId = searchParams.get('learningItemId') || undefined;
    const youtubeVideoId = searchParams.get('youtubeVideoId') || undefined;

    const notes = await notesRepo.listByUser(supabase, user.id, {
      learningItemId,
      youtubeVideoId
    });
    return NextResponse.json({ data: notes }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to list notes', { operation: 'GET /api/notes', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/notes – Create a new note for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const rawBody = await request.json();
    const payload = validateInput(createNoteSchema, rawBody);

    const note = await notesRepo.insert(supabase, {
      userId: user.id,
      learningItemId: payload.learningItemId,
      youtubeVideoId: payload.youtubeVideoId,
      content: payload.content
    });

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to create note', { operation: 'POST /api/notes', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
