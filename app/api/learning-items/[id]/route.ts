import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { LearningItemRepository } from '@/lib/db/repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { LibraryService } from '@/lib/services/library-service';
import { idParamSchema, validateInput } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

const repository = new LearningItemRepository();
const libraryService = new LibraryService(repository);

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/learning-items/[id]
 * Retrieves a single learning item owned by the authenticated user.
 * If playlist, includes child videos sorted by source_position.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(req);
    const id = validateInput(idParamSchema, params.id);

    const item = await libraryService.getItem(supabase, user, id);
    return NextResponse.json({ data: item }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to get learning item', {
      operation: 'GET /api/learning-items/[id]',
      statusCode: status,
      itemId: params.id,
      error: body.error.message
    });
    return NextResponse.json(body, { status });
  }
}

/**
 * PATCH /api/learning-items/[id]
 * Updates an owned learning item (metadata or playlist child videos sequence/removal).
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(req);
    const id = validateInput(idParamSchema, params.id);
    const body = await req.json();

    let updatedItem = null;

    if (body.title !== undefined || body.description !== undefined || body.tags !== undefined) {
      updatedItem = await libraryService.updateItem(supabase, user, id, {
        title: body.title,
        description: body.description,
        tags: body.tags
      });
    }

    if (Array.isArray(body.videos)) {
      updatedItem = await libraryService.updatePlaylistVideos(
        supabase,
        user,
        id,
        body.videos.map((v: any, index: number) => ({
          id: v.id,
          youtube_video_id: v.youtube_video_id || v.videoId,
          title: v.title || `Video ${index + 1}`,
          thumbnail_url: v.thumbnail_url ?? v.thumbnailUrl ?? null,
          source_position: typeof v.source_position === 'number' ? v.source_position : index,
          duration_seconds: typeof v.duration_seconds === 'number' ? v.duration_seconds : 0
        }))
      );
    }

    if (!updatedItem) {
      updatedItem = await libraryService.getItem(supabase, user, id);
    }

    return NextResponse.json({ data: updatedItem }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to update learning item', {
      operation: 'PATCH /api/learning-items/[id]',
      statusCode: status,
      itemId: params.id,
      error: body.error.message
    });
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/learning-items/[id]
 * Deletes an owned learning item. Cascades deletion to child playlist items in database.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(req);
    const id = validateInput(idParamSchema, params.id);

    await libraryService.removeItem(supabase, user, id);
    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to delete learning item', {
      operation: 'DELETE /api/learning-items/[id]',
      statusCode: status,
      itemId: params.id,
      error: body.error.message
    });
    return NextResponse.json(body, { status });
  }
}
