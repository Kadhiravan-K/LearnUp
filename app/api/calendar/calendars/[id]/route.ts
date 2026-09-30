import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CalendarRepository } from '@/lib/db/calendar-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput, idParamSchema } from '@/lib/validation/schemas';
import { updateCalendarSchema } from '@/lib/validation/calendar-schemas';

export const dynamic = 'force-dynamic';

const calendarRepo = new CalendarRepository();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/calendar/calendars/[id]
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(request);
    const { id } = await context.params;
    const calendarId = validateInput(idParamSchema, id);
    const rawBody = await request.json();
    const payload = validateInput(updateCalendarSchema, rawBody);

    const updated = await calendarRepo.updateCalendar(supabase, user.id, calendarId, payload);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to update calendar', { operation: 'PATCH /api/calendar/calendars/[id]', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/calendar/calendars/[id]
 */
export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(request);
    const { id } = await context.params;
    const calendarId = validateInput(idParamSchema, id);

    await calendarRepo.deleteCalendar(supabase, user.id, calendarId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to delete calendar', { operation: 'DELETE /api/calendar/calendars/[id]', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
