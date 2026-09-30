import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CalendarRepository } from '@/lib/db/calendar-repository';
import { expandRecurringEvents } from '@/lib/services/calendar-service';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput } from '@/lib/validation/schemas';
import { createCalendarEventSchema, listEventsQuerySchema } from '@/lib/validation/calendar-schemas';

export const dynamic = 'force-dynamic';

const calendarRepo = new CalendarRepository();

/**
 * GET /api/calendar/events
 * Query events within a date range [start, end], including recurring event expansion.
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const startParam = searchParams.get('start') || new Date(Date.now() - 30 * 86400000).toISOString();
    const endParam = searchParams.get('end') || new Date(Date.now() + 60 * 86400000).toISOString();
    const calendarId = searchParams.get('calendar_id') || undefined;
    const categoryId = searchParams.get('category_id') || undefined;

    const query = validateInput(listEventsQuerySchema, {
      start: startParam,
      end: endParam,
      calendar_id: calendarId,
      category_id: categoryId
    });

    const rawEvents = await calendarRepo.listEvents(supabase, user.id, {
      startAt: query.start,
      endAt: query.end,
      calendarId: query.calendar_id,
      categoryId: query.category_id
    });

    const expanded = expandRecurringEvents(
      rawEvents,
      new Date(query.start),
      new Date(query.end)
    );

    return NextResponse.json({ data: expanded }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to list calendar events', {
      operation: 'GET /api/calendar/events',
      error: body.error.message,
      statusCode: status
    });
    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/calendar/events
 * Create a new event for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const rawBody = await request.json();
    const payload = validateInput(createCalendarEventSchema, rawBody);

    const event = await calendarRepo.createEvent(supabase, user.id, payload);

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to create calendar event', {
      operation: 'POST /api/calendar/events',
      error: body.error.message,
      statusCode: status
    });
    return NextResponse.json(body, { status });
  }
}
