import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CalendarRepository } from '@/lib/db/calendar-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput, idParamSchema } from '@/lib/validation/schemas';
import { updateCategorySchema } from '@/lib/validation/calendar-schemas';

export const dynamic = 'force-dynamic';

const calendarRepo = new CalendarRepository();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/calendar/categories/[id]
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(request);
    const { id } = await context.params;
    const categoryId = validateInput(idParamSchema, id);
    const rawBody = await request.json();
    const payload = validateInput(updateCategorySchema, rawBody);

    const updated = await calendarRepo.updateCategory(supabase, user.id, categoryId, payload);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to update category', { operation: 'PATCH /api/calendar/categories/[id]', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/calendar/categories/[id]
 */
export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(request);
    const { id } = await context.params;
    const categoryId = validateInput(idParamSchema, id);
    const { searchParams } = new URL(request.url);
    const reassignCategoryId = searchParams.get('reassign_to') || null;

    await calendarRepo.deleteCategory(supabase, user.id, categoryId, reassignCategoryId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to delete category', { operation: 'DELETE /api/calendar/categories/[id]', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
