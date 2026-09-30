import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authModule from '@/lib/auth';
import { GET as getConnectors, PATCH as patchConnectors } from '@/app/api/connectors/route';
import { POST as syncConnector } from '@/app/api/connectors/[type]/sync/route';
import { GET as getPlugins, PATCH as patchPlugins } from '@/app/api/plugins/route';
import { GET as getTokenUsage, POST as postTokenUsage } from '@/app/api/plugins/token-usage/route';
import { POST as postMcp } from '@/app/api/mcp/route';
import { NextRequest } from 'next/server';

describe('Connectors, Plugins & Extensibility API Integration Tests', () => {
  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'learner@example.test'
  };

  const createMockChain = (defaultData: any) => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.upsert = vi.fn().mockReturnValue(chain);
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: defaultData, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: defaultData, error: null });
    chain.then = (resolve: any) => Promise.resolve({ data: defaultData, error: null }).then(resolve);
    return chain;
  };

  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (table === 'user_connectors') {
        const chain = createMockChain([
          {
            id: 'c-1',
            user_id: mockUser.id,
            connector_type: 'obsidian',
            is_enabled: true,
            config: { vaultPath: '/vault' },
            status: 'connected',
            last_synced_at: new Date().toISOString()
          }
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 'c-1',
            user_id: mockUser.id,
            connector_type: 'obsidian',
            is_enabled: true,
            config: { vaultPath: '/home/user/Obsidian/Vault' },
            status: 'connected'
          },
          error: null
        });
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: {
            id: 'c-1',
            user_id: mockUser.id,
            connector_type: 'obsidian',
            is_enabled: true,
            config: { vaultPath: '/vault' },
            status: 'connected'
          },
          error: null
        });
        return chain;
      }

      if (table === 'user_plugins') {
        const chain = createMockChain([
          {
            id: 'p-1',
            user_id: mockUser.id,
            plugin_id: 'fsrs_srs_engine',
            is_enabled: true,
            config: {}
          }
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 'p-1',
            user_id: mockUser.id,
            plugin_id: 'code_sandbox_workstation',
            is_enabled: true,
            config: {}
          },
          error: null
        });
        return chain;
      }

      if (table === 'token_usage_ledger') {
        const chain = createMockChain([
          {
            id: 'tok-1',
            user_id: mockUser.id,
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            prompt_tokens: 50000,
            completion_tokens: 10000,
            total_tokens: 60000,
            estimated_cost_usd: 0.30,
            operation: 'diagnostic',
            created_at: new Date().toISOString()
          }
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 'mock-id-1',
            user_id: mockUser.id,
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            prompt_tokens: 1000,
            completion_tokens: 200,
            total_tokens: 1200,
            estimated_cost_usd: 0.006,
            operation: 'socratic_tutor'
          },
          error: null
        });
        return chain;
      }

      return createMockChain([]);
    })
  };

  beforeEach(() => {
    vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
      user: mockUser as any,
      supabase: mockSupabase as any,
      accessToken: 'mock-token-xyz'
    });
  });

  describe('1. GET & PATCH /api/connectors', () => {
    it('retrieves merged connector list with user configurations', async () => {
      const req = new NextRequest('http://localhost:3000/api/connectors');
      const res = await getConnectors(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(5);

      const obsidian = json.data.find((c: any) => c.type === 'obsidian');
      expect(obsidian).toBeDefined();
      expect(obsidian.status).toBe('connected');
      expect(obsidian.config.vaultPath).toBe('/vault');
    });

    it('updates connector settings via PATCH', async () => {
      const req = new NextRequest('http://localhost:3000/api/connectors', {
        method: 'PATCH',
        body: JSON.stringify({
          connector_type: 'obsidian',
          is_enabled: true,
          config: { vaultPath: '/home/user/Obsidian/Vault' }
        })
      });

      const res = await patchConnectors(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.connector_type).toBe('obsidian');
    });
  });

  describe('2. POST /api/connectors/[type]/sync', () => {
    it('executes sync for obsidian connector', async () => {
      const req = new NextRequest('http://localhost:3000/api/connectors/obsidian/sync', {
        method: 'POST'
      });

      const res = await syncConnector(req, { params: Promise.resolve({ type: 'obsidian' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.success).toBe(true);
      expect(json.data.connectorType).toBe('obsidian');
    });

    it('rejects invalid connector types with 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/connectors/invalid_app/sync', {
        method: 'POST'
      });

      const res = await syncConnector(req, { params: Promise.resolve({ type: 'invalid_app' }) });
      expect(res.status).toBe(400);
    });
  });

  describe('3. GET & PATCH /api/plugins', () => {
    it('retrieves all plugins merged with user preferences', async () => {
      const req = new NextRequest('http://localhost:3000/api/plugins');
      const res = await getPlugins(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBeGreaterThanOrEqual(8);

      const fsrs = json.data.find((p: any) => p.id === 'fsrs_srs_engine');
      expect(fsrs).toBeDefined();
      expect(fsrs.isEnabled).toBe(true);
    });

    it('updates plugin activation state via PATCH', async () => {
      const req = new NextRequest('http://localhost:3000/api/plugins', {
        method: 'PATCH',
        body: JSON.stringify({
          plugin_id: 'code_sandbox_workstation',
          is_enabled: true
        })
      });

      const res = await patchPlugins(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.plugin_id).toBe('code_sandbox_workstation');
    });
  });

  describe('4. GET & POST /api/plugins/token-usage', () => {
    it('retrieves token usage summary and recent ledger entries', async () => {
      const req = new NextRequest('http://localhost:3000/api/plugins/token-usage');
      const res = await getTokenUsage(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.summary.totalTokens).toBe(60000);
      expect(json.data.summary.totalCostUsd).toBe(0.3);
      expect(json.data.recentRecords).toHaveLength(1);
    });

    it('records token usage event via POST', async () => {
      const req = new NextRequest('http://localhost:3000/api/plugins/token-usage', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          prompt_tokens: 1000,
          completion_tokens: 200,
          operation: 'socratic_tutor'
        })
      });

      const res = await postTokenUsage(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe('mock-id-1');
    });
  });

  describe('5. MCP JSON-RPC Server', () => {
    it('exposes /api/mcp endpoint responding to tools/list', async () => {
      const req = new NextRequest('http://localhost:3000/api/mcp', {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        })
      });

      const res = await postMcp(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.result.tools).toHaveLength(5);
    });
  });
});
