// API routes for a single Bookmark – read, delete
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { BookmarksRepository } from '@/lib/db/bookmarks-repository';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput, idParamSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

const bookmarksRepo = new BookmarksRepository();

/**
 * GET /api/bookmarks/[id] – Retrieve a bookmark owned by the authenticated user.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { user, supabase } = await requireAuth(request);
    const bookmarkId = validateInput(idParamSchema, params.id);
    const bookmark = await bookmarksRepo.getById(supabase, user.id, bookmarkId);
    if (!bookmark) {
      throw new AppError('NOT_FOUND', 'Bookmark not found', 404);
    }
    return NextResponse.json({ data: bookmark }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to get bookmark', { operation: 'GET /api/bookmarks/[id]', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/bookmarks/[id] – Delete a bookmark owned by the authenticated user.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { user, supabase } = await requireAuth(request);
    const bookmarkId = validateInput(idParamSchema, params.id);
    await bookmarksRepo.delete(supabase, user.id, bookmarkId);
    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to delete bookmark', { operation: 'DELETE /api/bookmarks/[id]', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
