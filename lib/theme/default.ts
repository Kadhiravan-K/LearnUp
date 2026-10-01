import { ThemeDefinition } from './types';

export const LIGHT_THEME: ThemeDefinition = {
  id: 'light',
  name: 'LearnUp Light',
  tagline: 'Daylight Minimal',
  description: 'Crisp high-readability design with snow white cards, balanced visual weight, and deep slate typography.',
  category: 'core',
  badge: 'LIGHT',
  icon: '☀️',
  colors: {
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    primaryActive: '#4338CA',
    primaryLight: '#EEF2FF',
    primaryBorder: '#C7D2FE',
    bg: '#F8FAFC',
    bgElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceHover: '#F1F5F9',
    surfaceActive: '#E2E8F0',
    border: '#E2E8F0',
    borderHover: '#CBD5E1',
    borderFocus: '#6366F1',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',
    cardBg: '#FFFFFF',
    cardBorder: '#E2E8F0',
    inputBg: '#FFFFFF',
    inputBorder: '#CBD5E1',
    focusRingColor: 'rgba(99, 102, 241, 0.5)'
  },
  telemetryLabels: {
    systemStatus: 'System Nominal',
    learningCore: 'Learning Engine Ready',
    sessionActive: 'Session Active',
    syncOnline: 'Cloud Synced'
  }
};

export const DEFAULT_THEME: ThemeDefinition = {
  ...LIGHT_THEME,
  id: 'default',
  name: 'LearnUp Default',
  tagline: 'Clean Productivity'
};

export const DARK_THEME: ThemeDefinition = {
  id: 'dark',
  name: 'LearnUp Dark',
  tagline: 'Midnight Void (OLED Focus)',
  description: 'Low-strain OLED dark mode with deep navy slate surfaces, crisp contrast, and neon indigo accents.',
  category: 'core',
  badge: 'DARK',
  icon: '🌙',
  colors: {
    primary: '#818CF8',
    primaryHover: '#6366F1',
    primaryActive: '#4F46E5',
    primaryLight: 'rgba(99, 102, 241, 0.15)',
    primaryBorder: '#4338CA',
    bg: '#0B0F19',
    bgElevated: '#111827',
    surface: '#1E293B',
    surfaceHover: '#334155',
    surfaceActive: '#475569',
    border: '#334155',
    borderHover: '#475569',
    borderFocus: '#818CF8',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    textMuted: '#475569',
    textInverse: '#0F172A',
    cardBg: '#1E293B',
    cardBorder: '#334155',
    inputBg: '#0F172A',
    inputBorder: '#334155',
    focusRingColor: 'rgba(129, 140, 248, 0.5)'
  },
  telemetryLabels: {
    systemStatus: 'Dark Engine Active',
    learningCore: 'Low-Strain Focus',
    sessionActive: 'Nocturnal Session Active',
    syncOnline: 'Cloud Synced'
  }
};
