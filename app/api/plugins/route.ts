import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { pluginsRepository } from '@/lib/db/plugins-repository';
import { ALL_PLUGINS } from '@/lib/plugins/registry';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput, updatePluginSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/plugins - List all core and community plugins merged with user preferences
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const userPlugins = await pluginsRepository.listByUser(supabase, user.id);
    const userPluginMap = new Map(userPlugins.map((p) => [p.plugin_id, p]));

    const mergedPlugins = ALL_PLUGINS.map((plugin) => {
      const userPlugin = userPluginMap.get(plugin.id);
      return {
        ...plugin,
        isEnabled: userPlugin ? userPlugin.is_enabled : plugin.isDefaultEnabled,
        config: userPlugin ? userPlugin.config : {}
      };
    });

    return NextResponse.json({ data: mergedPlugins }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to get plugins', { operation: 'GET /api/plugins', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}

/**
 * PATCH /api/plugins - Toggle or configure a plugin for the user
 */
export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const rawBody = await request.json();
    const validated = validateInput(updatePluginSchema, rawBody);

    const updated = await pluginsRepository.upsert(supabase, user.id, {
      pluginId: validated.plugin_id,
      isEnabled: validated.is_enabled,
      config: validated.config
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to update plugin', { operation: 'PATCH /api/plugins', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
