import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { focusRepository } from '@/lib/db/focus-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput, recordFocusSessionSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * POST /api/focus/session - Log a completed or abandoned focus sprint session
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const rawBody = await request.json();
    const validated = validateInput(recordFocusSessionSchema, rawBody);

    const session = await focusRepository.recordSession(supabase, user.id, {
      learningItemId: validated.learning_item_id,
      youtubeVideoId: validated.youtube_video_id,
      durationSeconds: validated.duration_seconds,
      mode: validated.mode,
      intervalNumber: validated.interval_number ?? 1,
      soundscape: validated.soundscape ?? 'binaural_40hz',
      completed: validated.completed ?? true
    });

    return NextResponse.json({ data: session }, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to record focus session', {
      operation: 'POST /api/focus/session',
      error: body.error.message,
      statusCode: status
    });
    return NextResponse.json(body, { status });
  }
}
