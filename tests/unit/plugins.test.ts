import { describe, it, expect } from 'vitest';
import {
  calculateTokenCost,
  summarizeTokenUsage,
  PROVIDER_MODEL_PRICING
} from '@/lib/plugins/token-monetization';
import { CORE_PLUGINS, COMMUNITY_PLUGINS, ALL_PLUGINS } from '@/lib/plugins/registry';
import { TokenUsageRecord } from '@/lib/types';

describe('Plugins, Skills & Token Monetization Ledger', () => {
  describe('1. Token Cost Calculation ($/1M Tokens)', () => {
    it('calculates Anthropic Claude 3.5 Sonnet token costs correctly', () => {
      // Prompt: 10,000 tokens @ $3.00/1M = $0.03
      // Completion: 2,000 tokens @ $15.00/1M = $0.03
      // Total = $0.06
      const cost = calculateTokenCost('anthropic', 'claude-3-5-sonnet-20241022', 10000, 2000);
      expect(cost).toBe(0.06);
    });

    it('calculates OpenAI GPT-4o token costs correctly', () => {
      // Prompt: 1,000,000 tokens @ $2.50/1M = $2.50
      // Completion: 500,000 tokens @ $10.00/1M = $5.00
      // Total = $7.50
      const cost = calculateTokenCost('openai', 'gpt-4o', 1000000, 500000);
      expect(cost).toBe(7.5);
    });

    it('calculates Google Gemini 1.5 Flash token costs correctly', () => {
      // Prompt: 100,000 tokens @ $0.075/1M = $0.0075
      // Completion: 50,000 tokens @ $0.30/1M = $0.0150
      // Total = $0.0225
      const cost = calculateTokenCost('google', 'gemini-1.5-flash', 100000, 50000);
      expect(cost).toBe(0.0225);
    });

    it('guarantees 100% free $0.00 cost for local Ollama and local models', () => {
      const ollamaCost = calculateTokenCost('ollama', 'llama3.2', 500000, 250000);
      expect(ollamaCost).toBe(0.00);

      const deepseekCost = calculateTokenCost('ollama', 'deepseek-r1:14b', 1000000, 1000000);
      expect(deepseekCost).toBe(0.00);

      const localCost = calculateTokenCost('local', 'local-engine', 1000000, 1000000);
      expect(localCost).toBe(0.00);
    });
  });

  describe('2. Token Usage Summarizer & Budget Tracking', () => {
    it('summarizes multiple inference records and calculates monthly budget usage', () => {
      const mockRecords: TokenUsageRecord[] = [
        {
          id: 'rec-1',
          user_id: 'user-1',
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          prompt_tokens: 50000,
          completion_tokens: 10000,
          total_tokens: 60000,
          estimated_cost_usd: 0.30,
          operation: 'doubt_solver',
          created_at: '2026-09-29T10:00:00Z'
        },
        {
          id: 'rec-2',
          user_id: 'user-1',
          provider: 'openai',
          model: 'gpt-4o',
          prompt_tokens: 100000,
          completion_tokens: 20000,
          total_tokens: 120000,
          estimated_cost_usd: 0.45,
          operation: 'quiz_generation',
          created_at: '2026-09-29T10:30:00Z'
        },
        {
          id: 'rec-3',
          user_id: 'user-1',
          provider: 'ollama',
          model: 'llama3.2',
          prompt_tokens: 500000,
          completion_tokens: 200000,
          total_tokens: 700000,
          estimated_cost_usd: 0.00,
          operation: 'local_summary',
          created_at: '2026-09-29T11:00:00Z'
        }
      ];

      const summary = summarizeTokenUsage(mockRecords, 20.00);

      expect(summary.totalTokens).toBe(880000);
      expect(summary.totalCostUsd).toBe(0.75);
      expect(summary.totalRequests).toBe(3);
      expect(summary.monthlyBudgetUsd).toBe(20.00);
      expect(summary.budgetUsedPercentage).toBe(4); // 0.75 / 20 = 3.75% -> 4%

      expect(summary.providerBreakdown).toHaveLength(3);
      const anthropicBreakdown = summary.providerBreakdown.find((p) => p.provider === 'anthropic');
      expect(anthropicBreakdown?.costUsd).toBe(0.30);
      expect(anthropicBreakdown?.tokens).toBe(60000);

      const ollamaBreakdown = summary.providerBreakdown.find((p) => p.provider === 'ollama');
      expect(ollamaBreakdown?.costUsd).toBe(0.00);
      expect(ollamaBreakdown?.tokens).toBe(700000);
    });
  });

  describe('3. Plugins & AI Skills Registry', () => {
    it('contains all core plugins with valid metadata and capabilities', () => {
      expect(CORE_PLUGINS.length).toBeGreaterThanOrEqual(6);
      const ids = CORE_PLUGINS.map((p) => p.id);
      expect(ids).toContain('vibe_code_generator');
      expect(ids).toContain('mermaid_architecture_flowchart');
      expect(ids).toContain('ai_tutor_diagnostic');
      expect(ids).toContain('fsrs_srs_engine');
      expect(ids).toContain('code_sandbox_workstation');

      CORE_PLUGINS.forEach((p) => {
        expect(p.isCore).toBe(true);
        expect(p.capabilities.length).toBeGreaterThan(0);
        expect(p.version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });

    it('contains all community plugins with modular extensibility specs', () => {
      expect(COMMUNITY_PLUGINS.length).toBeGreaterThanOrEqual(6);
      const ids = COMMUNITY_PLUGINS.map((p) => p.id);
      expect(ids).toContain('obsidian_notion_vault_sync');
      expect(ids).toContain('domain_taxonomy_glossary');
      expect(ids).toContain('ultradian_flow_orchestrator');
      expect(ids).toContain('design_system_component_inspector');
      expect(ids).toContain('anki_apkg_exporter');
      expect(ids).toContain('latex_typst_renderer');

      COMMUNITY_PLUGINS.forEach((p) => {
        expect(p.isCore).toBe(false);
        expect(p.capabilities.length).toBeGreaterThan(0);
      });
    });

    it('aggregates total plugin catalog correctly', () => {
      expect(ALL_PLUGINS.length).toBe(CORE_PLUGINS.length + COMMUNITY_PLUGINS.length);
    });
  });
});
