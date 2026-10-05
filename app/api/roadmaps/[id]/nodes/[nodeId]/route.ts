import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { formatErrorResponse } from '@/lib/errors';
import { RoadmapsRepository } from '@/lib/db/roadmaps-repository';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const repository = new RoadmapsRepository();

const updateNodeSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['completed', 'active', 'in_progress', 'locked', 'capstone']).optional(),
  progress_percentage: z.number().int().min(0).max(100).optional(),
  hours_logged: z.number().min(0).max(100000).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  prerequisite_node_id: z.string().uuid().nullable().optional(),
  prerequisite_label: z.string().max(200).nullable().optional(),
  suggested_course_title: z.string().max(200).nullable().optional(),
  attached_course: z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(500),
    provider: z.string().max(200).optional(),
    total_lectures: z.number().int().min(0).optional(),
    completed_lectures: z.number().int().min(0).optional(),
    progress_percentage: z.number().int().min(0).max(100),
    next_chapter: z.string().max(500).optional(),
    runtime_formatted: z.string().max(200).optional()
  }).nullable().optional()
}).strict().refine((updates) => Object.keys(updates).length > 0, {
  message: 'At least one roadmap milestone field is required'
});

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
    const body = updateNodeSchema.parse(await req.json());

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
