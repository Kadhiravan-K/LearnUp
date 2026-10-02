import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authModule from '@/lib/auth';
import { GET as getWorkspaces, POST as createWorkspaceApi } from '@/app/api/workspaces/route';
import { PATCH as updateWorkspaceApi, DELETE as deleteWorkspaceApi } from '@/app/api/workspaces/[id]/route';
import { NextRequest } from 'next/server';

describe('Workspaces API & Service Integration Tests', () => {
  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'learner@example.test'
  };

  let mockDbWorkspaces: any[] = [];

  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (table !== 'workspaces') {
        throw new Error(`Unexpected table ${table}`);
      }

      const chain: any = {
        _queryUser: null,
        _countOnly: false,

        select(fields?: string, options?: any) {
          if (options?.count === 'exact' && options?.head === true) {
            this._countOnly = true;
          }
          return this;
        },
        eq(col: string, val: any) {
          if (col === 'user_id') this._queryUser = val;
          return this;
        },
        order() {
          return this;
        },
        insert(record: any) {
          const newWs = {
            id: 'ws-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            user_id: record.user_id,
            name: record.name,
            icon: record.icon || '📚',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          mockDbWorkspaces.push(newWs);
          return {
            select: () => ({
              single: async () => ({ data: newWs, error: null })
            })
          };
        },
        update(updates: any) {
          return {
            eq: (col1: string, val1: any) => ({
              eq: (col2: string, val2: any) => ({
                select: () => ({
                  single: async () => {
                    const target = mockDbWorkspaces.find((w) => w.id === val1 && w.user_id === val2);
                    if (!target) return { data: null, error: { message: 'Not found' } };
                    Object.assign(target, updates);
                    return { data: target, error: null };
                  }
                })
              })
            })
          };
        },
        delete() {
          return {
            eq: (col1: string, val1: any) => ({
              eq: (col2: string, val2: any) => {
                const idx = mockDbWorkspaces.findIndex((w) => w.id === val1 && w.user_id === val2);
                if (idx !== -1) mockDbWorkspaces.splice(idx, 1);
                return Promise.resolve({ error: null });
              }
            })
          };
        },
        then(resolve: any) {
          if (this._countOnly) {
            const count = mockDbWorkspaces.filter((w) => !this._queryUser || w.user_id === this._queryUser).length;
            return Promise.resolve({ count, error: null }).then(resolve);
          }
          const filtered = mockDbWorkspaces.filter((w) => !this._queryUser || w.user_id === this._queryUser);
          return Promise.resolve({ data: filtered, error: null }).then(resolve);
        }
      };

      return chain;
    })
  };

  beforeEach(() => {
    mockDbWorkspaces = [];
    vi.restoreAllMocks();
    vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
      user: mockUser as any,
      supabase: mockSupabase as any,
      accessToken: 'fake-token'
    });
  });

  it('GET /api/workspaces auto-seeds initial default workspace if empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/workspaces');
    const res = await getWorkspaces(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].name).toBe('Personal Study Vault');
    expect(body.data[0].icon).toBe('📚');
  });

  it('POST /api/workspaces creates a new workspace with custom name & icon', async () => {
    const req = new NextRequest('http://localhost:3000/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name: 'Computer Science Core', icon: '💻' })
    });
    const res = await createWorkspaceApi(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.name).toBe('Computer Science Core');
    expect(body.data.icon).toBe('💻');
  });

  it('PATCH /api/workspaces/[id] updates workspace name and icon', async () => {
    // Initial workspace
    mockDbWorkspaces.push({
      id: '00000000-0000-0000-0000-000000000001',
      user_id: mockUser.id,
      name: 'Old Name',
      icon: '📚'
    });

    const req = new NextRequest('http://localhost:3000/api/workspaces/00000000-0000-0000-0000-000000000001', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name', icon: '🚀' })
    });

    const res = await updateWorkspaceApi(req, { params: { id: '00000000-0000-0000-0000-000000000001' } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.name).toBe('Updated Name');
    expect(body.data.icon).toBe('🚀');
  });

  it('DELETE /api/workspaces/[id] blocks deletion if user has only 1 workspace', async () => {
    mockDbWorkspaces.push({
      id: '00000000-0000-0000-0000-000000000001',
      user_id: mockUser.id,
      name: 'Sole Workspace',
      icon: '📚'
    });

    const req = new NextRequest('http://localhost:3000/api/workspaces/00000000-0000-0000-0000-000000000001', {
      method: 'DELETE'
    });

    const res = await deleteWorkspaceApi(req, { params: { id: '00000000-0000-0000-0000-000000000001' } });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('Cannot delete your only workspace');
  });

  it('DELETE /api/workspaces/[id] succeeds when user has multiple workspaces', async () => {
    mockDbWorkspaces.push(
      {
        id: '00000000-0000-0000-0000-000000000001',
        user_id: mockUser.id,
        name: 'Workspace 1',
        icon: '📚'
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        user_id: mockUser.id,
        name: 'Workspace 2',
        icon: '💻'
      }
    );

    const req = new NextRequest('http://localhost:3000/api/workspaces/00000000-0000-0000-0000-000000000002', {
      method: 'DELETE'
    });

    const res = await deleteWorkspaceApi(req, { params: { id: '00000000-0000-0000-0000-000000000002' } });
    expect(res.status).toBe(200);
    expect(mockDbWorkspaces.length).toBe(1);
    expect(mockDbWorkspaces[0].name).toBe('Workspace 1');
  });
});
