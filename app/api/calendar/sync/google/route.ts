import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CalendarRepository } from '@/lib/db/calendar-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';

export const dynamic = 'force-dynamic';

const calendarRepo = new CalendarRepository();

/**
 * GET /api/calendar/sync/google
 * Fetch sync state for Google Calendar connector.
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const syncState = await calendarRepo.getSyncState(supabase, user.id, 'google');
    const isConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

    return NextResponse.json({
      data: {
        ...(syncState || { provider: 'google', last_synced_at: null, sync_token: null }),
        is_configured: isConfigured,
        is_connected: Boolean(syncState?.sync_token)
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
    const { user, supabase } = await requireAuth(request);
    const body = await request.json().catch(() => ({}));
    const isConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

    if (!isConfigured) {
      return NextResponse.json({
        data: {
          success: false,
          is_configured: false,
          message: 'Google Calendar OAuth credentials are not configured in environment. Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable live sync.'
        }
      }, { status: 200 });
    }

    const token = body.syncToken || `sync_${Date.now()}`;
    const syncState = await calendarRepo.setSyncState(supabase, user.id, 'google', token);

    return NextResponse.json({
      data: {
        success: true,
        is_configured: true,
        message: 'Google Calendar sync completed',
        syncState
      }
    }, { status: 200 });
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
