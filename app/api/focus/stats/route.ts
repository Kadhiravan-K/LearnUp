import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { focusRepository } from '@/lib/db/focus-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';

export const dynamic = 'force-dynamic';

/**
 * GET /api/focus/stats - Compute user daily focus telemetry, interval cadence, and cognitive streak
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const stats = await focusRepository.getStats(supabase, user.id);

    return NextResponse.json({ data: stats }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to get focus stats', { operation: 'GET /api/focus/stats', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
