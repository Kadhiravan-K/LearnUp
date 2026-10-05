import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { logger } from '../logging';
import { RoadmapTrack, RoadmapNode } from '../types';

interface RoadmapTrackRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  updated_at: string;
  nodes?: RoadmapNodeRow[];
}

interface RoadmapNodeRow {
  id: string;
  roadmap_id: string;
  node_number: string;
  title: string;
  description: string;
  status: RoadmapNode['status'];
  progress_percentage: number;
  hours_logged: number;
  tags: string[] | null;
  prerequisite_node_id: string | null;
  prerequisite_label: string | null;
  suggested_course_title: string | null;
  learning_item_id: string | null;
  course_progress_percentage: number;
  course_total_lectures: number | null;
  learning_item?: {
    id: string;
    title: string;
    author: string | null;
    total_duration_seconds: number | null;
  } | null;
}

const TRACK_SELECT = '*, nodes:roadmap_nodes(*, learning_item:learning_items(id, title, author, total_duration_seconds))';

function formatRuntime(seconds: number | null): string | undefined {
  if (!seconds || seconds < 1) return undefined;
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function mapNode(row: RoadmapNodeRow): RoadmapNode {
  const course = row.learning_item;
  const attachedCourse = row.learning_item_id && course
    ? {
        id: course.id,
        title: course.title,
        provider: course.author || 'YouTube',
        total_lectures: row.course_total_lectures ?? undefined,
        progress_percentage: row.course_progress_percentage,
        runtime_formatted: formatRuntime(course.total_duration_seconds)
      }
    : null;

  return {
    id: row.id,
    roadmap_id: row.roadmap_id,
    node_number: row.node_number,
    title: row.title,
    description: row.description,
    status: row.status,
    progress_percentage: row.progress_percentage,
    hours_logged: Number(row.hours_logged),
    tags: row.tags || [],
    prerequisite_node_id: row.prerequisite_node_id,
    prerequisite_label: row.prerequisite_label,
    suggested_course_title: row.suggested_course_title,
    attached_course: attachedCourse
  };
}

function mapTrack(row: RoadmapTrackRow): RoadmapTrack {
  const nodes = (row.nodes || [])
    .map(mapNode)
    .sort((left, right) => Number(left.node_number) - Number(right.node_number));
  const completed = nodes.filter((node) => node.status === 'completed').length;
  const active = nodes.filter((node) => node.status === 'active' || node.status === 'in_progress').length;

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    status_badge: 'ACTIVE SEQUENCE',
    author: 'Created by You',
    last_updated: row.updated_at,
    total_nodes_count: nodes.length,
    completed_nodes_count: completed,
    active_nodes_count: active,
    mastery_percentage: nodes.length ? Math.round((completed / nodes.length) * 100) : 0,
    pipeline_state: `${completed + active} of ${nodes.length} Active`,
    linked_courses_count: nodes.filter((node) => node.attached_course).length,
    total_hours_logged: nodes.reduce((total, node) => total + node.hours_logged, 0),
    estimated_completion_date: 'TBD',
    pacing_status: 'No pace estimate',
    nodes
  };
}

export class RoadmapsRepository {
  async listTracks(client: SupabaseClient, userId: string): Promise<RoadmapTrack[]> {
    const { data, error } = await client
      .from('roadmap_tracks')
      .select(TRACK_SELECT)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error('Failed to list roadmap tracks', { operation: 'listTracks', userId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to load roadmaps.', 500);
    }

    return ((data || []) as RoadmapTrackRow[]).map(mapTrack);
  }

  async getTrackById(client: SupabaseClient, userId: string, trackId: string): Promise<RoadmapTrack | null> {
    const { data, error } = await client
      .from('roadmap_tracks')
      .select(TRACK_SELECT)
      .eq('id', trackId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to get roadmap track', { operation: 'getTrackById', userId, trackId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to load roadmap.', 500);
    }

    return data ? mapTrack(data as RoadmapTrackRow) : null;
  }

  async createTrack(
    client: SupabaseClient,
    userId: string,
    track: { title: string; description: string; category?: string }
  ): Promise<RoadmapTrack> {
    const { data: trackId, error } = await client.rpc('create_roadmap_track', {
      p_user_id: userId,
      p_title: track.title,
      p_description: track.description || '',
      p_category: track.category || 'Engineering'
    });

    if (error || !trackId) {
      logger.error('Failed to create roadmap track', {
        operation: 'createTrack',
        userId,
        error: error?.message || 'The database did not return a roadmap ID.'
      });
      throw new AppError('DATABASE_ERROR', 'Failed to create roadmap.', 500);
    }

    const created = await this.getTrackById(client, userId, trackId);
    if (!created) throw new AppError('DATABASE_ERROR', 'Roadmap was created but could not be loaded.', 500);
    return created;
  }

