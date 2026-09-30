'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFocusTimer } from '@/lib/hooks/useFocusTimer';
import { SOUNDSCAPE_OPTIONS } from '@/lib/audio/soundscapes';
import { FocusMode, SoundscapeProfile, PomodoroCycleConfig } from '@/lib/types';
import { Button } from '@/components/ui/Button/Button';
import styles from './FocusPage.module.css';

export default function FocusPage() {
  const {
    mode,
    selectMode,
    totalSeconds,
    secondsLeft,
    timerState,
    setTimerState,
    intervalNumber,
    soundscape,
    setSoundscape,
    startFocus,
    pauseFocus,
    resetClock,
    endEarly,
    formattedTime,
    stats,
    pomodoroConfig,
    updatePomodoroConfig
  } = useFocusTimer('sprint');

  const [isCustomizingCycle, setIsCustomizingCycle] = useState(false);
  const [localConfig, setLocalConfig] = useState<PomodoroCycleConfig>(pomodoroConfig);

  // Synchronize localConfig with hook config
  React.useEffect(() => {
    setLocalConfig(pomodoroConfig);
  }, [pomodoroConfig]);

  // Math for SVG Circular Dial (Radius 140, Circumference = 2 * PI * 140 ~= 879.64)
  const RADIUS = 140;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset =
    totalSeconds > 0 ? CIRCUMFERENCE * (secondsLeft / totalSeconds) : 0;

  // Real dynamic stats calculation (Starts strictly from zero when no sessions recorded)
  const todayMins = stats?.todayFocusMinutes ?? 0;
  const targetMins = stats?.dailyGoalMinutes || 180;
  const goalPct = stats?.goalPercentage ?? (targetMins > 0 ? Math.round((todayMins / targetMins) * 100) : 0);

  const todayHoursFormatted =
    todayMins === 0
      ? '0h 00m'
      : `${Math.floor(todayMins / 60)}h ${(todayMins % 60).toString().padStart(2, '0')}m`;
  const targetHoursFormatted = `${Math.floor(targetMins / 60)}h ${(targetMins % 60).toString().padStart(2, '0')}m`;

  const totalIntervals = pomodoroConfig.intervalsBeforeLongBreak || 4;
  const currentIntervalDisplay = ((intervalNumber - 1) % totalIntervals) + 1;
  const completedSprintsCount = stats?.monthlySprints ?? 0;
  const activeStreakDays = stats?.activeStreakDays ?? 0;

  const handleSaveCustomCycle = (e: React.FormEvent) => {
    e.preventDefault();
    updatePomodoroConfig(localConfig);
    setIsCustomizingCycle(false);
  };

  return (
    <div className={styles.container}>
      {/* State Inspector & Modes Bar */}
      <div className={styles.stateInspectorBar}>
        <div className={styles.stateInspectorLeft}>
          <span className={styles.stateInspectorLabel}>
            <span className={styles.stateInspectorDot} />
            CADENCE:
          </span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sf-color-text-primary)' }}>
            {mode === 'sprint' ? '⚡ Focus Sprint' : mode === 'short_break' ? '☕ Short Break' : '🌴 Long Break'}
          </span>
        </div>

        {/* Mode presets & Customizer Button */}
        <div className={styles.modesGroup}>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'sprint' ? styles.modeBtnActive : ''}`}
            onClick={() => selectMode('sprint')}
          >
            {pomodoroConfig.focusDurationMinutes}m Sprint
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'short_break' ? styles.modeBtnActive : ''}`}
            onClick={() => selectMode('short_break')}
          >
            {pomodoroConfig.shortBreakMinutes}m Rest
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'long_break' ? styles.modeBtnActive : ''}`}
            onClick={() => selectMode('long_break')}
          >
            {pomodoroConfig.longBreakMinutes}m Long Break
          </button>
          <button
            type="button"
            className={styles.customSettingsBtn}
            onClick={() => setIsCustomizingCycle(true)}
            title="Customize Pomodoro Cycle & Durations"
          >
            <span style={{ fontSize: '12px' }}>⚙️ Edit Cycle</span>
          </button>
        </div>
      </div>

      {/* Main Focus Hero Dial Card */}
      <div className={styles.heroCard}>
        <div className={styles.dialContainer}>
          <svg className={styles.dialSvg} viewBox="0 0 320 320">
            <defs>
              <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>
            {/* Background Track */}
            <circle className={styles.dialTrack} cx="160" cy="160" r={RADIUS} />
            {/* Animated Progress Stroke */}
            <circle
              className={styles.dialFill}
              cx="160"
              cy="160"
              r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>

          <div className={styles.dialCenterContent}>
            <span className={styles.intervalSubLabel}>
              <span className={styles.intervalSubDot} />
              INTERVAL {currentIntervalDisplay.toString().padStart(2, '0')} OF {totalIntervals.toString().padStart(2, '0')}
            </span>
            <span className={styles.digitalTime}>{formattedTime}</span>
            <span className={styles.targetSubLabel}>
              {mode === 'sprint' ? '⚡ DEEP FOCUS' : mode === 'short_break' ? '☕ REFRESH & REST' : '🌴 RESTORATIVE BREAK'}
            </span>
          </div>
        </div>

        {/* Primary Controls */}
        <div className={styles.controlsRow}>
          {timerState === 'running' ? (
            <button
              type="button"
              className={styles.primaryControlBtn}
              onClick={pauseFocus}
            >
              <span>⏸</span> Pause Focus
            </button>
          ) : (
            <button
              type="button"
              className={styles.primaryControlBtn}
              onClick={startFocus}
            >
              <span>▶</span> Start Focus
            </button>
          )}

          <button
            type="button"
            className={styles.secondaryControlBtn}
            onClick={resetClock}
          >
            <span>↺</span> Reset
          </button>

          <button
            type="button"
            className={styles.secondaryControlBtn}
            onClick={endEarly}
          >
            <span>✕</span> End Early
          </button>
        </div>

        {/* Soundscape Ambient Selector */}
        <div className={styles.soundscapeBar}>
          <span className={styles.soundscapeIcon}>🎧</span>
          <span className={styles.soundscapeLabel}>Soundscape:</span>
          <select
            className={styles.soundscapeSelect}
            value={soundscape}
            onChange={(e) => setSoundscape(e.target.value as SoundscapeProfile)}
          >
            {SOUNDSCAPE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
          {soundscape !== 'silent' && timerState === 'running' && (
            <span className={styles.soundscapeDot} title="Live Audio Synthesizer Active" />
          )}
        </div>
      </div>

      {/* 3 Real Telemetry Cards Grid (Pure zero baseline when fresh) */}
      <div className={styles.telemetryGrid}>
        {/* Card 1: Today's Focus Time */}
        <div className={styles.telemetryCard}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardHeaderTitle}>
              <span>🕒</span> TODAY&apos;S FOCUS TIME
            </span>
            <span className={`${styles.cardBadge} ${styles.badgeGreen}`}>
              {goalPct}% Goal
            </span>
          </div>

          <div className={styles.metricMainRow}>
            <span className={styles.bigMetric}>
              {todayHoursFormatted} <span className={styles.bigMetricSub}>/ {targetHoursFormatted}</span>
            </span>
            <span className={styles.metricDelta}>
              {todayMins > 0 ? `+${todayMins}m today` : 'Ready to start'}
            </span>
          </div>

          <div className={styles.segmentedProgressBar}>
            <div
              className={styles.progressSegCurrent}
              style={{ width: `${Math.min(100, goalPct)}%` }}
            />
          </div>

          <div className={styles.progressBreakdown}>
            <span>Today: {todayMins}m</span>
            <span>Target: {targetMins}m</span>
          </div>
        </div>

        {/* Card 2: Sprint Cadence */}
        <div className={styles.telemetryCard}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardHeaderTitle}>
              <span>🎯</span> SPRINT CADENCE
            </span>
            <span className={`${styles.cardBadge} ${styles.badgeMuted}`}>
              Interval {currentIntervalDisplay} of {totalIntervals}
            </span>
          </div>

          <div className={styles.metricMainRow}>
            <span className={styles.bigMetric}>
              {mode === 'sprint' ? `${pomodoroConfig.focusDurationMinutes}m Focus` : `${pomodoroConfig.shortBreakMinutes}m Rest`}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sf-color-primary, #4F46E5)' }}>
              Next: {currentIntervalDisplay >= totalIntervals ? 'Long Break' : 'Rest'}
            </span>
          </div>

          <div className={styles.cadencePillsRow}>
            {Array.from({ length: totalIntervals }, (_, i) => {
              const isDone = i + 1 < currentIntervalDisplay;
              const isCurrent = i + 1 === currentIntervalDisplay;
              return (
                <div
                  key={i}
                  className={`${styles.cadencePill} ${
                    isDone
                      ? styles.cadencePillComplete
                      : isCurrent
                      ? styles.cadencePillActive
                      : ''
                  }`}
                />
              );
            })}
          </div>

          <div className={styles.cadenceTimes}>
            {Array.from({ length: totalIntervals }, (_, i) => (
              <span key={i} style={i + 1 === currentIntervalDisplay ? { color: '#4F46E5', fontWeight: 700 } : undefined}>
                {pomodoroConfig.focusDurationMinutes}m
              </span>
            ))}
          </div>
        </div>

        {/* Card 3: Cognitive Streak */}
        <div className={styles.telemetryCard}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardHeaderTitle}>
              <span>🔥</span> COGNITIVE STREAK
            </span>
            <span className={`${styles.cardBadge} ${styles.badgeOrange}`}>
              🔥 {activeStreakDays} Day{activeStreakDays === 1 ? '' : 's'} Active
            </span>
          </div>

          <div className={styles.metricMainRow}>
            <span className={styles.bigMetric}>
              {completedSprintsCount} Sprint{completedSprintsCount === 1 ? '' : 's'}
            </span>
            <span className={styles.bigMetricSub}>Logged</span>
          </div>

          <div className={styles.heatmapStrip}>
            {(stats?.heatmapWeek || [
              { day: 'M', active: false },
              { day: 'T', active: false },
              { day: 'W', active: false },
              { day: 'T', active: false },
              { day: 'F', active: false },
              { day: 'S', active: false },
              { day: 'Today', active: todayMins > 0 }
            ]).map((d, idx) => (
              <div key={idx} className={styles.heatmapDay}>
                <div
                  className={`${styles.heatmapBlock} ${
                    d.active ? styles.heatmapBlockActive : ''
                  }`}
                />
                <span className={styles.heatmapDayLabel}>{d.day}</span>
              </div>
            ))}
          </div>

          <div className={styles.streakSubStats}>
            <span>Flow Retention: <span className={styles.streakSubValue} style={{ color: '#10B981' }}>{stats?.flowRetentionRate || 100}%</span></span>
          </div>
        </div>
      </div>

      {/* Customize Pomodoro Cycle Modal */}
      {isCustomizingCycle && (
        <div className={styles.modalBackdrop} onClick={() => setIsCustomizingCycle(false)}>
          <div className={styles.cycleModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.cycleModalHeader}>
              <div className={styles.cycleModalIcon}>⏱️</div>
              <div>
                <h3 className={styles.cycleModalTitle}>Customize Pomodoro Cadence</h3>
                <p className={styles.cycleModalSubtitle}>
                  Set customized focus intervals, short rest duration, and long break cycles.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCustomCycle} className={styles.cycleForm}>
              <div className={styles.cycleInputRow}>
                <label className={styles.cycleLabel}>Focus Sprint (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={localConfig.focusDurationMinutes}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      focusDurationMinutes: parseInt(e.target.value, 10) || 25
                    })
                  }
                  className={styles.cycleInput}
                />
              </div>

              <div className={styles.cycleInputRow}>
                <label className={styles.cycleLabel}>Short Rest Break (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={localConfig.shortBreakMinutes}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      shortBreakMinutes: parseInt(e.target.value, 10) || 5
                    })
                  }
                  className={styles.cycleInput}
                />
              </div>

              <div className={styles.cycleInputRow}>
                <label className={styles.cycleLabel}>Long Rest Break (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={localConfig.longBreakMinutes}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      longBreakMinutes: parseInt(e.target.value, 10) || 15
                    })
                  }
                  className={styles.cycleInput}
                />
              </div>

              <div className={styles.cycleInputRow}>
                <label className={styles.cycleLabel}>Intervals in Cycle before Long Break</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={localConfig.intervalsBeforeLongBreak}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      intervalsBeforeLongBreak: parseInt(e.target.value, 10) || 4
                    })
                  }
                  className={styles.cycleInput}
                />
              </div>

              <div className={styles.cycleActions}>
                <Button type="button" variant="ghost" onClick={() => setIsCustomizingCycle(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Cadence
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts HUD Footer */}
      <footer className={styles.hudFooter}>
        <div className={styles.hudShortcuts}>
          <div className={styles.hudItem}>
            <kbd className={styles.hudKey}>Space</kbd>
            <span>Start / Pause</span>
          </div>
          <div className={styles.hudItem}>
            <kbd className={styles.hudKey}>R</kbd>
            <span>Reset Clock</span>
          </div>
          <div className={styles.hudItem}>
            <kbd className={styles.hudKey}>Esc</kbd>
            <span>End Early</span>
          </div>
        </div>

        <div className={styles.hudSyncStatus}>
          <span className={styles.hudSyncDot} />
          <span>Synced across Header &amp; Dashboard</span>
        </div>
      </footer>
    </div>
  );
}
