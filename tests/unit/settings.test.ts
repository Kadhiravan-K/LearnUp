import { describe, it, expect } from 'vitest';
import { getHeaderTitleAndBreadcrumbs } from '@/components/layout/Header';
import { NAV_ITEMS } from '@/components/layout/Sidebar';
import { DEFAULT_USER_SETTINGS, SettingsRepository } from '@/lib/db/settings-repository';
import { updateUserSettingsSchema, validateInput } from '@/lib/validation/schemas';
import { SETTINGS_TABS } from '@/components/settings/SettingsNav';

describe('Settings Navigation & Account Logic (SF-036)', () => {
  it('navigates to /settings from sidebar configuration', () => {
    const settingsItem = NAV_ITEMS.find((i) => i.label === 'Settings');
    expect(settingsItem).toBeDefined();
    expect(settingsItem?.href).toBe('/settings');
    expect(settingsItem?.isActive('/settings')).toBe(true);
  });

  it('maps header title to Settings for /settings route', () => {
    const headerConfig = getHeaderTitleAndBreadcrumbs('/settings');
    expect(headerConfig.title).toBe('Settings');
  });

  it('contains all 12 settings tabs in the navigation bar', () => {
    expect(SETTINGS_TABS).toHaveLength(12);
    const tabIds = SETTINGS_TABS.map((t) => t.id);
    expect(tabIds).toEqual([
      'account',
      'appearance',
      'customization',
      'focus-timer',
      'learning-prefs',
      'ai-provider',
      'connectors',
      'plugins-marketplace',
      'token-usage',
      'notifications',
      'bin',
      'data-privacy'
    ]);
  });

  describe('Default User Settings Invariants', () => {
    it('provides sensible production defaults matching Figma specifications', () => {
      expect(DEFAULT_USER_SETTINGS.theme_mode).toBe('light');
      expect(DEFAULT_USER_SETTINGS.accent_color).toBe('indigo');
      expect(DEFAULT_USER_SETTINGS.default_sprint_duration).toBe(25);
      expect(DEFAULT_USER_SETTINGS.short_break_duration).toBe(5);
      expect(DEFAULT_USER_SETTINGS.long_break_duration).toBe(15);
      expect(DEFAULT_USER_SETTINGS.auto_start_breaks).toBe(true);
      expect(DEFAULT_USER_SETTINGS.auto_start_next_sprint).toBe(false);
      expect(DEFAULT_USER_SETTINGS.auto_mark_video_completed).toBe(true);
      expect(DEFAULT_USER_SETTINGS.default_player_layout).toBe('technical_workstation');
      expect(DEFAULT_USER_SETTINGS.streak_threshold_minutes).toBe(30);
      expect(DEFAULT_USER_SETTINGS.ai_provider).toBe('anthropic');
      expect(DEFAULT_USER_SETTINGS.temperature).toBe(0.2);
    });
  });

  describe('Validation Schema for User Settings (Zod)', () => {
    it('accepts valid partial settings updates', () => {
      const validPayload = {
        theme_mode: 'dark',
        accent_color: 'violet',
        default_sprint_duration: 45,
        short_break_duration: 10,
        long_break_duration: 20,
        ambient_soundscape: false,
        streak_threshold_minutes: 45,
        ai_provider: 'openai',
        ai_model: 'gpt-4o'
      };

      const parsed = validateInput(updateUserSettingsSchema, validPayload);
      expect(parsed.theme_mode).toBe('dark');
      expect(parsed.default_sprint_duration).toBe(45);
      expect(parsed.ai_provider).toBe('openai');
    });

    it('rejects invalid theme mode or player layout enum values', () => {
      expect(() => {
        validateInput(updateUserSettingsSchema, { theme_mode: 'invalid-mode' });
      }).toThrow();

      expect(() => {
        validateInput(updateUserSettingsSchema, { default_player_layout: 'invalid-layout' });
      }).toThrow();
    });

    it('rejects out-of-range sprint duration or temperature values', () => {
      expect(() => {
        validateInput(updateUserSettingsSchema, { default_sprint_duration: 500 });
      }).toThrow();

      expect(() => {
        validateInput(updateUserSettingsSchema, { temperature: 5.0 });
      }).toThrow();
    });
  });

  describe('SettingsRepository Logic', () => {
    it('can instantiate SettingsRepository', () => {
      const repo = new SettingsRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.getByUserId).toBe('function');
      expect(typeof repo.update).toBe('function');
      expect(typeof repo.deleteByUserId).toBe('function');
    });
  });
});
