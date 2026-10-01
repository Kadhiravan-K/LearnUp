'use client';

import React, { useState, useEffect } from 'react';
import { usePlayerShortcuts, PlayerShortcuts, DEFAULT_PLAYER_SHORTCUTS } from '@/lib/hooks/usePlayerShortcuts';
import { useLearnUpTheme } from '@/lib/theme/ThemeProvider';
import { ExtendedThemeId } from '@/lib/theme';
import { useIsPluginEnabled, setPluginStatus, getPluginStatus } from '@/lib/hooks/useIsPluginEnabled';
import { Button } from '@/components/ui/Button/Button';
import styles from './CustomizationSection.module.css';

export interface CustomizationSectionProps {
  onNotify?: (msg: string) => void;
}

interface ThemeOption {
  id: ExtendedThemeId;
  pluginId?: string;
  name: string;
  category: 'core' | 'premium_plugin';
  desc: string;
  badge?: string;
  primaryColor: string;
  bgPreview: string;
  borderPreview: string;
  accentPreview: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    name: 'Daylight Minimal (Light)',
    category: 'core',
    desc: 'Crisp high-readability design with snow white cards and deep slate typography.',
    primaryColor: '#6366F1',
    bgPreview: '#F8FAFC',
    borderPreview: '#E2E8F0',
    accentPreview: '#6366F1'
  },
  {
    id: 'dark',
    name: 'Midnight Void (Dark)',
    category: 'core',
    desc: 'Low-strain OLED dark mode with deep navy slate surfaces and neon indigo accents.',
    primaryColor: '#818CF8',
    bgPreview: '#0B0F19',
    borderPreview: '#1E293B',
    accentPreview: '#818CF8'
  }
];

