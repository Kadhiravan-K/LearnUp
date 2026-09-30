import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { formatErrorResponse } from '@/lib/errors';
import { RoadmapsRepository } from '@/lib/db/roadmaps-repository';

export const dynamic = 'force-dynamic';

const repository = new RoadmapsRepository();

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/roadmaps/[id]
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(req);
    const track = await repository.getTrackById(supabase, user.id, params.id);
    if (!track) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Roadmap track not found' } }, { status: 404 });
    }
    return NextResponse.json({ data: track }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/roadmaps/[id]
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(req);
    await repository.deleteTrack(supabase, user.id, params.id);
    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
