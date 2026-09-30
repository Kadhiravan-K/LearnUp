import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { connectorsRepository } from '@/lib/db/connectors-repository';
import { AVAILABLE_CONNECTORS } from '@/lib/connectors';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput, updateConnectorSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/connectors - List all available connectors merged with authenticated user's configuration
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const userConnectors = await connectorsRepository.listByUser(supabase, user.id);

    const userConnectorMap = new Map(userConnectors.map((c) => [c.connector_type, c]));

    const mergedConnectors = AVAILABLE_CONNECTORS.map((connector) => {
      const userConfig = userConnectorMap.get(connector.type);
      return {
        ...connector,
        isEnabled: userConfig ? userConfig.is_enabled : connector.defaultEnabled,
        status: userConfig ? userConfig.status : 'disconnected',
        config: userConfig ? userConfig.config : {},
        lastSyncedAt: userConfig ? userConfig.last_synced_at : null,
        errorMessage: userConfig ? userConfig.error_message : null
      };
    });

    return NextResponse.json({ data: mergedConnectors }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to get connectors', { operation: 'GET /api/connectors', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}

/**
 * PATCH /api/connectors - Upsert a connector configuration for the authenticated user
 */
export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const rawBody = await request.json();
    const validated = validateInput(updateConnectorSchema, rawBody);

    const updated = await connectorsRepository.upsert(supabase, user.id, {
      connectorType: validated.connector_type,
      isEnabled: validated.is_enabled,
      config: validated.config,
      authToken: validated.auth_token,
      status: validated.is_enabled ? 'connected' : 'disconnected'
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to update connector', { operation: 'PATCH /api/connectors', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
