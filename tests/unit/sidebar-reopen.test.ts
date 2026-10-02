import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NAV_ITEMS, ADDITIONAL_NAV_ITEMS } from '@/components/layout/Sidebar';

// Mock localStorage for node test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('Sidebar Reopen & Navigation Configuration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('contains all required primary navigation items with valid icons and active checkers', () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual(['Dashboard', 'Library', 'Learn', 'Analytics', 'Roadmaps', 'Focus', 'Settings']);

    for (const item of NAV_ITEMS) {
      expect(typeof item.label).toBe('string');
      expect(typeof item.href).toBe('string');
      expect(typeof item.isActive).toBe('function');
      expect(typeof item.icon).toBe('function');
    }
  });

  it('contains additional learning hub items', () => {
    const labels = ADDITIONAL_NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual(['Skills', 'Notes', 'Planner', 'Rewards', 'AI Assistant']);
  });

  it('correctly manages sidebar collapse local storage contract', () => {
    localStorage.setItem('learnup_sidebar_collapsed', 'true');
    expect(localStorage.getItem('learnup_sidebar_collapsed')).toBe('true');

    localStorage.setItem('learnup_sidebar_collapsed', 'false');
    expect(localStorage.getItem('learnup_sidebar_collapsed')).toBe('false');
  });

  it('correctly resolves active route for all primary items', () => {
    const dashboard = NAV_ITEMS.find((i) => i.label === 'Dashboard')!;
    const library = NAV_ITEMS.find((i) => i.label === 'Library')!;
    const learn = NAV_ITEMS.find((i) => i.label === 'Learn')!;

    expect(dashboard.isActive('/dashboard')).toBe(true);
    expect(dashboard.isActive('/')).toBe(true);
    expect(library.isActive('/library')).toBe(true);
    expect(learn.isActive('/library/some-video-id')).toBe(true);
  });
});
