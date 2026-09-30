import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { connectorsRepository } from '@/lib/db/connectors-repository';
import { NotesRepository } from '@/lib/db/notes-repository';
import { BookmarksRepository } from '@/lib/db/bookmarks-repository';
import { LearningItemRepository } from '@/lib/db/repository';
import { executeConnectorSync } from '@/lib/connectors';
import { ConnectorType } from '@/lib/types';
import { formatErrorResponse, AppError } from '@/lib/errors';
import { logger } from '@/lib/logging';

export const dynamic = 'force-dynamic';

const notesRepo = new NotesRepository();
const bookmarksRepo = new BookmarksRepository();
const learningItemRepo = new LearningItemRepository();

const VALID_TYPES: ConnectorType[] = ['obsidian', 'github', 'google_calendar', 'notion', 'local_fs'];

/**
 * POST /api/connectors/[type]/sync - Trigger a sync operation for a specific connector
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const connectorType = type as ConnectorType;

  if (!VALID_TYPES.includes(connectorType)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `Invalid connector type: ${type}` } },
      { status: 400 }
    );
  }

  try {
    const { user, supabase } = await requireAuth(request);

    // Fetch user connector configuration
    const userConnector = await connectorsRepository.getByType(supabase, user.id, connectorType);
    const config = userConnector?.config || {};

    // Fetch user's study data
    const [notes, rawCourses, bookmarks] = await Promise.all([
      notesRepo.listByUser(supabase, user.id),
      learningItemRepo.listItems(supabase, user.id),
      bookmarksRepo.listByUser(supabase, user.id)
    ]);

    const courses = rawCourses.map((c) => ({
      ...c,
      videos: []
    }));

    // Update connector status to syncing
    await connectorsRepository.upsert(supabase, user.id, {
      connectorType,
      status: 'syncing'
    });

    try {
      const syncResult = await executeConnectorSync(
        connectorType,
        { notes, courses, bookmarks },
        config
      );

      const now = new Date().toISOString();
      await connectorsRepository.upsert(supabase, user.id, {
        connectorType,
        status: 'connected',
        lastSyncedAt: now,
        errorMessage: null
      });

      logger.info(`Connector ${connectorType} synced successfully`, {
        operation: `POST /api/connectors/${type}/sync`,
        userId: user.id,
        connectorType,
        syncedCount: syncResult.syncedCount
      });

      return NextResponse.json({ data: syncResult }, { status: 200 });
    } catch (syncError: any) {
      const errorMsg = syncError?.message || 'Sync failed';
      await connectorsRepository.upsert(supabase, user.id, {
        connectorType,
        status: 'error',
        errorMessage: errorMsg
      });

      throw new AppError('INTERNAL_ERROR', errorMsg, 502);
    }
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error(`Failed to sync connector ${type}`, {
      operation: `POST /api/connectors/${type}/sync`,
      error: body.error.message,
      statusCode: status
    });
    return NextResponse.json(body, { status });
  }
}
