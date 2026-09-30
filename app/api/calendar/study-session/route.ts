import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CalendarRepository } from '@/lib/db/calendar-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput } from '@/lib/validation/schemas';
import { startStudySessionSchema, updateStudySessionSchema } from '@/lib/validation/calendar-schemas';

export const dynamic = 'force-dynamic';

const calendarRepo = new CalendarRepository();

/**
 * POST /api/calendar/study-session
 * Start a study session or record telemetry update for an active session.
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const rawBody = await request.json();

    if (rawBody.action === 'update' || rawBody.session_id) {
      const payload = validateInput(updateStudySessionSchema, rawBody);
      const session = await calendarRepo.updateStudySession(supabase, user.id, payload.session_id, {
        actualDurationSeconds: payload.actual_duration_seconds,
        pausedSeconds: payload.paused_seconds,
        ended: payload.ended
      });
      return NextResponse.json({ data: session }, { status: 200 });
    } else {
      const payload = validateInput(startStudySessionSchema, rawBody);
      const session = await calendarRepo.startStudySession(supabase, user.id, {
        eventId: payload.event_id,
        learningItemId: payload.learning_item_id,
        plannedDurationSeconds: payload.planned_duration_seconds ?? 1800
      });
      return NextResponse.json({ data: session }, { status: 201 });
    }
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to manage calendar study session', {
      operation: 'POST /api/calendar/study-session',
      error: body.error.message,
      statusCode: status
    });
    return NextResponse.json(body, { status });
  }
}
