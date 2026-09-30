// API routes for a single Note – read, update, delete
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { NotesRepository } from '@/lib/db/notes-repository';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput, idParamSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const notesRepo = new NotesRepository();

// Validation schema for updating a note (only content is updatable)
const updateNoteSchema = z.object({
  content: z.string().min(1, 'content is required')
});

/**
 * GET /api/notes/[id] – Retrieve a note owned by the authenticated user.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { user, supabase } = await requireAuth(request);
    const noteId = validateInput(idParamSchema, params.id);
    const note = await notesRepo.getById(supabase, user.id, noteId);
    if (!note) {
      throw new AppError('NOT_FOUND', 'Note not found', 404);
    }
    return NextResponse.json({ data: note }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to get note', { operation: 'GET /api/notes/[id]', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}

/**
 * PUT /api/notes/[id] – Update note content for the authenticated user.
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { user, supabase } = await requireAuth(request);
    const noteId = validateInput(idParamSchema, params.id);
    const rawBody = await request.json();
    const payload = validateInput(updateNoteSchema, rawBody);

    const updated = await notesRepo.update(supabase, user.id, noteId, { content: payload.content });
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to update note', { operation: 'PUT /api/notes/[id]', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/notes/[id] – Delete a note owned by the authenticated user.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { user, supabase } = await requireAuth(request);
    const noteId = validateInput(idParamSchema, params.id);
    await notesRepo.delete(supabase, user.id, noteId);
    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to delete note', { operation: 'DELETE /api/notes/[id]', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