export function CustomizationSection({ onNotify }: CustomizationSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'player' | 'theme'>('theme');
  const { shortcuts, saveShortcuts, resetShortcuts } = usePlayerShortcuts();
  const { theme, setTheme } = useLearnUpTheme();

  // Check Workspace Customization Studio plugin state
  const isCustomizationPluginEnabled = useIsPluginEnabled('workspace_customization_studio', true);

  // Track enabled state for all plugins
  const [pluginsMap, setPluginsMap] = useState<Record<string, boolean>>({});

  const refreshPluginStatuses = () => {
    const map: Record<string, boolean> = {};
    THEME_OPTIONS.forEach((opt) => {
      if (opt.pluginId) {
        map[opt.pluginId] = getPluginStatus(opt.pluginId, true);
      }
    });
    setPluginsMap(map);
  };

  useEffect(() => {
    refreshPluginStatuses();
    const handleUpdate = () => refreshPluginStatuses();
    window.addEventListener('LearnUp_plugins_updated', handleUpdate);
    return () => window.removeEventListener('LearnUp_plugins_updated', handleUpdate);
  }, []);

  // Media Player Engine Preference
  const [playerEngine, setPlayerEngine] = useState<'custom_player' | 'youtube_native'>('custom_player');
  const [recordingField, setRecordingField] = useState<keyof PlayerShortcuts | null>(null);
  const [localShortcuts, setLocalShortcuts] = useState<PlayerShortcuts>(shortcuts);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Custom Theme & Workspace Studio State
  const [customAccent, setCustomAccent] = useState('#6366F1');
  const [glassIntensity, setGlassIntensity] = useState('modern');
  const [cornerRadius, setCornerRadius] = useState('12px');
  const [fontScale, setFontScale] = useState('100%');
  const [highContrastVideo, setHighContrastVideo] = useState(false);
  const [ambientGlow, setAmbientGlow] = useState(true);

  useEffect(() => {
    try {
      const storedEngine = localStorage.getItem('LearnUp_player_engine');
      if (storedEngine === 'youtube_native' || storedEngine === 'custom_player') {
        setPlayerEngine(storedEngine);
      }
      const storedAccent = localStorage.getItem('LearnUp_custom_accent');
      if (storedAccent) setCustomAccent(storedAccent);
      const storedGlass = localStorage.getItem('LearnUp_glass_intensity');
      if (storedGlass) setGlassIntensity(storedGlass);
      const storedRadius = localStorage.getItem('LearnUp_corner_radius');
      if (storedRadius) setCornerRadius(storedRadius);
      const storedFontScale = localStorage.getItem('LearnUp_font_scale');
      if (storedFontScale) setFontScale(storedFontScale);
      const storedContrast = localStorage.getItem('LearnUp_high_contrast_video');
      if (storedContrast) setHighContrastVideo(storedContrast === 'true');
      const storedGlow = localStorage.getItem('LearnUp_ambient_glow');
      if (storedGlow) setAmbientGlow(storedGlow === 'true');
    } catch {}
  }, []);

  useEffect(() => {
    setLocalShortcuts(shortcuts);
  }, [shortcuts]);

  // Handle shortcut recording
  useEffect(() => {
    if (!recordingField) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let keyName = e.key;
      if (keyName === ' ') keyName = 'Space';
      else if (keyName === 'ArrowLeft') keyName = 'ArrowLeft';
      else if (keyName === 'ArrowRight') keyName = 'ArrowRight';
      else if (keyName === 'ArrowUp') keyName = 'ArrowUp';
      else if (keyName === 'ArrowDown') keyName = 'ArrowDown';

      setLocalShortcuts((prev) => ({
        ...prev,
        [recordingField]: keyName
      }));
      setRecordingField(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [recordingField]);

  const handleSavePlayerConfig = () => {
    saveShortcuts(localShortcuts);
    try {
      localStorage.setItem('LearnUp_player_engine', playerEngine);
    } catch {}
    setSavedSuccess(true);
    if (onNotify) onNotify('Player shortcuts & engine saved successfully!');
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetShortcuts = () => {
    resetShortcuts();
    setLocalShortcuts(DEFAULT_PLAYER_SHORTCUTS);
    if (onNotify) onNotify('Restored default shortcut mappings.');
  };

  const handleToggleThemePlugin = (e: React.MouseEvent, pluginId: string) => {
    e.stopPropagation();
    const currentStatus = pluginsMap[pluginId] ?? true;
    const newStatus = !currentStatus;
    setPluginStatus(pluginId, newStatus);
    refreshPluginStatuses();
    if (onNotify) {
      onNotify(newStatus ? 'Theme plugin enabled.' : 'Theme plugin disabled.');
    }
    // If we just disabled the currently active theme, switch back to light or dark
    if (!newStatus) {
      const activeOpt = THEME_OPTIONS.find((t) => t.id === theme);
      if (activeOpt?.pluginId === pluginId) {
        setTheme('dark');
      }
    }
  };

  const handleSelectTheme = (opt: ThemeOption) => {
    if (opt.pluginId) {
      const isEnabled = pluginsMap[opt.pluginId] ?? true;
      if (!isEnabled) {
        if (onNotify) onNotify(`Please enable the "${opt.name}" plugin first.`);
        return;
      }
    }
    setTheme(opt.id);
    if (onNotify) onNotify(`Activated ${opt.id.toUpperCase()} theme.`);
  };

  const handleSaveThemeConfig = () => {
    try {
      localStorage.setItem('LearnUp_custom_accent', customAccent);
      localStorage.setItem('LearnUp_glass_intensity', glassIntensity);
      localStorage.setItem('LearnUp_corner_radius', cornerRadius);
      localStorage.setItem('LearnUp_font_scale', fontScale);
      localStorage.setItem('LearnUp_high_contrast_video', String(highContrastVideo));
      localStorage.setItem('LearnUp_ambient_glow', String(ambientGlow));

      // Apply CSS variables live
      document.documentElement.style.setProperty('--sf-color-primary', customAccent);
      document.documentElement.style.setProperty('--sf-radius-xl', cornerRadius);
    } catch {}
    setSavedSuccess(true);
    if (onNotify) onNotify('Custom workspace theme applied successfully!');
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const accentPresets = [
    { name: 'Indigo', color: '#6366F1' },
    { name: 'Cyan', color: '#00F0FF' },
    { name: 'Emerald', color: '#10B981' },
    { name: 'Violet', color: '#A855F7' },
    { name: 'Amber', color: '#EAB308' },
    { name: 'Rose', color: '#F43F5E' },
    { name: 'Cobalt', color: '#2563EB' },
    { name: 'Matrix Green', color: '#00FF66' }
  ];

  const shortcutLabels: Record<keyof PlayerShortcuts, string> = {
    togglePlay: 'Play / Pause Video',
    seekBackward: 'Seek Backward 10 Seconds',
    seekForward: 'Seek Forward 10 Seconds',
    speedBoost: '2X Speed Boost Modifier',
    toggleCaptions: 'Toggle Subtitles / CC',
    toggleMute: 'Toggle Audio Mute',
    toggleFullscreen: 'Toggle Fullscreen',
    volumeUp: 'Increase Audio Volume (+5%)',
    volumeDown: 'Decrease Audio Volume (-5%)'
  };

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>Customization Studio</h2>
          <span className={styles.badge}>THEMES &amp; WORKSPACE</span>
        </div>
        <p className={styles.subtitle}>
          Tailor your workspace aesthetic, install premium themes, configure media player gestures, and map custom hotkeys.
        </p>
      </div>

      {/* Sub-tab Navigation */}
      <div className={styles.subTabs}>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'theme' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('theme')}
        >
          <span>🎨</span> Workspace &amp; Custom Themes ({THEME_OPTIONS.length})
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeSubTab === 'player' ? styles.subTabActive : ''}`}
          onClick={() => setActiveSubTab('player')}
        >
          <span>🎬</span> Media Player &amp; Shortcuts
        </button>
      </div>

      {activeSubTab === 'theme' ? (
        <>
          {/* Card 1: Theme Selector Grid */}
          <div className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div>
                <h3 className={styles.cardTitle}>Theme Engine &amp; Modular Plugin Themes</h3>
                <p className={styles.cardSubtitle}>
                  Select from core themes or activate individual theme plugins tailored to your focus environment.
                </p>
              </div>
            </div>

            <div className={styles.themesGrid}>
              {THEME_OPTIONS.map((opt) => {
                const isActive = theme === opt.id;
                const isPlugin = Boolean(opt.pluginId);
                const isPluginEnabled = opt.pluginId ? (pluginsMap[opt.pluginId] ?? true) : true;

                return (
                  <div
                    key={opt.id}
                    className={`${styles.themeCard} ${isActive ? styles.themeCardActive : ''} ${
                      !isPluginEnabled ? styles.themeCardDisabled : ''
                    }`}
                    onClick={() => handleSelectTheme(opt)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${opt.name}`}
                  >
                    <div
                      className={styles.themePreviewBox}
                      style={{
                        background: opt.bgPreview,
                        borderColor: opt.borderPreview
                      }}
                    >
                      <div
                        className={styles.themePreviewSwatch}
                        style={{ backgroundColor: opt.primaryColor }}
                      />
                      <div
                        className={styles.themePreviewSwatchSub}
                        style={{ backgroundColor: opt.accentPreview }}
                      />
                      {isActive && <span className={styles.activeCheck}>✓ ACTIVE</span>}
                    </div>

                    <div className={styles.themeInfo}>
                      <div className={styles.themeHeaderRow}>
                        <span className={styles.themeName}>{opt.name}</span>
                        {opt.badge && <span className={styles.themeBadge}>{opt.badge}</span>}
                      </div>
                      <p className={styles.themeDesc}>{opt.desc}</p>
                    </div>

                    {isPlugin && opt.pluginId && (
                      <div className={styles.themePluginControls}>
                        <span
                          className={`${styles.themePluginStatus} ${
                            isPluginEnabled ? styles.themePluginStatusActive : styles.themePluginStatusDisabled
                          }`}
                        >
                          <span>{isPluginEnabled ? '● Plugin Enabled' : '○ Disabled'}</span>
                        </span>
                        <button
                          type="button"
                          className={styles.themePluginToggleBtn}
                          onClick={(e) => handleToggleThemePlugin(e, opt.pluginId!)}
                          title={isPluginEnabled ? 'Disable this theme plugin' : 'Enable this theme plugin'}
                        >
                          {isPluginEnabled ? 'Turn OFF' : 'Turn ON'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Workspace Customization Studio */}
          {isCustomizationPluginEnabled ? (
            <div className={styles.card}>
              <div className={styles.cardTitleRow}>
                <div>
                  <h3 className={styles.cardTitle}>Workspace Aesthetic Customization</h3>
                  <p className={styles.cardSubtitle}>
                    Fine-tune custom accent colors, glassmorphism intensity, corner radius, and font scaling.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPluginStatus('workspace_customization_studio', false)}
                  title="Disable Workspace Customization Studio Plugin"
                >
                  Turn OFF Plugin
                </Button>
              </div>

              <div className={styles.themeGrid}>
                {/* Primary Accent Picker */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Custom Workspace Primary Accent</label>
                  <div className={styles.colorInputRow}>
                    <input
                      type="color"
                      value={customAccent}
                      onChange={(e) => setCustomAccent(e.target.value)}
                      className={styles.colorPicker}
                      aria-label="Custom accent color picker"
                    />
                    <input
                      type="text"
                      value={customAccent}
                      onChange={(e) => setCustomAccent(e.target.value)}
                      className={styles.hexInput}
                      aria-label="Hex color value"
                    />
                  </div>
                  {/* Preset Pills */}
                  <div className={styles.presetPills}>
                    {accentPresets.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        className={styles.presetPill}
                        onClick={() => setCustomAccent(p.color)}
                        style={{ borderLeftColor: p.color }}
                      >
                        <span className={styles.pillDot} style={{ backgroundColor: p.color }} />
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Glassmorphism Intensity */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Glassmorphism &amp; Frosted HUD Blur</label>
                  <select
                    value={glassIntensity}
                    onChange={(e) => setGlassIntensity(e.target.value)}
                    className={styles.select}
                  >
                    <option value="subtle">Subtle Blur (8px)</option>
                    <option value="modern">Modern Translucent (16px - Default)</option>
                    <option value="deep">Deep Frosted Glass (24px)</option>
                    <option value="solid">Solid Background (No Blur)</option>
                  </select>
                </div>

                {/* Corner Radius Density */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Corner Radius Style</label>
                  <select
                    value={cornerRadius}
                    onChange={(e) => setCornerRadius(e.target.value)}
                    className={styles.select}
                  >
                    <option value="4px">Sharp Engineering (4px)</option>
                    <option value="8px">Balanced Modern (8px)</option>
                    <option value="12px">Smooth Aesthetic (12px - Default)</option>
                    <option value="16px">Organic Soft (16px)</option>
                  </select>
                </div>

                {/* Base Font Scale */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Base UI Font Scale</label>
                  <select
                    value={fontScale}
                    onChange={(e) => setFontScale(e.target.value)}
                    className={styles.select}
                  >
                    <option value="90%">Compact Information Density (90%)</option>
                    <option value="100%">Standard Balanced (100% - Default)</option>
                    <option value="110%">Spacious Readability (110%)</option>
                  </select>
                </div>

                {/* Video High Contrast */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>High-Contrast Video Overlay Assist</label>
                  <select
                    value={highContrastVideo ? 'true' : 'false'}
                    onChange={(e) => setHighContrastVideo(e.target.value === 'true')}
                    className={styles.select}
                  >
                    <option value="false">Standard Dynamic Range (Off)</option>
                    <option value="true">High-Contrast Sharp Highlights (On)</option>
                  </select>
                </div>

                {/* Ambient Glow */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Cinema Mode Spatial Ambient Backglow</label>
                  <select
                    value={ambientGlow ? 'true' : 'false'}
                    onChange={(e) => setAmbientGlow(e.target.value === 'true')}
                    className={styles.select}
                  >
                    <option value="true">Enabled (Adaptive Hue Glow)</option>
                    <option value="false">Disabled (Minimalist Pure Black)</option>
                  </select>
                </div>
              </div>

              <div className={styles.actionFooter}>
                {savedSuccess && (
                  <div className={styles.savedToast}>
                    <span>✓</span> Custom workspace theme applied!
                  </div>
                )}
                <Button size="md" onClick={handleSaveThemeConfig}>
                  Apply Workspace Theme
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.pluginDisabledBanner}>
              <span className={styles.pluginDisabledIcon}>🎨</span>
              <h3 className={styles.pluginDisabledTitle}>Workspace Customization Studio Plugin is Disabled</h3>
              <p className={styles.pluginDisabledDesc}>
                Turn on the Workspace Customization Studio plugin to unlock hex color pickers, multi-tier glassmorphism blur, and border radius styling.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPluginStatus('workspace_customization_studio', true)}
              >
                Turn ON Customization Studio Plugin
              </Button>
            </div>
          )}
        </>
      ) : (
        /* Media Player Engine & Shortcuts */
        <>
          <div className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div>
                <h3 className={styles.cardTitle}>Media Playback Engine</h3>
                <p className={styles.cardSubtitle}>
                  Choose between the custom gesture player or native YouTube embed.
                </p>
              </div>
            </div>

            <div className={styles.engineGrid}>
              <div
                className={`${styles.engineOption} ${playerEngine === 'custom_player' ? styles.engineActive : ''}`}
                onClick={() => setPlayerEngine('custom_player')}
              >
                <div className={styles.engineRadio} />
                <div className={styles.engineDetails}>
                  <span className={styles.engineName}>⚡ Custom Video Player (Recommended)</span>
                  <span className={styles.engineDesc}>
                    Auto device-adaptive HUD, swipe brightness &amp; volume gesture zones, 2X speed hold, transparent glass overlays, and custom hotkeys.
                  </span>
                </div>
              </div>

              <div
                className={`${styles.engineOption} ${playerEngine === 'youtube_native' ? styles.engineActive : ''}`}
                onClick={() => setPlayerEngine('youtube_native')}
              >
                <div className={styles.engineRadio} />
                <div className={styles.engineDetails}>
                  <span className={styles.engineName}>▶️ Standard YouTube Player</span>
                  <span className={styles.engineDesc}>
                    Uses official YouTube default player controls, standard progress bar, and native controls overlay.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div>
                <h3 className={styles.cardTitle}>Custom Player Shortcut Keys</h3>
                <p className={styles.cardSubtitle}>
                  Click &apos;Change Key&apos; on any action, then press any key on your keyboard to map your hotkey.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleResetShortcuts}>
                Restore Defaults
              </Button>
            </div>

            <div className={styles.shortcutTable}>
              {(Object.keys(localShortcuts) as Array<keyof PlayerShortcuts>).map((key) => {
                const isRecording = recordingField === key;
                return (
                  <div key={key} className={styles.shortcutRow}>
                    <span className={styles.shortcutAction}>{shortcutLabels[key] || key}</span>
                    <div className={styles.shortcutInputArea}>
                      <span className={styles.shortcutKeyBadge}>
                        {isRecording ? 'Press any key...' : localShortcuts[key]}
                      </span>
                      <button
                        type="button"
                        className={`${styles.recordBtn} ${isRecording ? styles.recordingActive : ''}`}
                        onClick={() => setRecordingField(isRecording ? null : key)}
                      >
                        {isRecording ? 'Cancel' : 'Change Key'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.actionFooter}>
              {savedSuccess && (
                <div className={styles.savedToast}>
                  <span>✓</span> Player shortcuts saved!
                </div>
              )}
              <Button size="md" onClick={handleSavePlayerConfig}>
                Save Player Shortcuts
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
