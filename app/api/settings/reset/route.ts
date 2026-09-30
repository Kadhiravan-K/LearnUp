import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';

export const dynamic = 'force-dynamic';

/**
 * POST /api/settings/reset - Reset learning progress history for the authenticated user
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);

    // Reset video progress
    const { error: progressErr } = await supabase
      .from('video_progress')
      .delete()
      .eq('user_id', user.id);

    if (progressErr) {
      throw progressErr;
    }

    logger.info('Reset user learning history', { operation: 'POST /api/settings/reset', userId: user.id });

    return NextResponse.json({ message: 'Learning history reset successfully' }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to reset learning history', { operation: 'POST /api/settings/reset', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
