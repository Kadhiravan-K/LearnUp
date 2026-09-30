// API routes for Bookmarks collection – list and create
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { BookmarksRepository } from '@/lib/db/bookmarks-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput } from '@/lib/validation/schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bookmarksRepo = new BookmarksRepository();

// Validation schema for creating a bookmark
const createBookmarkSchema = z.object({
  learningItemId: z.string().uuid('Invalid learningItemId'),
  youtubeVideoId: z.string().min(1, 'youtubeVideoId is required'),
  positionSeconds: z.number().int().min(0, 'positionSeconds must be greater than or equal to 0'),
  label: z.string().max(200, 'label must be 200 characters or fewer').optional()
});

/**
 * GET /api/bookmarks – List all bookmarks owned by the authenticated user.
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const learningItemId = searchParams.get('learningItemId') || undefined;
    const youtubeVideoId = searchParams.get('youtubeVideoId') || undefined;

    const bookmarks = await bookmarksRepo.listByUser(supabase, user.id, {
      learningItemId,
      youtubeVideoId
    });
    return NextResponse.json({ data: bookmarks }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to list bookmarks', { operation: 'GET /api/bookmarks', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/bookmarks – Create a new bookmark for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const rawBody = await request.json();
    const payload = validateInput(createBookmarkSchema, rawBody);

    const bookmark = await bookmarksRepo.insert(supabase, {
      userId: user.id,
      learningItemId: payload.learningItemId,
      youtubeVideoId: payload.youtubeVideoId,
      positionSeconds: payload.positionSeconds,
      label: payload.label
    });

    return NextResponse.json({ data: bookmark }, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to create bookmark', { operation: 'POST /api/bookmarks', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
