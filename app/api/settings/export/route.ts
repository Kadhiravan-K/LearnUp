import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { settingsRepository } from '@/lib/db/settings-repository';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';

export const dynamic = 'force-dynamic';

/**
 * POST /api/settings/export - Export learning telemetry, notes, bookmarks, and configuration
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    const [settings, { data: learningItems }, { data: notes }, { data: bookmarks }, { data: progress }] = await Promise.all([
      settingsRepository.getByUserId(supabase, user.id),
      supabase.from('learning_items').select('*').eq('user_id', user.id),
      supabase.from('notes').select('*').eq('user_id', user.id),
      supabase.from('bookmarks').select('*').eq('user_id', user.id),
      supabase.from('video_progress').select('*').eq('user_id', user.id)
    ]);

    const exportData = {
      user: { id: user.id, email: user.email },
      exportedAt: new Date().toISOString(),
      schemaVersion: '4.2.0',
      settings,
      learningItems: learningItems || [],
      notes: notes || [],
      bookmarks: bookmarks || [],
      videoProgress: progress || []
    };

    if (format === 'csv') {
      const csvLines = [
        'Type,ID,TitleOrContent,CreatedAt',
        ...(learningItems || []).map((i: { id: string; title?: string; created_at: string }) => `"LearningItem","${i.id}","${(i.title || '').replace(/"/g, '""')}","${i.created_at}"`),
        ...(notes || []).map((n: { id: string; content?: string; created_at: string }) => `"Note","${n.id}","${(n.content || '').replace(/"/g, '""')}","${n.created_at}"`),
        ...(bookmarks || []).map((b: { id: string; label?: string; created_at: string }) => `"Bookmark","${b.id}","${(b.label || '').replace(/"/g, '""')}","${b.created_at}"`)
      ];

      return new NextResponse(csvLines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="studyflow-telemetry-${user.id}.csv"`
        }
      });
    }

    return NextResponse.json({ data: exportData }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to export user telemetry', { operation: 'POST /api/settings/export', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
