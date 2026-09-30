import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProgressRepository } from '@/lib/db/progress-repository';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logging';

const progressRepo = new ProgressRepository();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AppError('UNAUTHORIZED', 'You must be logged in to fetch progress.', 401);
    }

    const progress = await progressRepo.getLibraryProgress(supabase, user.id);
    return NextResponse.json({ data: progress });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    logger.error('Unexpected error in GET /api/progress/library', { operation: 'getLibraryProgress', error });
    return NextResponse.json({ error: 'An unexpected error occurred.', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
