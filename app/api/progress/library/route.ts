import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ProgressRepository } from '@/lib/db/progress-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';

const progressRepo = new ProgressRepository();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request);
    const progress = await progressRepo.getLibraryProgress(supabase, user.id);
    return NextResponse.json({ data: progress }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.warn('Failed to get library progress', { operation: 'GET /api/progress/library', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
