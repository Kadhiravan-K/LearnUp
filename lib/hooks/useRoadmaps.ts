'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import type { RoadmapTrack, RoadmapNode } from '@/lib/types';
import { INITIAL_ROADMAP_TRACKS } from '@/lib/db/roadmaps-repository';

export function useRoadmaps() {
  const [tracks, setTracks] = useState<RoadmapTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else if (
        typeof window !== 'undefined' &&
        (localStorage.getItem('LearnUp_is_guest') === 'true' || localStorage.getItem('LearnUp_guest_mode') === 'true')
      ) {
        headers['Authorization'] = 'Bearer guest-session';
      }
    } catch {
      // ignore
    }
    return headers;
  }, []);

  const fetchTracks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/roadmaps', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setTracks(json.data);
          return;
        }
      }
      setTracks([]);
    } catch {
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0] || null;
  const selectedNode = activeTrack?.nodes.find((n) => n.id === selectedNodeId) || activeTrack?.nodes[0] || null;

  const createTrack = async (title: string, description: string, category?: string) => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/roadmaps', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, description, category })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setTracks((prev) => [...prev, json.data]);
          setActiveTrackId(json.data.id);
          setSelectedNodeId(json.data.nodes[0]?.id || '');
          return json.data;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create roadmap track');
    }
  };

  const appendNode = async (trackId: string, title: string, description: string, tags?: string[]) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/roadmaps/${trackId}/nodes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, description, tags })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setTracks((prev) => prev.map((t) => (t.id === trackId ? json.data : t)));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to append node');
    }
  };

  const updateNode = async (trackId: string, nodeId: string, updates: Partial<RoadmapNode>) => {
    try {
      // Optimistic update
      setTracks((prev) =>
        prev.map((t) => {
          if (t.id !== trackId) return t;
          return {
            ...t,
            nodes: t.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n))
          };
        })
      );

      const headers = await getHeaders();
      await fetch(`/api/roadmaps/${trackId}/nodes/${nodeId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates)
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update node');
      fetchTracks();
    }
  };

  return {
    tracks,
    activeTrack,
    activeTrackId,
    setActiveTrackId,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    isLoading,
    error,
    refresh: fetchTracks,
    createTrack,
    appendNode,
    updateNode
  };
}
