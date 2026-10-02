import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { Workspace } from '../types';

export interface IWorkspaceRepository {
  listWorkspaces(client: SupabaseClient, userId: string): Promise<Workspace[]>;
  createWorkspace(client: SupabaseClient, userId: string, data: { name: string; icon?: string }): Promise<Workspace>;
  updateWorkspace(client: SupabaseClient, userId: string, workspaceId: string, data: { name?: string; icon?: string }): Promise<Workspace>;
  deleteWorkspace(client: SupabaseClient, userId: string, workspaceId: string): Promise<void>;
}

export class SupabaseWorkspaceRepository implements IWorkspaceRepository {
  async listWorkspaces(client: SupabaseClient, userId: string): Promise<Workspace[]> {
    const { data, error } = await client
      .from('workspaces')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppError('DATABASE_ERROR', `Failed to list workspaces: ${error.message}`, 500, error);
    }

    // If user has no workspaces, seed initial default workspace
    if (!data || data.length === 0) {
      const defaultWs = await this.createWorkspace(client, userId, {
        name: 'Personal Study Vault',
        icon: '📚'
      });
      return [defaultWs];
    }

    return data as Workspace[];
  }

  async createWorkspace(
    client: SupabaseClient,
    userId: string,
    data: { name: string; icon?: string }
  ): Promise<Workspace> {
    const icon = data.icon && data.icon.trim() ? data.icon.trim() : '📚';
    const { data: created, error } = await client
      .from('workspaces')
      .insert({
        user_id: userId,
        name: data.name.trim(),
        icon
      })
      .select()
      .single();

    if (error) {
      throw new AppError('DATABASE_ERROR', `Failed to create workspace: ${error.message}`, 500, error);
    }

    return created as Workspace;
  }

  async updateWorkspace(
    client: SupabaseClient,
    userId: string,
    workspaceId: string,
    data: { name?: string; icon?: string }
  ): Promise<Workspace> {
    const updates: Partial<{ name: string; icon: string; updated_at: string }> = {
      updated_at: new Date().toISOString()
    };
    if (data.name !== undefined && data.name.trim()) {
      updates.name = data.name.trim();
    }
    if (data.icon !== undefined && data.icon.trim()) {
      updates.icon = data.icon.trim();
    }

    const { data: updated, error } = await client
      .from('workspaces')
      .update(updates)
      .eq('id', workspaceId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !updated) {
      throw new AppError('NOT_FOUND', `Workspace not found or unauthorized: ${error?.message || 'Item missing'}`, 404, error);
    }

    return updated as Workspace;
  }

  async deleteWorkspace(client: SupabaseClient, userId: string, workspaceId: string): Promise<void> {
    // Check remaining count for this user
    const { count, error: countError } = await client
      .from('workspaces')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      throw new AppError('DATABASE_ERROR', `Failed to verify workspace count: ${countError.message}`, 500, countError);
    }

    if (count !== null && count <= 1) {
      throw new AppError('VALIDATION_ERROR', 'Cannot delete your only workspace. At least one workspace is required.', 400);
    }

    const { error } = await client
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError('DATABASE_ERROR', `Failed to delete workspace: ${error.message}`, 500, error);
    }
  }
}

export const workspaceRepository = new SupabaseWorkspaceRepository();
