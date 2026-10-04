import { describe, it, expect } from 'vitest';
import { RoadmapsRepository } from '@/lib/db/roadmaps-repository';

describe('Learning Roadmaps & Progression (SF-Roadmaps)', () => {
  const repository = new RoadmapsRepository();
  const mockClient = {} as any;
  const testUserId = 'test_user_roadmaps_1';

  it('provides zero tracks initially', async () => {
    const tracks = await repository.listTracks(mockClient, testUserId);
    expect(tracks.length).toBe(0);
  });

  it('allows creating a custom roadmap track', async () => {
    const newTrack = await repository.createTrack(mockClient, testUserId, {
      title: 'Distributed Consensus & Raft Internals',
      description: 'Zero-downtime leader election and log compaction algorithms.'
    });

    expect(newTrack.id).toBeDefined();
    expect(newTrack.title).toBe('Distributed Consensus & Raft Internals');
    expect(newTrack.nodes.length).toBe(1);

    const allTracks = await repository.listTracks(mockClient, testUserId);
    expect(allTracks.some((t) => t.id === newTrack.id)).toBe(true);
  });

  it('appends a milestone node to an existing track', async () => {
    const tracks = await repository.listTracks(mockClient, testUserId);
    const track = tracks[0];
    const initialNodeCount = track.nodes.length;

    const updatedTrack = await repository.appendNode(mockClient, testUserId, track.id, {
      title: 'Hardware Cryptographic Accelerators',
      description: 'AES-GCM, ECC, and secure boot hardware root of trust.'
    });

    expect(updatedTrack.nodes.length).toBe(initialNodeCount + 1);
    const lastNode = updatedTrack.nodes[updatedTrack.nodes.length - 1];
    expect(lastNode.title).toBe('Hardware Cryptographic Accelerators');
    expect(lastNode.status).toBe('locked');
  });

  it('updates milestone node status and course links', async () => {
    const tracks = await repository.listTracks(mockClient, testUserId);
    const track = tracks[0];
    const node = track.nodes[0];

    const updated = await repository.updateNode(mockClient, testUserId, track.id, node.id, {
      status: 'completed',
      progress_percentage: 100
    });

    const updatedNode = updated.nodes.find((n) => n.id === node.id);
    expect(updatedNode?.status).toBe('completed');
    expect(updatedNode?.progress_percentage).toBe(100);
  });
});
