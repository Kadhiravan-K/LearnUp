import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CalendarRepository } from '@/lib/db/calendar-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput, idParamSchema } from '@/lib/validation/schemas';
import { updateCalendarEventSchema } from '@/lib/validation/calendar-schemas';

export const dynamic = 'force-dynamic';

const calendarRepo = new CalendarRepository();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/calendar/events/[id]
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(request);
    const { id } = await context.params;
    const eventId = validateInput(idParamSchema, id);

    const event = await calendarRepo.getEventById(supabase, user.id, eventId);
    if (!event) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Event not found' } }, { status: 404 });
    }

    return NextResponse.json({ data: event }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to get calendar event', {
      operation: 'GET /api/calendar/events/[id]',
      error: body.error.message,
      statusCode: status
    });
    return NextResponse.json(body, { status });
  }
}

/**
 * PATCH /api/calendar/events/[id]
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(request);
    const { id } = await context.params;
    const eventId = validateInput(idParamSchema, id);
    const rawBody = await request.json();

    if (rawBody.action === 'edit_occurrence' && rawBody.occurrence_date) {
      const occurrencePayload = validateInput(updateCalendarEventSchema, rawBody.event || rawBody);
      const result = await calendarRepo.editRecurringOccurrence(
        supabase,
        user.id,
        eventId,
        rawBody.occurrence_date,
        occurrencePayload as any
      );
      return NextResponse.json({ data: result.occurrence, parent: result.parent }, { status: 200 });
    }

    const payload = validateInput(updateCalendarEventSchema, rawBody);
    const updated = await calendarRepo.updateEvent(supabase, user.id, eventId, payload);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to update calendar event', {
      operation: 'PATCH /api/calendar/events/[id]',
      error: body.error.message,
      statusCode: status
    });
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/calendar/events/[id]
 */
export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(request);
    const { id } = await context.params;
    const eventId = validateInput(idParamSchema, id);
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const occurrenceDate = url.searchParams.get('date');

    if (action === 'delete_occurrence' && occurrenceDate) {
      const updatedParent = await calendarRepo.addRecurrenceException(supabase, user.id, eventId, occurrenceDate);
      return NextResponse.json({ success: true, data: updatedParent }, { status: 200 });
    }

    await calendarRepo.deleteEvent(supabase, user.id, eventId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to delete calendar event', {
      operation: 'DELETE /api/calendar/events/[id]',
      error: body.error.message,
      statusCode: status
    });
    return NextResponse.json(body, { status });
  }
}
