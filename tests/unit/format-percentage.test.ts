import { describe, expect, it } from 'vitest';
import { formatPercentage } from '@/lib/utils/formatPercentage';

describe('formatPercentage', () => {
  it('limits progress display precision to two decimal places', () => {
    expect(formatPercentage(9.18814846507648)).toBe('9.19');
  });

  it('does not add unnecessary decimal places to whole percentages', () => {
    expect(formatPercentage(42)).toBe('42');
  });

  it('rounds at the second decimal place', () => {
    expect(formatPercentage(9.185)).toBe('9.19');
  });
});
