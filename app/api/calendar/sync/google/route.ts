import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calendar/sync/google
 * Fetch sync state for Google Calendar connector.
 */
export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const isConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

    return NextResponse.json({
      data: {
        provider: 'google',
        last_synced_at: null,
        is_configured: isConfigured,
        is_connected: false,
        is_available: false,
        message: 'Google Calendar OAuth and synchronization are not implemented yet.'
      }
    }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to get Google Calendar sync state', {
      operation: 'GET /api/calendar/sync/google',
      error: body.error.message,
      statusCode: status
    });
    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/calendar/sync/google
 * Trigger two-way sync between LearnUp and Google Calendar.
 */
export async function POST(request: Request) {
  try {
    await requireAuth(request);
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Google Calendar synchronization is not available yet. No events were synced.'
      }
    }, { status: 501 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to execute Google Calendar sync', {
      operation: 'POST /api/calendar/sync/google',
      error: body.error.message,
      statusCode: status
    });
    return NextResponse.json(body, { status });
  }
}
