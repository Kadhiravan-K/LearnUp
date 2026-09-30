import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { logger } from '../logging';
import { UserPlugin } from '../types';

export interface IPluginsRepository {
  listByUser(client: SupabaseClient, userId: string): Promise<UserPlugin[]>;
  getById(client: SupabaseClient, userId: string, pluginId: string): Promise<UserPlugin | null>;
  upsert(
    client: SupabaseClient,
    userId: string,
    plugin: {
      pluginId: string;
      isEnabled?: boolean;
      config?: Record<string, any>;
    }
  ): Promise<UserPlugin>;
}

export class PluginsRepository implements IPluginsRepository {
  async listByUser(client: SupabaseClient, userId: string): Promise<UserPlugin[]> {
    const { data, error } = await client
      .from('user_plugins')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to list user plugins', {
        operation: 'listUserPlugins',
        userId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch plugins', 500);
    }
    return (data as UserPlugin[]) || [];
  }

  async getById(client: SupabaseClient, userId: string, pluginId: string): Promise<UserPlugin | null> {
    const { data, error } = await client
      .from('user_plugins')
      .select('*')
      .eq('user_id', userId)
      .eq('plugin_id', pluginId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch user plugin by id', {
        operation: 'getUserPluginById',
        userId,
        pluginId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch plugin', 500);
    }
    return data as UserPlugin | null;
  }

  async upsert(
    client: SupabaseClient,
    userId: string,
    plugin: {
      pluginId: string;
      isEnabled?: boolean;
      config?: Record<string, any>;
    }
  ): Promise<UserPlugin> {
    const payload: Record<string, any> = {
      user_id: userId,
      plugin_id: plugin.pluginId,
      updated_at: new Date().toISOString()
    };

    if (plugin.isEnabled !== undefined) payload.is_enabled = plugin.isEnabled;
    if (plugin.config !== undefined) payload.config = plugin.config;

    const { data, error } = await client
      .from('user_plugins')
      .upsert(payload, { onConflict: 'user_id,plugin_id' })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to upsert user plugin', {
        operation: 'upsertUserPlugin',
        userId,
        pluginId: plugin.pluginId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to save plugin configuration', 500);
    }

    return data as UserPlugin;
  }
}

export const pluginsRepository = new PluginsRepository();
