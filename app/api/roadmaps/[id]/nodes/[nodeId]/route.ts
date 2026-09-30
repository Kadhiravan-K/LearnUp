import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { formatErrorResponse } from '@/lib/errors';
import { RoadmapsRepository } from '@/lib/db/roadmaps-repository';

export const dynamic = 'force-dynamic';

const repository = new RoadmapsRepository();

interface RouteParams {
  params: {
    id: string;
    nodeId: string;
  };
}

/**
 * PATCH /api/roadmaps/[id]/nodes/[nodeId]
 * Updates milestone node status, progress, or attached course.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(req);
    const body = await req.json();

    const updatedTrack = await repository.updateNode(
      supabase,
      user.id,
      params.id,
      params.nodeId,
      body
    );
    return NextResponse.json({ data: updatedTrack }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
