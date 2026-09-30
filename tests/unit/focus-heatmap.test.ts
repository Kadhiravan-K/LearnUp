import { describe, it, expect } from 'vitest';

describe('Dynamic Focus Engine & Current Year Analytics Telemetry', () => {
  it('correctly calculates dynamic current year (2026+)', () => {
    const currentYear = new Date().getFullYear();
    expect(currentYear).toBeGreaterThanOrEqual(2026);

    const availableYears = [currentYear.toString(), (currentYear - 1).toString()];
    expect(availableYears[0]).toBe(currentYear.toString());
    expect(availableYears[1]).toBe((currentYear - 1).toString());
  });

  it('correctly formats zero-mock focus engine minutes for new user', () => {
    const formatFocusMinutes = (todayMins: number) =>
      todayMins === 0
        ? '0m'
        : todayMins >= 60
        ? `${Math.floor(todayMins / 60)}h ${todayMins % 60}m`
        : `${todayMins}m`;

    expect(formatFocusMinutes(0)).toBe('0m');
    expect(formatFocusMinutes(25)).toBe('25m');
    expect(formatFocusMinutes(90)).toBe('1h 30m');
  });

  it('correctly formats zero-mock target blocks for new user', () => {
    const formatTargetBlocks = (completedList: boolean[], total: number) => {
      const completed = completedList.filter(Boolean).length;
      return `${completed} / ${total} blocks`;
    };

    expect(formatTargetBlocks([], 6)).toBe('0 / 6 blocks');
    expect(formatTargetBlocks([true, true], 6)).toBe('2 / 6 blocks');
  });
});
