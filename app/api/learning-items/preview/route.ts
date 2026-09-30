import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { LearningItemRepository } from '@/lib/db/repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { ImportService } from '@/lib/services/import-service';
import { previewCourseSchema, validateInput } from '@/lib/validation/schemas';
import { YouTubeClient } from '@/lib/youtube/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const repository = new LearningItemRepository();

/**
 * POST /api/learning-items/preview
 * Parses a YouTube video or playlist URL and returns syllabus structure,
 * video list, author, and estimated duration without saving to database.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON request body' } },
        { status: 400 }
      );
    }

    const { url } = validateInput(previewCourseSchema, rawBody);
    const importService = new ImportService(repository, () => new YouTubeClient());
    const preview = await importService.previewUrl(url);

    return NextResponse.json({ data: preview }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to preview course', {
      operation: 'POST /api/learning-items/preview',
      statusCode: status,
      error: body.error.message
    });
    return NextResponse.json(body, { status });
  }
}
