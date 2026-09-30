import { describe, it, expect } from 'vitest';

interface RewardCredential {
  id: string;
  title: string;
  course: string;
  status: 'unlocked' | 'in-progress' | 'locked';
  xp: number;
  completionRate: number;
}

export function filterRewards(rewards: RewardCredential[], query: string, filterTab: string) {
  return rewards.filter((item) => {
    const matchesQuery =
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.course.toLowerCase().includes(query.toLowerCase());

    if (!matchesQuery) return false;

    if (filterTab === 'unlocked') return item.status === 'unlocked';
    if (filterTab === 'in-progress') return item.status === 'in-progress';
    if (filterTab === 'locked') return item.status === 'locked';
    return true;
  });
}

export function calculateRewardStats(rewards: RewardCredential[]) {
  const total = rewards.length;
  const unlocked = rewards.filter((r) => r.status === 'unlocked').length;
  const inProgress = rewards.filter((r) => r.status === 'in-progress').length;
  const locked = rewards.filter((r) => r.status === 'locked').length;
  const totalXP = rewards
    .filter((r) => r.status === 'unlocked')
    .reduce((acc, r) => acc + r.xp, 0);

  return { total, unlocked, inProgress, locked, totalXP };
}

describe('Rewards and Badges Logic', () => {
  const mockRewards: RewardCredential[] = [
    {
      id: 'c99',
      title: 'C99 Systems Architect',
      course: 'MIT 6.004',
      status: 'unlocked',
      xp: 500,
      completionRate: 100
    },
    {
      id: 'arm',
      title: 'Bare-Metal ARM Pioneer',
      course: 'ARM Cortex-M',
      status: 'in-progress',
      xp: 550,
      completionRate: 85
    },
    {
      id: 'k8s',
      title: 'Cloud Native & K8s Specialist',
      course: 'Kubernetes',
      status: 'locked',
      xp: 700,
      completionRate: 15
    }
  ];

  it('calculates reward stats and XP correctly', () => {
    const stats = calculateRewardStats(mockRewards);
    expect(stats.total).toBe(3);
    expect(stats.unlocked).toBe(1);
    expect(stats.inProgress).toBe(1);
    expect(stats.locked).toBe(1);
    expect(stats.totalXP).toBe(500);
  });

  it('filters rewards by status tab', () => {
    const unlocked = filterRewards(mockRewards, '', 'unlocked');
    expect(unlocked.length).toBe(1);
    expect(unlocked[0].title).toBe('C99 Systems Architect');

    const locked = filterRewards(mockRewards, '', 'locked');
    expect(locked.length).toBe(1);
    expect(locked[0].title).toBe('Cloud Native & K8s Specialist');
  });

  it('filters rewards by search query', () => {
    const results = filterRewards(mockRewards, 'Cortex', 'all');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('arm');
  });
});
