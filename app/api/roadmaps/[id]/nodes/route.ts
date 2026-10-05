import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { formatErrorResponse } from '@/lib/errors';
import { RoadmapsRepository } from '@/lib/db/roadmaps-repository';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const repository = new RoadmapsRepository();

const appendNodeSchema = z.object({
  title: z.string().trim().min(1, 'Node title is required').max(200),
  description: z.string().max(5000).optional().default(''),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).optional().default([])
});

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/roadmaps/[id]/nodes
 * Appends a new milestone node to the roadmap.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, supabase } = await requireAuth(req);
    const body = await req.json();
    const payload = appendNodeSchema.parse(body);

    const updatedTrack = await repository.appendNode(supabase, user.id, params.id, payload);
    return NextResponse.json({ data: updatedTrack }, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
