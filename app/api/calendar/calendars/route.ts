import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CalendarRepository } from '@/lib/db/calendar-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput } from '@/lib/validation/schemas';
import { createCalendarSchema } from '@/lib/validation/calendar-schemas';

export const dynamic = 'force-dynamic';

const calendarRepo = new CalendarRepository();

/**
 * GET /api/calendar/calendars
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const calendars = await calendarRepo.listCalendars(supabase, user.id);
    return NextResponse.json({ data: calendars }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to list calendars', { operation: 'GET /api/calendar/calendars', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/calendar/calendars
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const rawBody = await request.json();
    const payload = validateInput(createCalendarSchema, rawBody);

    const calendar = await calendarRepo.createCalendar(supabase, user.id, payload);
    return NextResponse.json({ data: calendar }, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to create calendar', { operation: 'POST /api/calendar/calendars', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
