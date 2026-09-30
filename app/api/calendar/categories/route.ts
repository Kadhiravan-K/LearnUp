import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CalendarRepository } from '@/lib/db/calendar-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput } from '@/lib/validation/schemas';
import { createCategorySchema } from '@/lib/validation/calendar-schemas';

export const dynamic = 'force-dynamic';

const calendarRepo = new CalendarRepository();

/**
 * GET /api/calendar/categories
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const categories = await calendarRepo.listCategories(supabase, user.id);
    return NextResponse.json({ data: categories }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to list categories', { operation: 'GET /api/calendar/categories', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/calendar/categories
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const rawBody = await request.json();
    const payload = validateInput(createCategorySchema, rawBody);

    const category = await calendarRepo.createCategory(supabase, user.id, payload);
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to create category', { operation: 'POST /api/calendar/categories', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
