'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ExtendedThemeId, ThemeContextValue, ThemeDefinition } from './types';
import { DEFAULT_THEME, DARK_THEME, LIGHT_THEME } from './default';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ExtendedThemeId>('light');
  const [resolvedTheme, setResolvedTheme] = useState<ExtendedThemeId>('light');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const applyThemeToDOM = useCallback((targetTheme: ExtendedThemeId) => {
    const effective: ExtendedThemeId = targetTheme === 'dark' ? 'dark' : 'light';

    setResolvedTheme(effective);
    if (typeof document !== 'undefined') {
      document.documentElement.style.removeProperty('--sf-color-primary');
      document.documentElement.setAttribute('data-theme', effective);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('LearnUp_theme') as ExtendedThemeId | null;
      const initial: ExtendedThemeId = saved === 'dark' ? 'dark' : 'light';
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

      return () => {
        motionQuery.removeEventListener('change', handleMotionChange);
      };
    }
  }, [applyThemeToDOM]);

  const setTheme = (newTheme: ExtendedThemeId) => {
    const sanitized: ExtendedThemeId = newTheme === 'dark' ? 'dark' : 'light';
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

  const currentConfig = resolvedTheme === 'dark' ? DARK_THEME : LIGHT_THEME;

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
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: false,
      prefersReducedMotion: false,
      themeConfig: LIGHT_THEME,
      availableThemes: [LIGHT_THEME, DARK_THEME]
    };
  }
  return context;
}
