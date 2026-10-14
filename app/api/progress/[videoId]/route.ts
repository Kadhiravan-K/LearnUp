import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { isGuestUserId } from '@/lib/auth/guest-session';
import { ProgressRepository } from '@/lib/db/progress-repository';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logging';

const progressRepo = new ProgressRepository();

export async function GET(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const { user, supabase } = await requireAuth(request);

    if (isGuestUserId(user.id)) {
      return NextResponse.json({ data: { position_seconds: 0, is_completed: false } });
    }

    const progress = await progressRepo.getVideoProgress(supabase, user.id, params.videoId);
    if (!progress) {
      return NextResponse.json({ data: { position_seconds: 0, is_completed: false } });
    }
    return NextResponse.json({ data: progress });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    logger.error('Unexpected error in GET /api/progress/:videoId', { operation: 'getProgressVideoId', error });
    return NextResponse.json({ error: 'An unexpected error occurred.', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
