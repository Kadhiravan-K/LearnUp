import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { logger } from '../logging';
import { TokenUsageRecord } from '../types';
import { calculateTokenCost } from '../plugins/token-monetization';

export interface ITokenUsageRepository {
  listByUser(client: SupabaseClient, userId: string, limit?: number): Promise<TokenUsageRecord[]>;
  recordUsage(
    client: SupabaseClient,
    userId: string,
    params: {
      provider: string;
      model: string;
      promptTokens: number;
      completionTokens: number;
      operation?: string;
    }
  ): Promise<TokenUsageRecord>;
}

export class TokenUsageRepository implements ITokenUsageRepository {
  async listByUser(client: SupabaseClient, userId: string, limit: number = 100): Promise<TokenUsageRecord[]> {
    const { data, error } = await client
      .from('token_usage_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to list token usage records', {
        operation: 'listTokenUsage',
        userId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch token usage records', 500);
    }
    return (data as TokenUsageRecord[]) || [];
  }

  async recordUsage(
    client: SupabaseClient,
    userId: string,
    params: {
      provider: string;
      model: string;
      promptTokens: number;
      completionTokens: number;
      operation?: string;
    }
  ): Promise<TokenUsageRecord> {
    const totalTokens = params.promptTokens + params.completionTokens;
    const estimatedCostUsd = calculateTokenCost(
      params.provider,
      params.model,
      params.promptTokens,
      params.completionTokens
    );

    const { data, error } = await client
      .from('token_usage_ledger')
      .insert({
        user_id: userId,
        provider: params.provider,
        model: params.model,
        prompt_tokens: params.promptTokens,
        completion_tokens: params.completionTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCostUsd,
        operation: params.operation || 'inference'
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to record token usage', {
        operation: 'recordTokenUsage',
        userId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to record token usage', 500);
    }

    return data as TokenUsageRecord;
  }
}

export const tokenUsageRepository = new TokenUsageRepository();
