import { SupabaseClient } from '@supabase/supabase-js';
import { IWorkspaceRepository, workspaceRepository } from '../db/workspace-repository';
import { logger } from '../logging';
import { AuthenticatedUser, Workspace } from '../types';

export class WorkspaceService {
  constructor(private readonly repository: IWorkspaceRepository) {}

  async listWorkspaces(client: SupabaseClient, user: AuthenticatedUser): Promise<Workspace[]> {
    logger.info('Listing workspaces for user', {
      operation: 'listWorkspaces',
      userId: user.id
    });
    return this.repository.listWorkspaces(client, user.id);
  }

  async createWorkspace(
    client: SupabaseClient,
    user: AuthenticatedUser,
    data: { name: string; icon?: string }
  ): Promise<Workspace> {
    logger.info('Creating new workspace', {
      operation: 'createWorkspace',
      userId: user.id,
      name: data.name
    });
    const workspace = await this.repository.createWorkspace(client, user.id, data);
    logger.info('Workspace created successfully', {
      operation: 'createWorkspace:success',
      userId: user.id,
      workspaceId: workspace.id
    });
    return workspace;
  }

  async updateWorkspace(
    client: SupabaseClient,
    user: AuthenticatedUser,
    workspaceId: string,
    data: { name?: string; icon?: string }
  ): Promise<Workspace> {
    logger.info('Updating workspace', {
      operation: 'updateWorkspace',
      userId: user.id,
      workspaceId
    });
    const updated = await this.repository.updateWorkspace(client, user.id, workspaceId, data);
    logger.info('Workspace updated successfully', {
      operation: 'updateWorkspace:success',
      userId: user.id,
      workspaceId
    });
    return updated;
  }

  async deleteWorkspace(
    client: SupabaseClient,
    user: AuthenticatedUser,
    workspaceId: string
  ): Promise<void> {
    logger.info('Deleting workspace', {
      operation: 'deleteWorkspace',
      userId: user.id,
      workspaceId
    });
    await this.repository.deleteWorkspace(client, user.id, workspaceId);
    logger.info('Workspace deleted successfully', {
      operation: 'deleteWorkspace:success',
      userId: user.id,
      workspaceId
    });
  }
}

export const workspaceService = new WorkspaceService(workspaceRepository);