  async appendNode(
    client: SupabaseClient,
    userId: string,
    trackId: string,
    node: { title: string; description: string; tags?: string[] }
  ): Promise<RoadmapTrack> {
    const track = await this.getTrackById(client, userId, trackId);
    if (!track) throw new AppError('NOT_FOUND', 'Roadmap track not found.', 404);

    const nextIndex = track.nodes.length + 1;
    const nodeNumber = nextIndex < 10 ? `0${nextIndex}` : `${nextIndex}`;
    const { error } = await client.from('roadmap_nodes').insert({
      roadmap_id: trackId,
      user_id: userId,
      node_number: nodeNumber,
      title: node.title,
      description: node.description || '',
      status: 'locked',
      tags: node.tags || ['curriculum']
    });

    if (error) {
      logger.error('Failed to append roadmap node', { operation: 'appendNode', userId, trackId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to add roadmap milestone.', 500);
    }

    await this.touchTrack(client, userId, trackId);
    const updated = await this.getTrackById(client, userId, trackId);
    if (!updated) throw new AppError('NOT_FOUND', 'Roadmap track not found.', 404);
    return updated;
  }

  async updateNode(
    client: SupabaseClient,
    userId: string,
    trackId: string,
    nodeId: string,
    updates: Partial<RoadmapNode>
  ): Promise<RoadmapTrack> {
    const patch: Record<string, unknown> = {};
    const directFields = [
      'title',
      'description',
      'status',
      'progress_percentage',
      'hours_logged',
      'tags',
      'prerequisite_node_id',
      'prerequisite_label',
      'suggested_course_title'
    ] as const;

    for (const field of directFields) {
      if (updates[field] !== undefined) patch[field] = updates[field];
    }

    if (updates.prerequisite_node_id) {
      const { data: prerequisite, error: prerequisiteError } = await client
        .from('roadmap_nodes')
        .select('id')
        .eq('id', updates.prerequisite_node_id)
        .eq('roadmap_id', trackId)
        .eq('user_id', userId)
        .maybeSingle();

      if (prerequisiteError) {
        logger.error('Failed to verify roadmap prerequisite', {
          operation: 'updateNode:verifyPrerequisite',
          userId,
          trackId,
          error: prerequisiteError.message
        });
        throw new AppError('DATABASE_ERROR', 'Failed to verify the prerequisite milestone.', 500);
      }
      if (!prerequisite) throw new AppError('NOT_FOUND', 'Prerequisite milestone was not found.', 404);
    }

    if (updates.attached_course !== undefined) {
      const course = updates.attached_course;
      if (course) {
        const { data: libraryItem, error: libraryError } = await client
          .from('learning_items')
          .select('id')
          .eq('id', course.id)
          .eq('user_id', userId)
          .eq('status', 'ready')
          .maybeSingle();

        if (libraryError) {
          logger.error('Failed to verify roadmap course ownership', {
            operation: 'updateNode:verifyLibraryItem',
            userId,
            learningItemId: course.id,
            error: libraryError.message
          });
          throw new AppError('DATABASE_ERROR', 'Failed to verify the selected library course.', 500);
        }
        if (!libraryItem) throw new AppError('NOT_FOUND', 'Selected course was not found in your library.', 404);

        patch.learning_item_id = course.id;
        patch.course_progress_percentage = course.progress_percentage;
        patch.course_total_lectures = course.total_lectures ?? null;
      } else {
        patch.learning_item_id = null;
        patch.course_progress_percentage = 0;
        patch.course_total_lectures = null;
      }
    }

    patch.updated_at = new Date().toISOString();
    const { data, error } = await client
      .from('roadmap_nodes')
      .update(patch)
      .eq('id', nodeId)
      .eq('roadmap_id', trackId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) {
      logger.error('Failed to update roadmap node', { operation: 'updateNode', userId, trackId, nodeId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to update roadmap milestone.', 500);
    }
    if (!data) throw new AppError('NOT_FOUND', 'Milestone node not found.', 404);

    await this.touchTrack(client, userId, trackId);
    const updated = await this.getTrackById(client, userId, trackId);
    if (!updated) throw new AppError('NOT_FOUND', 'Roadmap track not found.', 404);
    return updated;
  }

  async deleteTrack(client: SupabaseClient, userId: string, trackId: string): Promise<void> {
    const { error } = await client
      .from('roadmap_tracks')
      .delete()
      .eq('id', trackId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to delete roadmap track', { operation: 'deleteTrack', userId, trackId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to delete roadmap.', 500);
    }
  }

  private async touchTrack(client: SupabaseClient, userId: string, trackId: string): Promise<void> {
    const { error } = await client
      .from('roadmap_tracks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', trackId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to update roadmap timestamp', { operation: 'touchTrack', userId, trackId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to update roadmap.', 500);
    }
  }
}
