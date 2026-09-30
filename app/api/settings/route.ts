import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { settingsRepository } from '@/lib/db/settings-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput, updateUserSettingsSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings - Retrieve the authenticated user's settings and preferences
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const settings = await settingsRepository.getByUserId(supabase, user.id);

    return NextResponse.json({ data: settings }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to get user settings', { operation: 'GET /api/settings', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}

/**
 * PATCH /api/settings - Update the authenticated user's settings and preferences
 */
export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const rawBody = await request.json();
    const validatedUpdates = validateInput(updateUserSettingsSchema, rawBody);

    const updated = await settingsRepository.update(supabase, user.id, validatedUpdates);

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to update user settings', { operation: 'PATCH /api/settings', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
