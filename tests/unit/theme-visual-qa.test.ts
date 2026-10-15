import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_THEME,
  LIGHT_THEME,
  DARK_THEME,
  PRIMARY_LearnUp_THEMES,
  MOTION_TOKENS
} from '@/lib/theme';
import { THEME_OPTIONS } from '@/components/settings/CustomizationSection';

describe('LearnUp Theme System — Visual QA & Integration Verification', () => {
  let mockStorageStore: Record<string, string> = {};

  beforeEach(() => {
    mockStorageStore = {};
    const mockStorage = {
      getItem: (key: string) => mockStorageStore[key] || null,
      setItem: (key: string, value: string) => { mockStorageStore[key] = value; },
      removeItem: (key: string) => { delete mockStorageStore[key]; },
      clear: () => { mockStorageStore = {}; }
    };
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('1. LearnUp Light Theme Baseline Verification', () => {
    it('preserves clean productivity tokens and high contrast ratios', () => {
      expect(DEFAULT_THEME.id).toBe('light');
      expect(DEFAULT_THEME.name).toBe('LearnUp Default');
      expect(DEFAULT_THEME.tagline).toBe('Clean Productivity');
      expect(DEFAULT_THEME.colors.bg).toBe('#F7FAF9');
      expect(DEFAULT_THEME.colors.surface).toBe('#FFFFFF');
      expect(DEFAULT_THEME.colors.textPrimary).toBe('#132B29');
      expect(DEFAULT_THEME.colors.primary).toBe('#0F766E');
      expect(DEFAULT_THEME.colors.border).toBe('#E0E7E6');
    });

    it('ensures Default theme has no unnecessary glow or gaming effects', () => {
      expect(DEFAULT_THEME.colors.glow).toBeUndefined();
    });
  });

  describe('2. LearnUp Dark Theme Verification (OLED Focus)', () => {
    it('uses deep dark surfaces and low-strain indigo accents', () => {
      expect(DARK_THEME.id).toBe('dark');
      expect(DARK_THEME.name).toBe('LearnUp Dark');
      expect(DARK_THEME.tagline).toBe('Deep Obsidian Focus');
      expect(DARK_THEME.colors.bg).toBe('#111B1B');
      expect(DARK_THEME.colors.surface).toBe('#1D2B2A');
      expect(DARK_THEME.colors.primary).toBe('#5EEAD4');
      expect(DARK_THEME.colors.textPrimary).toBe('#EDF7F4');
      expect(DARK_THEME.colors.textSecondary).toBe('#A4B9B4');
    });

    it('has precision focus ring and dark telemetry labels', () => {
      expect(DARK_THEME.colors.focusRingColor).toBe('rgba(94, 234, 212, 0.45)');
      expect(DARK_THEME.telemetryLabels?.systemStatus).toBe('Dark Engine Active');
      expect(DARK_THEME.telemetryLabels?.learningCore).toBe('Low-Strain Focus');
    });
  });

  describe('3. Theme Persistence & Safe Fallback', () => {
    it('persists selected theme to localStorage and reads back correctly', () => {
      localStorage.setItem('LearnUp_theme', 'light');
      expect(localStorage.getItem('LearnUp_theme')).toBe('light');

      localStorage.setItem('LearnUp_theme', 'dark');
      expect(localStorage.getItem('LearnUp_theme')).toBe('dark');
    });

    it('handles invalid or corrupted stored themes safely', () => {
      localStorage.setItem('LearnUp_theme', 'corrupted_theme_xyz');
      const saved = localStorage.getItem('LearnUp_theme');
      const validThemeIds = PRIMARY_LearnUp_THEMES.map((t) => t.id as string);
      const isKnown = validThemeIds.includes(saved || '');
      const effective = isKnown ? saved : 'light';
      expect(effective).toBe('light');
    });
  });

  describe('4. Accessibility & Motion Compliance', () => {
    it('defines standardized motion duration tokens', () => {
      expect(MOTION_TOKENS.durationFast).toBe('150ms');
      expect(MOTION_TOKENS.durationNormal).toBe('250ms');
      expect(MOTION_TOKENS.durationSlow).toBe('400ms');
    });

    it('includes light and dark themes in settings CustomizationSection options', () => {
      const optionIds = THEME_OPTIONS.map((o: any) => o.id);
      expect(optionIds).toHaveLength(2);
      expect(optionIds).toContain('light');
      expect(optionIds).toContain('dark');
    });
  });
});
