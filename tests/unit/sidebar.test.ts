import { describe, it, expect } from 'vitest';
import { NAV_ITEMS } from '@/components/layout/Sidebar';

describe('Sidebar Navigation Configuration (SF-033)', () => {
  it('contains the approved navigation items', () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual(['Dashboard', 'Library', 'Learn', 'Analytics', 'Roadmaps', 'Focus', 'Settings']);
  });

  it('correctly determines active state for Roadmaps', () => {
    const roadmapsItem = NAV_ITEMS.find((i) => i.label === 'Roadmaps')!;
    expect(roadmapsItem.isActive('/roadmaps')).toBe(true);
    expect(roadmapsItem.badge).toBe('Active');
    expect(roadmapsItem.isActive('/dashboard')).toBe(false);
  });

  it('correctly determines active state for Focus', () => {
    const focusItem = NAV_ITEMS.find((i) => i.label === 'Focus')!;
    expect(focusItem.isActive('/focus')).toBe(true);
    expect(focusItem.badge).toBe('7d streak');
    expect(focusItem.isActive('/dashboard')).toBe(false);
  });

  it('correctly determines active state for Dashboard', () => {
    const dashboardItem = NAV_ITEMS.find((i) => i.label === 'Dashboard')!;
    expect(dashboardItem.isActive('/dashboard')).toBe(true);
    expect(dashboardItem.isActive('/')).toBe(true);
    expect(dashboardItem.isActive('/library')).toBe(false);
  });

  it('correctly determines active state for Library', () => {
    const libraryItem = NAV_ITEMS.find((i) => i.label === 'Library')!;
    expect(libraryItem.isActive('/library')).toBe(true);
    expect(libraryItem.isActive('/dashboard')).toBe(false);
    expect(libraryItem.isActive('/library/123')).toBe(false);
  });

  it('correctly determines active state for Learn', () => {
    const learnItem = NAV_ITEMS.find((i) => i.label === 'Learn')!;
    expect(learnItem.isActive('/library/33333333-3333-3333-3333-333333333333')).toBe(true);
    expect(learnItem.isActive('/library')).toBe(false);
    expect(learnItem.isActive('/dashboard')).toBe(false);
  });

  it('correctly determines active state for Analytics', () => {
    const analyticsItem = NAV_ITEMS.find((i) => i.label === 'Analytics')!;
    expect(analyticsItem.isActive('/analytics')).toBe(true);
    expect(analyticsItem.isActive('/analytics/reports')).toBe(true);
    expect(analyticsItem.isActive('/dashboard')).toBe(false);
  });

  it('correctly determines active state for Settings', () => {
    const settingsItem = NAV_ITEMS.find((i) => i.label === 'Settings')!;
    expect(settingsItem.isActive('/settings')).toBe(true);
    expect(settingsItem.isActive('/settings/account')).toBe(true);
    expect(settingsItem.isActive('/library')).toBe(false);
  });

  it('has 7 navigation items', () => {
    expect(NAV_ITEMS).toHaveLength(7);
  });
});
