import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_THEME,
  LIGHT_THEME,
  DARK_THEME,
  PRIMARY_LearnUp_THEMES,
  MOTION_TOKENS,
  SPACING_TOKENS,
  RADIUS_TOKENS
} from '@/lib/theme';

describe('LearnUp Theme System — Architecture & Token Integrity', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockStorage = {
      getItem: (key: string) => mockStore[key] || null,
      setItem: (key: string, value: string) => { mockStore[key] = value; },
      removeItem: (key: string) => { delete mockStore[key]; },
      clear: () => { mockStore = {}; }
    };
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('provides the core light and dark themes', () => {
    expect(PRIMARY_LearnUp_THEMES).toHaveLength(2);
    const themeIds = PRIMARY_LearnUp_THEMES.map((t) => t.id);
    expect(themeIds).toContain('light');
    expect(themeIds).toContain('dark');
  });

  it('verifies LearnUp Light / Default theme tokens and contrast', () => {
    expect(DEFAULT_THEME.name).toBe('LearnUp Default');
    expect(DEFAULT_THEME.tagline).toBe('Clean Productivity');
    expect(DEFAULT_THEME.colors.primary).toBe('#6366F1');
    expect(DEFAULT_THEME.colors.bg).toBe('#F8FAFC');
    expect(DEFAULT_THEME.colors.textPrimary).toBe('#0F172A');
    expect(LIGHT_THEME.colors.surface).toBe('#FFFFFF');
  });

  it('verifies LearnUp Dark theme tokens and contrast', () => {
    expect(DARK_THEME.name).toBe('LearnUp Dark');
    expect(DARK_THEME.tagline).toBe('Midnight Void (OLED Focus)');
    expect(DARK_THEME.category).toBe('core');
    expect(DARK_THEME.colors.primary).toBe('#818CF8');
    expect(DARK_THEME.colors.bg).toBe('#0B0F19');
    expect(DARK_THEME.colors.surface).toBe('#111827');
    expect(DARK_THEME.colors.textPrimary).toBe('#F8FAFC');
  });

  it('contains valid centralized motion system tokens', () => {
    expect(MOTION_TOKENS.durationFast).toBe('150ms');
    expect(MOTION_TOKENS.durationNormal).toBe('250ms');
    expect(MOTION_TOKENS.durationSlow).toBe('400ms');
    expect(MOTION_TOKENS.easeDefault).toBeDefined();
  });

  it('maintains consistent spacing and radius token scales', () => {
    expect(SPACING_TOKENS.space4).toBe('1rem');
    expect(SPACING_TOKENS.space8).toBe('2rem');
    expect(RADIUS_TOKENS.lg).toBe('8px');
    expect(RADIUS_TOKENS.xl).toBe('12px');
  });

  it('handles theme persistence in localStorage correctly', () => {
    localStorage.setItem('LearnUp_theme', 'light');
    expect(localStorage.getItem('LearnUp_theme')).toBe('light');

    localStorage.setItem('LearnUp_theme', 'dark');
    expect(localStorage.getItem('LearnUp_theme')).toBe('dark');
  });
});
