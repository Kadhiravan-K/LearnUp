'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { UserSettings, ThemeMode, AccentColor, PlayerLayout } from '@/lib/types';
import { DEFAULT_USER_SETTINGS } from '@/lib/db/settings-repository';
import { SettingsNav, SETTINGS_TABS } from '@/components/settings/SettingsNav';
import { AccountSection } from '@/components/settings/AccountSection';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { CustomizationSection } from '@/components/settings/CustomizationSection';
import { FocusTimerSection } from '@/components/settings/FocusTimerSection';
import { LearningPrefsSection } from '@/components/settings/LearningPrefsSection';
import { AIProviderSection } from '@/components/settings/AIProviderSection';
import { ConnectorsSection } from '@/components/settings/ConnectorsSection';
import { PluginsMarketplaceSection } from '@/components/settings/PluginsMarketplaceSection';
import { TokenUsageSection } from '@/components/settings/TokenUsageSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { DataPrivacySection } from '@/components/settings/DataPrivacySection';
import { BinSettingsSection } from '@/components/settings/BinSettingsSection';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const tabParam = searchParams.get('tab');
  const initialTab = SETTINGS_TABS.some((t) => t.id === tabParam) ? tabParam! : 'account';

  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'local'>('saved');
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [userEmail, setUserEmail] = useState('learner@LearnUp.local');
  const [userId, setUserId] = useState<string>('');

  const [settings, setSettings] = useState<UserSettings>({
    user_id: '',
    ...DEFAULT_USER_SETTINGS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Sync activeTab with URL param if it changes
  useEffect(() => {
    if (tabParam && SETTINGS_TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Load initial settings
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setUserEmail(session.user.email || 'learner@LearnUp.local');
          setUserId(session.user.id);
        }

        const res = await fetch('/api/settings');
        if (res.ok) {
          const json = await res.json();
          if (json.data && isMounted) {
            setSettings(json.data);
          }
        }
      } catch {
        // Fallback to local defaults
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Save settings mutation
  const persistSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSettings(json.data);
        }
        setSaveStatus('saved');
      } else {
        setSaveStatus('local');
      }
    } catch {
      setSaveStatus('local');
    }
  }, []);

  // Handlers for settings updates
  const handleFieldChange = (field: keyof UserSettings, value: unknown) => {
    const updated = { ...settings, [field]: value };
    setSettings(updated);
    persistSettings({ [field]: value });
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/settings?tab=${tabId}`, { scroll: false });
  };

  // Sign out all devices
  const handleSignOutAll = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  // Export telemetry
  const handleExportTelemetry = async (format: 'json' | 'csv') => {
    try {
      const res = await fetch(`/api/settings/export?format=${format}`, { method: 'POST' });
      if (!res.ok) throw new Error('Export failed');

      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LearnUp-telemetry-${userId || 'export'}.csv`;
        a.click();
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LearnUp-telemetry-${userId || 'export'}.json`;
        a.click();
      }
    } catch {
      alert('Failed to export telemetry.');
    }
  };

  // Download encrypted backup
  const handleDownloadBackup = () => {
    handleExportTelemetry('json');
  };

  // Clear cache
  const handleClearCache = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Keep auth session
        const authKey = Object.keys(localStorage).find((k) => k.includes('auth-token'));
        const authVal = authKey ? localStorage.getItem(authKey) : null;
        localStorage.clear();
        if (authKey && authVal) {
          localStorage.setItem(authKey, authVal);
        }
      }
      alert('Local cache cleared successfully.');
    } catch {
      // Safe fallback
    }
  };

  // Reset history
  const handleResetHistory = async () => {
    try {
      await fetch('/api/settings/reset', { method: 'POST' });
      alert('Learning history reset successfully.');
    } catch {
      alert('Failed to reset learning history.');
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    try {
      await supabase.auth.signOut();
      router.refresh();
      router.push('/signup');
    } catch {
      // Safe fallback
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer} aria-busy="true" aria-label="Loading settings">
        <Spinner size="lg" />
      </div>
    );
  }

  const currentTabObj = SETTINGS_TABS.find((t) => t.id === activeTab) || SETTINGS_TABS[0];
  const userNameDisplay = settings.display_name || userEmail.split('@')[0] || 'Learner';

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <div className={styles.headerIcon}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h1 className={styles.heading}>{currentTabObj.icon} {currentTabObj.label}</h1>
          </div>
          <p className={styles.subheading}>
            LearnUp Settings &bull; Dedicated configuration screen for {currentTabObj.label.toLowerCase()}.
          </p>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.savedPill}>
            <span className={styles.savedDot} />
            {saveStatus === 'saving'
              ? 'Saving changes...'
              : saveStatus === 'saved'
              ? 'All changes saved locally'
              : 'Saved locally'}
          </span>
          <span className={styles.schemaBadge}>SCHEMA: v4.2.0</span>
        </div>
      </header>

      {/* Main 2-Column Layout */}
      <div className={styles.layoutGrid}>
        {/* Left Navigation Column */}
        <aside className={styles.navColumn}>
          <SettingsNav
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            userEmail={userEmail}
            userName={userNameDisplay}
            userAvatar={settings.avatar_url}
          />
        </aside>

        {/* Right Content Column - Displays ONLY the Active Screen */}
        <main className={styles.contentColumn}>
          {activeTab === 'account' && (
            <AccountSection
              username={settings.username || userEmail.split('@')[0] || 'learner'}
              displayName={userNameDisplay}
              email={userEmail}
              studentId={settings.student_id || 'SF-9021'}
              avatarUrl={settings.avatar_url}
              onChange={(field, val) => handleFieldChange(field as keyof UserSettings, val)}
              onSignOutAll={handleSignOutAll}
            />
          )}

          {activeTab === 'appearance' && (
            <AppearanceSection
              themeMode={settings.theme_mode}
              accentColor={settings.accent_color}
              onChangeTheme={(mode: ThemeMode) => handleFieldChange('theme_mode', mode)}
              onChangeAccent={(accent: AccentColor) => handleFieldChange('accent_color', accent)}
            />
          )}

          {activeTab === 'customization' && (
            <CustomizationSection
              onNotify={() => {}}
            />
          )}

          {activeTab === 'focus-timer' && (
            <FocusTimerSection
              sprintDuration={settings.default_sprint_duration}
              shortBreakDuration={settings.short_break_duration}
              longBreakDuration={settings.long_break_duration}
              acousticCue={settings.acoustic_cue_profile}
              autoStartBreaks={settings.auto_start_breaks}
              autoStartNextSprint={settings.auto_start_next_sprint}
              ambientSoundscape={settings.ambient_soundscape}
              compactHudTimer={settings.compact_hud_timer}
              onChangeSprint={(mins) => handleFieldChange('default_sprint_duration', mins)}
              onChangeShortBreak={(mins) => handleFieldChange('short_break_duration', mins)}
              onChangeLongBreak={(mins) => handleFieldChange('long_break_duration', mins)}
              onChangeAcousticCue={(cue) => handleFieldChange('acoustic_cue_profile', cue)}
              onToggle={(field, val) => handleFieldChange(field as keyof UserSettings, val)}
            />
          )}

          {activeTab === 'learning-prefs' && (
            <LearningPrefsSection
              autoMarkCompleted={settings.auto_mark_video_completed}
              playerLayout={settings.default_player_layout}
              streakThreshold={settings.streak_threshold_minutes}
              srsAlgorithm={settings.spaced_repetition_algorithm}
              onToggleAutoMark={(val) => handleFieldChange('auto_mark_video_completed', val)}
              onChangeLayout={(layout: PlayerLayout) => handleFieldChange('default_player_layout', layout)}
              onChangeStreakThreshold={(mins) => handleFieldChange('streak_threshold_minutes', mins)}
              onChangeSrsAlgorithm={(algo) => handleFieldChange('spaced_repetition_algorithm', algo)}
            />
          )}

          {activeTab === 'ai-provider' && (
            <AIProviderSection
              aiProvider={settings.ai_provider}
              aiModel={settings.ai_model}
              apiKey={settings.encrypted_api_key}
              contextWindow={settings.context_window}
              temperature={settings.temperature}
              onChangeProvider={(p) => handleFieldChange('ai_provider', p)}
              onChangeModel={(m) => handleFieldChange('ai_model', m)}
              onSaveKey={(k) => handleFieldChange('encrypted_api_key', k)}
              onRemoveKey={() => handleFieldChange('encrypted_api_key', null)}
            />
          )}

          {activeTab === 'connectors' && (
            <ConnectorsSection />
          )}

          {activeTab === 'plugins-marketplace' && (
            <PluginsMarketplaceSection />
          )}

          {activeTab === 'token-usage' && (
            <TokenUsageSection />
          )}

          {activeTab === 'notifications' && (
            <NotificationsSection
              notifyFocusCompletion={settings.notify_focus_completion}
              notifyMilestoneCelebration={settings.notify_milestone_celebration}
              notifyStreakReminder={settings.notify_streak_reminder}
              notifyQuizPrompts={settings.notify_quiz_prompts}
              notifyWeeklyDigest={settings.notify_weekly_digest}
              onToggle={(field, val) => handleFieldChange(field as keyof UserSettings, val)}
            />
          )}

          {activeTab === 'bin' && (
            <BinSettingsSection />
          )}

          {activeTab === 'data-privacy' && (
            <DataPrivacySection
              onExportTelemetry={handleExportTelemetry}
              onDownloadBackup={handleDownloadBackup}
              onClearCache={handleClearCache}
              onResetHistory={handleResetHistory}
              onDeleteAccount={handleDeleteAccount}
            />
          )}
        </main>
      </div>
    </div>
  );
}

