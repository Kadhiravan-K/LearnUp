import { describe, expect, it } from 'vitest';
import { buildRadarGeometry } from '@/components/dashboard/SkillRadarCard';

describe('buildRadarGeometry', () => {
  it('builds radar values from the provided axes', () => {
    const geometry = buildRadarGeometry([
      { label: 'Systems', value: 100 },
      { label: 'Math', value: 50 },
      { label: 'Writing', value: 0 }
    ]);

    expect(geometry).not.toBeNull();
    expect(geometry?.dataPoints).toHaveLength(3);
    expect(geometry?.dataPoints[0]).toEqual({ x: 110, y: 40 });
    expect(geometry?.dataPoints[1].x).toBeCloseTo(140.31, 1);
    expect(geometry?.dataPoints[1].y).toBeCloseTo(127.5, 1);
    expect(geometry?.dataPoints[2]).toEqual({ x: 110, y: 110 });
    expect(geometry?.ringPoints).toHaveLength(4);
  });

  it('does not invent chart dimensions when fewer than three axes are available', () => {
    expect(buildRadarGeometry([])).toBeNull();
    expect(buildRadarGeometry([{ label: 'Systems', value: 42 }])).toBeNull();
    expect(buildRadarGeometry([
      { label: 'Systems', value: 42 },
      { label: 'Math', value: 58 }
    ])).toBeNull();
  });

  it('clamps invalid and out-of-range values to the chart range', () => {
    const geometry = buildRadarGeometry([
      { label: 'Systems', value: Number.POSITIVE_INFINITY },
      { label: 'Math', value: -10 },
      { label: 'Writing', value: 150 }
    ]);

    expect(geometry?.dataPoints[0]).toEqual({ x: 110, y: 110 });
    expect(geometry?.dataPoints[1].x).toBeCloseTo(110, 5);
    expect(geometry?.dataPoints[1].y).toBeCloseTo(110, 5);
    expect(geometry?.dataPoints[2].y).toBeCloseTo(145, 5);
  });
});
