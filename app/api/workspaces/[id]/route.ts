import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { workspaceService } from '@/lib/services/workspace-service';
import { idParamSchema, updateWorkspaceSchema, validateInput } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/workspaces/[id]
 * Updates workspace name and/or icon.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase } = await requireAuth(req);
    const workspaceId = validateInput(idParamSchema, params.id);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON request body' } },
        { status: 400 }
      );
    }

    const validatedInput = validateInput(updateWorkspaceSchema, rawBody);
    const updated = await workspaceService.updateWorkspace(supabase, user, workspaceId, validatedInput);

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to update workspace', {
      operation: 'PATCH /api/workspaces/[id]',
      statusCode: status,
      error: body.error.message
    });
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/workspaces/[id]
 * Deletes workspace if user has more than 1 workspace.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase } = await requireAuth(req);
    const workspaceId = validateInput(idParamSchema, params.id);

    await workspaceService.deleteWorkspace(supabase, user, workspaceId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to delete workspace', {
      operation: 'DELETE /api/workspaces/[id]',
      statusCode: status,
      error: body.error.message
    });
    return NextResponse.json(body, { status });
  }
}
