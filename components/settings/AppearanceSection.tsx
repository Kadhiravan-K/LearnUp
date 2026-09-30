'use client';

import React from 'react';
import { ThemeMode, AccentColor } from '@/lib/types';
import { useTheme } from '@/lib/hooks/useTheme';
import { ThemeSwitcher } from '@/lib/theme';
import styles from './AppearanceSection.module.css';

export interface AppearanceSectionProps {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  onChangeTheme: (theme: ThemeMode) => void;
  onChangeAccent: (accent: AccentColor) => void;
}

export function AppearanceSection({
  themeMode,
  accentColor,
  onChangeTheme,
  onChangeAccent
}: AppearanceSectionProps) {
  const { setTheme } = useTheme();

  const handleSelectTheme = (mode: ThemeMode) => {
    setTheme(mode);
    onChangeTheme(mode);
  };

  return (
    <section id="appearance" className={styles.section} aria-labelledby="appearance-heading">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.icon}>🎨</span>
          <h2 id="appearance-heading" className={styles.title}>Appearance &amp; Interface System</h2>
        </div>
        <span className={styles.engineBadge}>ENGINE: Geist Pro</span>
      </div>

      {/* Visual Experience Themes */}
      <div className={styles.group}>
        <span className={styles.groupLabel}>STUDYFLOW EXPERIENCE THEME</span>
        <ThemeSwitcher onThemeSelect={(t) => onChangeTheme(t as ThemeMode)} />
      </div>

      {/* Theme Mode Selector */}
      <div className={styles.group}>
        <span className={styles.groupLabel}>THEME MODE</span>
        <div className={styles.themeGrid}>
          {/* Light Mode */}
          <button
            type="button"
            className={`${styles.themeCard} ${themeMode === 'light' ? styles.themeCardActive : ''}`}
            onClick={() => handleSelectTheme('light')}
            aria-pressed={themeMode === 'light'}
          >
            <div className={styles.themeCardTop}>
              <div className={styles.themeTitleRow}>
                <span>☀️</span>
                <span className={styles.themeName}>Light {themeMode === 'light' ? '(Active)' : ''}</span>
              </div>
              <span className={themeMode === 'light' ? styles.checkActive : styles.radioInactive}>
                {themeMode === 'light' ? '✓' : ''}
              </span>
            </div>
            <div className={styles.themePreviewLight}>
              <div className={styles.previewBarLight} />
              <div className={styles.previewBlockLight} />
            </div>
          </button>

          {/* Dark OLED Focus */}
          <button
            type="button"
            className={`${styles.themeCard} ${themeMode === 'dark' ? styles.themeCardActive : ''}`}
            onClick={() => handleSelectTheme('dark')}
            aria-pressed={themeMode === 'dark'}
          >
            <div className={styles.themeCardTop}>
              <div className={styles.themeTitleRow}>
                <span>🌙</span>
                <span className={styles.themeName}>Dark (OLED Focus)</span>
              </div>
              <span className={themeMode === 'dark' ? styles.checkActive : styles.radioInactive}>
                {themeMode === 'dark' ? '✓' : ''}
              </span>
            </div>
            <div className={styles.themePreviewDark}>
              <div className={styles.previewBarDark} />
              <div className={styles.previewBlockDark} />
            </div>
          </button>

          {/* System Auto */}
          <button
            type="button"
            className={`${styles.themeCard} ${themeMode === 'system' ? styles.themeCardActive : ''}`}
            onClick={() => handleSelectTheme('system')}
            aria-pressed={themeMode === 'system'}
          >
            <div className={styles.themeCardTop}>
              <div className={styles.themeTitleRow}>
                <span>🖥</span>
                <span className={styles.themeName}>System Auto</span>
              </div>
              <span className={themeMode === 'system' ? styles.checkActive : styles.radioInactive}>
                {themeMode === 'system' ? '✓' : ''}
              </span>
            </div>
            <div className={styles.themePreviewSplit}>
              <div className={styles.previewSplitLight} />
              <div className={styles.previewSplitDark} />
            </div>
          </button>
        </div>
      </div>

      {/* Accent Spectrum */}
      <div className={styles.group}>
        <div className={styles.accentHeader}>
          <div className={styles.accentText}>
            <span className={styles.groupLabel}>ACCENT SPECTRUM</span>
            <p className={styles.subtext}>Calibrates active markers, focus halos, and completion badges.</p>
          </div>
          <div className={styles.colorPills}>
            <button
              type="button"
              className={`${styles.colorDot} ${styles.colorIndigo} ${accentColor === 'indigo' ? styles.dotActive : ''}`}
              onClick={() => onChangeAccent('indigo')}
              aria-label="Indigo accent"
            >
              {accentColor === 'indigo' && <span>✓</span>}
            </button>
            <button
              type="button"
              className={`${styles.colorDot} ${styles.colorViolet} ${accentColor === 'violet' ? styles.dotActive : ''}`}
              onClick={() => onChangeAccent('violet')}
              aria-label="Violet accent"
            >
              {accentColor === 'violet' && <span>✓</span>}
            </button>
            <button
              type="button"
              className={`${styles.colorDot} ${styles.colorCobalt} ${accentColor === 'cobalt' ? styles.dotActive : ''}`}
              onClick={() => onChangeAccent('cobalt')}
              aria-label="Cobalt accent"
            >
              {accentColor === 'cobalt' && <span>✓</span>}
            </button>
            <button
              type="button"
              className={`${styles.colorDot} ${styles.colorOrange} ${accentColor === 'orange' ? styles.dotActive : ''}`}
              onClick={() => onChangeAccent('orange')}
              aria-label="Orange accent"
            >
              {accentColor === 'orange' && <span>✓</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Core Typography Pair Card */}
      <div className={styles.typographyCard}>
        <div className={styles.typographyLeft}>
          <span className={styles.typographyTitle}>Core Typography Pair</span>
          <span className={styles.typographyDesc}>Geist Sans (UI &amp; Prose) + JetBrains Mono (Telemetry &amp; Metrics)</span>
        </div>
        <span className={styles.hardwareBadge}>HARDWARE ACCELERATED</span>
      </div>
    </section>
  );
}
