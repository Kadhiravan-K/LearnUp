'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FocusMode, SoundscapeProfile, FocusStats, PomodoroCycleConfig } from '../types';
import { soundscapeEngine } from '../audio/soundscapes';

export const DEFAULT_POMODORO_CONFIG: PomodoroCycleConfig = {
  focusDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  intervalsBeforeLongBreak: 4,
  autoStartBreaks: true,
  autoStartSprints: false
};

export const MODE_DURATIONS: Record<FocusMode, number> = {
  sprint: 25 * 60,
  deep_block: 50 * 60,
  flow_state: 90 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
  custom: 25 * 60
};

export function useFocusTimer(initialMode: FocusMode = 'sprint') {
  const [pomodoroConfig, setPomodoroConfig] = useState<PomodoroCycleConfig>(DEFAULT_POMODORO_CONFIG);
  const [mode, setMode] = useState<FocusMode>(initialMode);
  const [totalSeconds, setTotalSeconds] = useState<number>(MODE_DURATIONS[initialMode]);
  const [secondsLeft, setSecondsLeft] = useState<number>(MODE_DURATIONS[initialMode]);
  const [timerState, setTimerState] = useState<'ready' | 'running' | 'paused' | 'completed' | 'abandoned'>('ready');
  const [intervalNumber, setIntervalNumber] = useState<number>(1);
  const [soundscape, setSoundscape] = useState<SoundscapeProfile>('binaural_40hz');
  const [soundscapeEnabled, setSoundscapeEnabled] = useState<boolean>(true);
  const [stats, setStats] = useState<FocusStats | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load custom Pomodoro configuration from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('LearnUp_pomodoro_config');
      if (stored) {
        const parsed: PomodoroCycleConfig = JSON.parse(stored);
        setPomodoroConfig(parsed);
        if (initialMode === 'sprint') {
          const secs = parsed.focusDurationMinutes * 60;
          setTotalSeconds(secs);
          setSecondsLeft(secs);
        } else if (initialMode === 'short_break') {
          const secs = parsed.shortBreakMinutes * 60;
          setTotalSeconds(secs);
          setSecondsLeft(secs);
        }
      }
    } catch {}
  }, [initialMode]);

  // Load telemetry stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/focus/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setStats(json.data);
        }
      }
    } catch {
      // Safe fallback
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handle mode change
  const selectMode = (newMode: FocusMode, customSecs?: number) => {
    let duration = customSecs || MODE_DURATIONS[newMode];
    if (!customSecs) {
      if (newMode === 'sprint') duration = pomodoroConfig.focusDurationMinutes * 60;
      else if (newMode === 'short_break') duration = pomodoroConfig.shortBreakMinutes * 60;
      else if (newMode === 'long_break') duration = pomodoroConfig.longBreakMinutes * 60;
    }

    setMode(newMode);
    setTotalSeconds(duration);
    setSecondsLeft(duration);
    setTimerState('ready');
    soundscapeEngine.stop();
  };

  // Soundscape audio synchronization
  useEffect(() => {
    if (timerState === 'running' && soundscapeEnabled && soundscape !== 'silent') {
      soundscapeEngine.start(soundscape);
    } else {
      soundscapeEngine.stop();
    }
    return () => {
      soundscapeEngine.stop();
    };
  }, [timerState, soundscape, soundscapeEnabled]);

  // Log session to backend
  const logSession = useCallback(
    async (completed: boolean) => {
      const durationSpent = totalSeconds - secondsLeft;
      if (durationSpent < 5) return;

      try {
        await fetch('/api/focus/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            duration_seconds: durationSpent,
            mode,
            interval_number: intervalNumber,
            soundscape,
            completed
          })
        });
        fetchStats();
      } catch {
        // Offline safe
      }
    },
    [totalSeconds, secondsLeft, mode, intervalNumber, soundscape, fetchStats]
  );

  // Sync to global broadcast state
  useEffect(() => {
    try {
      const m = Math.floor(secondsLeft / 60);
      const s = secondsLeft % 60;
      const formatted = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      localStorage.setItem(
        'LearnUp_active_focus_state',
        JSON.stringify({
          secondsLeft,
          totalSeconds,
          timerState,
          mode,
          intervalNumber,
          formattedTime: formatted,
          updatedAt: Date.now()
        })
      );
      // Dispatch custom window event for instant local component sync
      window.dispatchEvent(new Event('LearnUp_focus_sync'));
    } catch {}
  }, [secondsLeft, totalSeconds, timerState, mode, intervalNumber]);

  // Handle timer completion and Pomodoro cycle transition
  const handleTimerCompletion = useCallback(() => {
    logSession(true);
    setTimerState('completed');

    if (mode === 'sprint') {
      const nextInterval = intervalNumber + 1;
      setIntervalNumber(nextInterval);
      const isLongBreak = nextInterval % pomodoroConfig.intervalsBeforeLongBreak === 0;
      const nextMode: FocusMode = isLongBreak ? 'long_break' : 'short_break';
      const breakSecs = isLongBreak
        ? pomodoroConfig.longBreakMinutes * 60
        : pomodoroConfig.shortBreakMinutes * 60;

      setMode(nextMode);
      setTotalSeconds(breakSecs);
      setSecondsLeft(breakSecs);
      if (pomodoroConfig.autoStartBreaks) {
        setTimerState('running');
      } else {
        setTimerState('ready');
      }
    } else {
      // Break completed -> back to sprint
      const sprintSecs = pomodoroConfig.focusDurationMinutes * 60;
      setMode('sprint');
      setTotalSeconds(sprintSecs);
      setSecondsLeft(sprintSecs);
      if (pomodoroConfig.autoStartSprints) {
        setTimerState('running');
      } else {
        setTimerState('ready');
      }
    }
  }, [logSession, mode, intervalNumber, pomodoroConfig]);

  // Tick timer
  useEffect(() => {
    if (timerState === 'running') {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            handleTimerCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerState, handleTimerCompletion]);

  const startFocus = () => {
    setTimerState('running');
  };

  const pauseFocus = () => {
    setTimerState('paused');
  };

  const resetClock = useCallback(() => {
    setTimerState('ready');
    setSecondsLeft(totalSeconds);
    soundscapeEngine.stop();
  }, [totalSeconds]);

  const endEarly = useCallback(() => {
    logSession(false);
    setTimerState('abandoned');
    soundscapeEngine.stop();
  }, [logSession]);

  const updatePomodoroConfig = (newConfig: Partial<PomodoroCycleConfig>) => {
    const merged = { ...pomodoroConfig, ...newConfig };
    setPomodoroConfig(merged);
    try {
      localStorage.setItem('LearnUp_pomodoro_config', JSON.stringify(merged));
    } catch {}

    if (mode === 'sprint') {
      const secs = merged.focusDurationMinutes * 60;
      setTotalSeconds(secs);
      if (timerState === 'ready') setSecondsLeft(secs);
    } else if (mode === 'short_break') {
      const secs = merged.shortBreakMinutes * 60;
      setTotalSeconds(secs);
      if (timerState === 'ready') setSecondsLeft(secs);
    } else if (mode === 'long_break') {
      const secs = merged.longBreakMinutes * 60;
      setTotalSeconds(secs);
      if (timerState === 'ready') setSecondsLeft(secs);
    }
  };

  // Keyboard Shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (timerState === 'running') {
          pauseFocus();
        } else if (timerState === 'ready' || timerState === 'paused') {
          startFocus();
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        resetClock();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (timerState === 'running' || timerState === 'paused') {
          endEarly();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timerState, totalSeconds, resetClock, endEarly]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercentage =
    totalSeconds > 0 ? Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100) : 0;

  return {
    mode,
    selectMode,
    totalSeconds,
    secondsLeft,
    timerState,
    setTimerState,
    intervalNumber,
    soundscape,
    setSoundscape,
    soundscapeEnabled,
    setSoundscapeEnabled,
    startFocus,
    pauseFocus,
    resetClock,
    endEarly,
    formattedTime: formatTime(secondsLeft),
    progressPercentage,
    stats,
    pomodoroConfig,
    updatePomodoroConfig
  };
}
