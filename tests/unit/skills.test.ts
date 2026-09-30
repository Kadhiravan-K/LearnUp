import { describe, it, expect } from 'vitest';

interface SkillNode {
  id: string;
  name: string;
  category: 'core' | 'emerging' | 'review' | 'mastered' | 'focus';
  badgeLabel: string;
  mastery: number;
  description: string;
  coursesCount: number;
  completedCoursesCount: number;
  loggedHours: number;
  tags: string[];
}

export function filterSkills(skills: SkillNode[], query: string, tab: string) {
  return skills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(query.toLowerCase()) ||
      skill.description.toLowerCase().includes(query.toLowerCase()) ||
      skill.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));

    if (!matchesSearch) return false;

    if (tab === 'core') return skill.category === 'core' || skill.category === 'mastered';
    if (tab === 'emerging') return skill.category === 'emerging' || skill.category === 'focus';
    if (tab === 'review') return skill.category === 'review';
    return true;
  });
}

export function calculateSkillsMetrics(skills: SkillNode[]) {
  const totalNodes = skills.length;
  const totalHours = skills.reduce((acc, s) => acc + s.loggedHours, 0);
  const averageMastery = Math.round(
    skills.reduce((acc, s) => acc + s.mastery, 0) / (totalNodes || 1)
  );
  const coreNodes = skills.filter((s) => s.category === 'core' || s.category === 'mastered').length;

  return { totalNodes, totalHours, averageMastery, coreNodes };
}

describe('Skills and Taxonomy Logic', () => {
  const mockSkills: SkillNode[] = [
    {
      id: 'embedded-systems',
      name: 'Embedded Systems',
      category: 'core',
      badgeLabel: 'Core Node',
      mastery: 78,
      description: 'ARM Cortex-M bare-metal, memory mapped I/O',
      coursesCount: 6,
      completedCoursesCount: 4,
      loggedHours: 48.5,
      tags: ['#embedded', '#c-lang']
    },
    {
      id: 'iot-edge',
      name: 'IoT & Edge Computing',
      category: 'emerging',
      badgeLabel: 'Emerging',
      mastery: 54,
      description: 'ESP32 mesh networks, telemetry dispatch via MQTT',
      coursesCount: 4,
      completedCoursesCount: 2,
      loggedHours: 26.0,
      tags: ['#iot', '#esp32']
    },
    {
      id: 'electronics-circuit',
      name: 'Electronics & Circuit Design',
      category: 'review',
      badgeLabel: 'Needs Review',
      mastery: 41,
      description: 'Analog signal conditioning, op-amp filters',
      coursesCount: 3,
      completedCoursesCount: 1,
      loggedHours: 14.5,
      tags: ['#hardware', '#schematics']
    }
  ];

  it('calculates aggregate metrics correctly', () => {
    const metrics = calculateSkillsMetrics(mockSkills);
    expect(metrics.totalNodes).toBe(3);
    expect(metrics.totalHours).toBe(89);
    expect(metrics.averageMastery).toBe(58);
    expect(metrics.coreNodes).toBe(1);
  });

  it('filters skills by search keyword', () => {
    const results = filterSkills(mockSkills, 'ESP32', 'all');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('IoT & Edge Computing');
  });

  it('filters skills by category tab', () => {
    const coreResults = filterSkills(mockSkills, '', 'core');
    expect(coreResults.length).toBe(1);
    expect(coreResults[0].id).toBe('embedded-systems');

    const reviewResults = filterSkills(mockSkills, '', 'review');
    expect(reviewResults.length).toBe(1);
    expect(reviewResults[0].id).toBe('electronics-circuit');
  });
});
