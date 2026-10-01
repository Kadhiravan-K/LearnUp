'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ExtendedThemeId, ThemeContextValue, ThemeDefinition } from './types';
import { DEFAULT_THEME, DARK_THEME, LIGHT_THEME } from './default';

const ALL_DEFINED_THEMES: Record<string, ThemeDefinition> = {
  default: DEFAULT_THEME,
  light: LIGHT_THEME,
  dark: DARK_THEME
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ExtendedThemeId>('default');
  const [resolvedTheme, setResolvedTheme] = useState<ExtendedThemeId>('light');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const applyThemeToDOM = useCallback((targetTheme: ExtendedThemeId) => {
    let effective: ExtendedThemeId = 'light';
    if (targetTheme === 'system') {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      effective = prefersDark ? 'dark' : 'light';
    } else if (targetTheme === 'dark') {
      effective = 'dark';
    } else {
      effective = 'light';
    }

    setResolvedTheme(effective);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', effective);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('LearnUp_theme') as ExtendedThemeId | null;
      const initial = saved === 'dark' ? 'dark' : (saved === 'system' ? 'system' : 'light');
      setThemeState(initial);
      applyThemeToDOM(initial);
    } catch {
      applyThemeToDOM('light');
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(motionQuery.matches);

      const handleMotionChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };
      motionQuery.addEventListener('change', handleMotionChange);

      const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleColorChange = () => {
        const current = localStorage.getItem('LearnUp_theme') as ExtendedThemeId | null;
        if (current === 'system') {
          applyThemeToDOM('system');
        }
      };
      colorSchemeQuery.addEventListener('change', handleColorChange);

      return () => {
        motionQuery.removeEventListener('change', handleMotionChange);
        colorSchemeQuery.removeEventListener('change', handleColorChange);
      };
    }
  }, [applyThemeToDOM]);

  const setTheme = (newTheme: ExtendedThemeId) => {
    const sanitized = newTheme === 'dark' ? 'dark' : (newTheme === 'system' ? 'system' : 'light');
    setThemeState(sanitized);
    try {
      localStorage.setItem('LearnUp_theme', sanitized);
      window.dispatchEvent(new CustomEvent('LearnUp_theme_changed', { detail: sanitized }));
    } catch {
      // Ignore localStorage errors
    }
    applyThemeToDOM(sanitized);
  };

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const currentConfig = resolvedTheme === 'dark' ? DARK_THEME : DEFAULT_THEME;

  const contextValue: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    prefersReducedMotion,
    themeConfig: currentConfig,
    availableThemes: [LIGHT_THEME, DARK_THEME]
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useLearnUpTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'default',
      resolvedTheme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: false,
      prefersReducedMotion: false,
      themeConfig: DEFAULT_THEME,
      availableThemes: [LIGHT_THEME, DARK_THEME]
    };
  }
  return context;
}
