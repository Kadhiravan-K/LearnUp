import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { isGuestUserId } from '@/lib/auth/guest-session';
import { ProgressRepository } from '@/lib/db/progress-repository';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logging';

const progressRepo = new ProgressRepository();

export async function PUT(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);

    let body;
    try {
      body = await request.json();
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Request body must be valid JSON', 400);
    }
    const { youtubeVideoId, positionSeconds, durationSeconds, isCompleted } = body;

    if (!youtubeVideoId || typeof positionSeconds !== 'number' || positionSeconds < 0) {
      throw new AppError('VALIDATION_ERROR', 'Invalid progress payload', 400);
    }
    if (durationSeconds !== undefined && durationSeconds !== null && (typeof durationSeconds !== 'number' || durationSeconds < 0)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid duration payload', 400);
    }

    if (isGuestUserId(user.id)) {
      return NextResponse.json({
        data: {
          youtube_video_id: youtubeVideoId,
          position_seconds: positionSeconds,
          duration_seconds: durationSeconds || null,
          is_completed: Boolean(isCompleted)
        }
      });
    }

    const result = await progressRepo.upsertProgress(
      supabase,
      user.id,
      youtubeVideoId,
      positionSeconds,
      durationSeconds || null,
      Boolean(isCompleted)
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    logger.error('Unexpected error in PUT /api/progress', { operation: 'putProgress', error });
    return NextResponse.json({ error: 'An unexpected error occurred.', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
