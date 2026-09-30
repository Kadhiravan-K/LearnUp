import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { formatErrorResponse } from '@/lib/errors';
import { RoadmapsRepository } from '@/lib/db/roadmaps-repository';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const repository = new RoadmapsRepository();

const createRoadmapSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  category: z.string().optional().default('Engineering')
});

/**
 * GET /api/roadmaps
 * Retrieves all roadmap tracks for the current user.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(req);
    const tracks = await repository.listTracks(supabase, user.id);
    return NextResponse.json({ data: tracks }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/roadmaps
 * Creates a new custom roadmap track.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(req);
    const body = await req.json();
    const payload = createRoadmapSchema.parse(body);

    const track = await repository.createTrack(supabase, user.id, payload);
    return NextResponse.json({ data: track }, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
