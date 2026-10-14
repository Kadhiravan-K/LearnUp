import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { LearningItemRepository } from '@/lib/db/repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { ImportService } from '@/lib/services/import-service';
import { LibraryService } from '@/lib/services/library-service';
import { importRequestSchema, validateInput } from '@/lib/validation/schemas';
import { YouTubeClient } from '@/lib/youtube/client';
import { readBoundedJson } from '@/lib/utils/request';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const repository = new LearningItemRepository();
const libraryService = new LibraryService(repository);

/**
 * GET /api/learning-items
 * Returns all learning items owned by the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(req);
    const items = await libraryService.listUserItems(supabase, user);
    return NextResponse.json({ data: items }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to list learning items', {
      operation: 'GET /api/learning-items',
      statusCode: status,
      error: body.error.message
    });
    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/learning-items
 * Accepts a YouTube URL (video or playlist), imports metadata, and creates a library item.
 * Enforces authentication, validation, and idempotency.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(req);

    const rawBody = await readBoundedJson(req);

    const payload = validateInput(importRequestSchema, rawBody);

    const importService = new ImportService(repository, () => new YouTubeClient());

    const { item, isDuplicate } = await importService.importFromUrl(supabase, user, payload);

    return NextResponse.json(
      {
        data: item,
        duplicate: isDuplicate
      },
      { status: isDuplicate ? 200 : 201 }
    );
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to import learning item', {
      operation: 'POST /api/learning-items',
      statusCode: status,
      error: body.error.message
    });
    return NextResponse.json(body, { status });
  }
}
