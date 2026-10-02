import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { LearningItemRepository } from '@/lib/db/repository';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { ImportService } from '@/lib/services/import-service';
import { previewCourseSchema, validateInput } from '@/lib/validation/schemas';
import { YouTubeClient } from '@/lib/youtube/client';
import { extractMultipleYouTubeUrls } from '@/lib/youtube/parser';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const repository = new LearningItemRepository();

/**
 * POST /api/learning-items/preview
 * Parses a YouTube video, playlist, or multiple URLs and returns syllabus structure,
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

    const body = validateInput(previewCourseSchema, rawBody);
    const importService = new ImportService(repository, () => new YouTubeClient());

    let preview;
    if (body.urls && body.urls.length > 0) {
      preview = await importService.previewMultipleUrls(body.urls);
    } else if (body.url) {
      const extracted = extractMultipleYouTubeUrls(body.url);
      if (extracted.length > 1) {
        preview = await importService.previewMultipleUrls(extracted);
      } else {
        preview = await importService.previewUrl(body.url);
      }
    } else {
      throw new AppError('VALIDATION_ERROR', 'URL is required', 400);
    }

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
