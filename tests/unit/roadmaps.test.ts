import { describe, expect, it } from 'vitest';
import { RoadmapsRepository } from '@/lib/db/roadmaps-repository';
import type { RoadmapNode } from '@/lib/types';

type Row = Record<string, any>;

class MockQuery {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: Row | Row[] | null = null;
  private filters: Array<[string, unknown]> = [];
  private selects = false;

  constructor(private readonly database: MockSupabase, private readonly table: string) {}

  select() {
    this.selects = true;
    return this;
  }

  insert(payload: Row | Row[]) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Row) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push([field, value]);
    return this;
  }

  order() {
    return this;
  }

  maybeSingle() {
    return this.execute(true);
  }

  then(resolve: (value: any) => unknown, reject: (reason: unknown) => unknown) {
    return Promise.resolve(this.execute(false)).then(resolve, reject);
  }

  private execute(single: boolean): { data: Row | Row[] | null; error: null } {
    const rows = this.database.tables[this.table] || [];
    const matches = (row: Row) => this.filters.every(([field, value]) => row[field] === value);

    if (this.action === 'insert') {
      const inserted = (Array.isArray(this.payload) ? this.payload : [this.payload]).filter(Boolean) as Row[];
      rows.push(...inserted);
      return { data: this.selects ? (single ? inserted[0] || null : inserted) : null, error: null };
    }

    const matchingRows = rows.filter(matches);
    if (this.action === 'update') {
      for (const row of matchingRows) Object.assign(row, this.payload);
    } else if (this.action === 'delete') {
      this.database.tables[this.table] = rows.filter((row) => !matches(row));
    }

    const selectedRows = this.action === 'select' && this.table === 'roadmap_tracks'
      ? matchingRows.map((track) => ({
          ...track,
          nodes: (this.database.tables.roadmap_nodes || [])
            .filter((node) => node.roadmap_id === track.id)
            .map((node) => ({
              ...node,
              learning_item: (this.database.tables.learning_items || [])
                .find((item) => item.id === node.learning_item_id) || null
            }))
        }))
      : matchingRows;
    return { data: this.selects ? (single ? selectedRows[0] || null : selectedRows) : null, error: null };
  }
}

class MockSupabase {
  tables: Record<string, Row[]> = {
    roadmap_tracks: [],
    roadmap_nodes: [],
    learning_items: [
      {
        id: 'course-owner-one',
        user_id: 'user-one',
        title: 'Systems Course',
        author: 'LearnUp',
        total_duration_seconds: 5400,
        status: 'ready'
      },
      {
        id: 'course-owner-two',
        user_id: 'user-two',
        title: 'Private Course',
        author: 'LearnUp',
        total_duration_seconds: 3600,
        status: 'ready'
      }
    ]
  };

  from(table: string) {
    return new MockQuery(this, table);
  }

  async rpc(name: string, args: Row) {
    if (name !== 'create_roadmap_track') return { data: null, error: { message: 'Unknown procedure' } };
    const id = `track-${this.tables.roadmap_tracks.length + 1}`;
    const now = new Date().toISOString();
    this.tables.roadmap_tracks.push({
      id,
      user_id: args.p_user_id,
      title: args.p_title,
      description: args.p_description,
      category: args.p_category,
      updated_at: now
    });
    this.tables.roadmap_nodes.push({
      id: `node-${this.tables.roadmap_nodes.length + 1}`,
      roadmap_id: id,
      user_id: args.p_user_id,
      node_number: '01',
      title: 'Foundations & Setup',
      description: 'Core concepts and environment configuration.',
      status: 'active',
      progress_percentage: 0,
      hours_logged: 0,
      tags: ['foundation', 'getting-started'],
      prerequisite_node_id: null,
      prerequisite_label: null,
      suggested_course_title: null,
      learning_item_id: null,
      course_progress_percentage: 0,
      course_total_lectures: null
    });
    return { data: id, error: null };
  }
}

describe('RoadmapsRepository', () => {
  const repository = new RoadmapsRepository();

  it('lists no tracks for a user with no saved roadmaps', async () => {
    const supabase = new MockSupabase();

    await expect(repository.listTracks(supabase as never, 'user-one')).resolves.toEqual([]);
  });

  it('persists created tracks and milestones beyond the repository instance', async () => {
    const supabase = new MockSupabase();
    const created = await repository.createTrack(supabase as never, 'user-one', {
      title: 'Distributed Systems',
      description: 'Study consensus and replication.'
    });
    const anotherRepository = new RoadmapsRepository();
    const listed = await anotherRepository.listTracks(supabase as never, 'user-one');

    expect(created.id).toBeTruthy();
    expect(created.nodes).toHaveLength(1);
    expect(listed.map((track) => track.id)).toContain(created.id);
    expect(listed[0].nodes[0].title).toBe('Foundations & Setup');
  });

  it('appends and updates milestones and links a course from the same user library', async () => {
    const supabase = new MockSupabase();
    const track = await repository.createTrack(supabase as never, 'user-one', {
      title: 'Systems',
      description: ''
    });
    const appended = await repository.appendNode(supabase as never, 'user-one', track.id, {
      title: 'Concurrency',
      description: 'Threads and synchronization.'
    });
    const node = appended.nodes[1];
    const updated = await repository.updateNode(supabase as never, 'user-one', track.id, node.id, {
      status: 'in_progress',
      progress_percentage: 35,
      attached_course: {
        id: 'course-owner-one',
        title: 'Systems Course',
        progress_percentage: 35,
        total_lectures: 12
      }
    } satisfies Partial<RoadmapNode>);

    expect(updated.nodes).toHaveLength(2);
    expect(updated.nodes[1].status).toBe('in_progress');
    expect(updated.nodes[1].attached_course).toMatchObject({
      id: 'course-owner-one',
      title: 'Systems Course',
      progress_percentage: 35,
      total_lectures: 12,
      runtime_formatted: '1h 30m'
    });
    expect(updated.linked_courses_count).toBe(1);
  });

  it('rejects linking a different user’s library course', async () => {
    const supabase = new MockSupabase();
    const track = await repository.createTrack(supabase as never, 'user-one', {
      title: 'Systems',
      description: ''
    });
    const node = track.nodes[0];

    await expect(repository.updateNode(supabase as never, 'user-one', track.id, node.id, {
      attached_course: {
        id: 'course-owner-two',
        title: 'Private Course',
        progress_percentage: 0
      }
    })).rejects.toMatchObject({ statusCode: 404 });
    expect(supabase.tables.roadmap_nodes[0].learning_item_id).toBeNull();
  });

  it('does not return or delete another user’s tracks', async () => {
    const supabase = new MockSupabase();
    const userOneTrack = await repository.createTrack(supabase as never, 'user-one', {
      title: 'One',
      description: ''
    });
    const userTwoTrack = await repository.createTrack(supabase as never, 'user-two', {
      title: 'Two',
      description: ''
    });

    await expect(repository.getTrackById(supabase as never, 'user-one', userTwoTrack.id)).resolves.toBeNull();
    await repository.deleteTrack(supabase as never, 'user-one', userTwoTrack.id);
    await expect(repository.getTrackById(supabase as never, 'user-two', userTwoTrack.id)).resolves.toMatchObject({
      title: 'Two'
    });
    await repository.deleteTrack(supabase as never, 'user-one', userOneTrack.id);
    await expect(repository.listTracks(supabase as never, 'user-one')).resolves.toEqual([]);
  });
});
