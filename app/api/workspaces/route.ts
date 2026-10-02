import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { workspaceService } from '@/lib/services/workspace-service';
import { createWorkspaceSchema, validateInput } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces
 * Returns all workspaces owned by the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(req);
    const workspaces = await workspaceService.listWorkspaces(supabase, user);
    return NextResponse.json({ data: workspaces }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to list workspaces', {
      operation: 'GET /api/workspaces',
      statusCode: status,
      error: body.error.message
    });
    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/workspaces
 * Creates a new workspace for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(req);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON request body' } },
        { status: 400 }
      );
    }

    const validatedInput = validateInput(createWorkspaceSchema, rawBody);
    const workspace = await workspaceService.createWorkspace(supabase, user, validatedInput);

    return NextResponse.json({ data: workspace }, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to create workspace', {
      operation: 'POST /api/workspaces',
      statusCode: status,
      error: body.error.message
    });
    return NextResponse.json(body, { status });
  }
}
