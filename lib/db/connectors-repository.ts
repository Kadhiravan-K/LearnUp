import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { logger } from '../logging';
import { UserConnector, ConnectorType, ConnectorStatus } from '../types';

export interface IConnectorsRepository {
  listByUser(client: SupabaseClient, userId: string): Promise<UserConnector[]>;
  getByType(client: SupabaseClient, userId: string, connectorType: ConnectorType): Promise<UserConnector | null>;
  upsert(
    client: SupabaseClient,
    userId: string,
    connector: {
      connectorType: ConnectorType;
      isEnabled?: boolean;
      config?: Record<string, any>;
      authToken?: string | null;
      status?: ConnectorStatus;
      errorMessage?: string | null;
      lastSyncedAt?: string | null;
    }
  ): Promise<UserConnector>;
  updateStatus(
    client: SupabaseClient,
    userId: string,
    connectorType: ConnectorType,
    status: ConnectorStatus,
    errorMessage?: string | null,
    lastSyncedAt?: string | null
  ): Promise<void>;
}

export class ConnectorsRepository implements IConnectorsRepository {
  async listByUser(client: SupabaseClient, userId: string): Promise<UserConnector[]> {
    const { data, error } = await client
      .from('user_connectors')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to list user connectors', {
        operation: 'listUserConnectors',
        userId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch connectors', 500);
    }
    return (data as UserConnector[]) || [];
  }

  async getByType(client: SupabaseClient, userId: string, connectorType: ConnectorType): Promise<UserConnector | null> {
    const { data, error } = await client
      .from('user_connectors')
      .select('*')
      .eq('user_id', userId)
      .eq('connector_type', connectorType)
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch connector by type', {
        operation: 'getConnectorByType',
        userId,
        connectorType,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch connector', 500);
    }
    return data as UserConnector | null;
  }

  async upsert(
    client: SupabaseClient,
    userId: string,
    connector: {
      connectorType: ConnectorType;
      isEnabled?: boolean;
      config?: Record<string, any>;
      authToken?: string | null;
      status?: ConnectorStatus;
      errorMessage?: string | null;
      lastSyncedAt?: string | null;
    }
  ): Promise<UserConnector> {
    const payload: Record<string, any> = {
      user_id: userId,
      connector_type: connector.connectorType,
      updated_at: new Date().toISOString()
    };

    if (connector.isEnabled !== undefined) payload.is_enabled = connector.isEnabled;
    if (connector.config !== undefined) payload.config = connector.config;
    if (connector.authToken !== undefined) payload.auth_token = connector.authToken;
    if (connector.status !== undefined) payload.status = connector.status;
    if (connector.errorMessage !== undefined) payload.error_message = connector.errorMessage;
    if (connector.lastSyncedAt !== undefined) payload.last_synced_at = connector.lastSyncedAt;

    const { data, error } = await client
      .from('user_connectors')
      .upsert(payload, { onConflict: 'user_id,connector_type' })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to upsert user connector', {
        operation: 'upsertUserConnector',
        userId,
        connectorType: connector.connectorType,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to save connector configuration', 500);
    }

    return data as UserConnector;
  }

  async updateStatus(
    client: SupabaseClient,
    userId: string,
    connectorType: ConnectorType,
    status: ConnectorStatus,
    errorMessage?: string | null,
    lastSyncedAt?: string | null
  ): Promise<void> {
    const updatePayload: Record<string, any> = {
      status,
      error_message: errorMessage || null,
      updated_at: new Date().toISOString()
    };
    if (lastSyncedAt) {
      updatePayload.last_synced_at = lastSyncedAt;
    }

    const { error } = await client
      .from('user_connectors')
      .update(updatePayload)
      .eq('user_id', userId)
      .eq('connector_type', connectorType);

    if (error) {
      logger.error('Failed to update connector status', {
        operation: 'updateConnectorStatus',
        userId,
        connectorType,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to update connector status', 500);
    }
  }
}

export const connectorsRepository = new ConnectorsRepository();
