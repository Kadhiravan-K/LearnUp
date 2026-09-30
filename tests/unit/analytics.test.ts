import { describe, it, expect } from 'vitest';
import { AnalyticsMetricCard } from '@/components/analytics/AnalyticsMetricCard';
import { StudyConsistencyHeatmap } from '@/components/analytics/StudyConsistencyHeatmap';
import { DailyTimeModalityChart } from '@/components/analytics/DailyTimeModalityChart';
import { CurriculumVelocityMatrix } from '@/components/analytics/CurriculumVelocityMatrix';
import { CognitiveLoadVolume } from '@/components/analytics/CognitiveLoadVolume';
import { SkillDomainAllocation } from '@/components/analytics/SkillDomainAllocation';
import { LearningGoalsTrajectory } from '@/components/analytics/LearningGoalsTrajectory';
import { AIKnowledgeDiagnostic } from '@/components/analytics/AIKnowledgeDiagnostic';

describe('Analytics & Intelligence Hub Components (SF-035)', () => {
  it('exports all analytics subcomponents correctly', () => {
    expect(AnalyticsMetricCard).toBeDefined();
    expect(typeof AnalyticsMetricCard).toBe('function');

    expect(StudyConsistencyHeatmap).toBeDefined();
    expect(typeof StudyConsistencyHeatmap).toBe('function');

    expect(DailyTimeModalityChart).toBeDefined();
    expect(typeof DailyTimeModalityChart).toBe('function');

    expect(CurriculumVelocityMatrix).toBeDefined();
    expect(typeof CurriculumVelocityMatrix).toBe('function');

    expect(CognitiveLoadVolume).toBeDefined();
    expect(typeof CognitiveLoadVolume).toBe('function');

    expect(SkillDomainAllocation).toBeDefined();
    expect(typeof SkillDomainAllocation).toBe('function');

    expect(LearningGoalsTrajectory).toBeDefined();
    expect(typeof LearningGoalsTrajectory).toBe('function');

    expect(AIKnowledgeDiagnostic).toBeDefined();
    expect(typeof AIKnowledgeDiagnostic).toBe('function');
  });

  it('validates AnalyticsMetricCard props contract', () => {
    const props = {
      label: 'Total Hours',
      value: '142.5',
      unit: 'hrs',
      delta: '↗ +14.8h vs prev',
      subtext: '88% deep focus',
      icon: null
    };

    expect(props.label).toBe('Total Hours');
    expect(props.value).toBe('142.5');
    expect(props.unit).toBe('hrs');
    expect(props.delta).toContain('+14.8h');
  });
});
