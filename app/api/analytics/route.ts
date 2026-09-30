import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { analyticsService } from '@/lib/services/analytics-service';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics - Get real zero-mock user learning telemetry & intelligence
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const analytics = await analyticsService.getUserAnalytics(supabase, user.id);

    return NextResponse.json({ data: analytics }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to get user analytics', { operation: 'GET /api/analytics', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
