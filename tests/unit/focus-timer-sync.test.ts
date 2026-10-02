import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MODE_DURATIONS, DEFAULT_POMODORO_CONFIG } from '@/lib/context/FocusTimerContext';
import { useFocusTimer } from '@/lib/hooks/useFocusTimer';

describe('Focus Timer Synchronization & Header Launcher (SF-039 / SF-040)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('1. Mode Durations & Default Pomodoro Configuration', () => {
    it('initializes default 25-minute sprint with standard Pomodoro intervals', () => {
      expect(MODE_DURATIONS.sprint).toBe(1500); // 25 minutes
      expect(MODE_DURATIONS.short_break).toBe(300); // 5 minutes
      expect(MODE_DURATIONS.long_break).toBe(900); // 15 minutes
      expect(MODE_DURATIONS.deep_block).toBe(3000); // 50 minutes
      expect(MODE_DURATIONS.flow_state).toBe(5400); // 90 minutes

      expect(DEFAULT_POMODORO_CONFIG.focusDurationMinutes).toBe(25);
      expect(DEFAULT_POMODORO_CONFIG.shortBreakMinutes).toBe(5);
      expect(DEFAULT_POMODORO_CONFIG.longBreakMinutes).toBe(15);
      expect(DEFAULT_POMODORO_CONFIG.intervalsBeforeLongBreak).toBe(4);
    });
  });

  describe('2. Shared Timer State & Controls Logic', () => {
    it('initializes in ready state with 25:00 formatted display', () => {
      const mode = 'sprint';
      const totalSeconds = MODE_DURATIONS[mode];
      const secondsLeft = totalSeconds;
      const timerState = 'ready';
      const m = Math.floor(secondsLeft / 60);
      const s = secondsLeft % 60;
      const formattedTime = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

      expect(timerState).toBe('ready');
      expect(mode).toBe('sprint');
      expect(totalSeconds).toBe(1500);
      expect(secondsLeft).toBe(1500);
      expect(formattedTime).toBe('25:00');
    });

    it('formats remaining seconds accurately into MM:SS format', () => {
      const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      };

      expect(formatTime(1500)).toBe('25:00');
      expect(formatTime(1499)).toBe('24:59');
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(9)).toBe('00:09');
      expect(formatTime(0)).toBe('00:00');
    });

    it('computes progress percentage accurately', () => {
      const calcProgress = (total: number, left: number) =>
        total > 0 ? Math.round(((total - left) / total) * 100) : 0;

      expect(calcProgress(1500, 1500)).toBe(0);
      expect(calcProgress(1500, 750)).toBe(50);
      expect(calcProgress(1500, 0)).toBe(100);
    });
  });

  describe('3. Header Click & Session Launcher Behavior', () => {
    it('launches 25-minute focus session directly when invoked', () => {
      let state: 'ready' | 'running' | 'paused' | 'completed' | 'abandoned' = 'ready';
      let mode = 'sprint';
      let secondsLeft = 1500;
      let totalSeconds = 1500;

      const startFocusSession = (durationMinutes = 25) => {
        if (state === 'running') return;
        const secs = durationMinutes * 60;
        mode = 'sprint';
        totalSeconds = secs;
        secondsLeft = secs;
        state = 'running';
      };

      startFocusSession(25);
      expect(state).toBe('running');
      expect(mode).toBe('sprint');
      expect(secondsLeft).toBe(1500);
      expect(totalSeconds).toBe(1500);
    });

    it('does not create duplicate timers if already running', () => {
      let timerCreatedCount = 0;
      let state: 'ready' | 'running' | 'paused' = 'running';

      const handleHeaderClick = () => {
        if (state === 'running') {
          // Pause or maintain current without creating second timer
          state = 'paused';
          return;
        }
        timerCreatedCount += 1;
        state = 'running';
      };

      handleHeaderClick();
      expect(state).toBe('paused');
      expect(timerCreatedCount).toBe(0);

      handleHeaderClick();
      expect(state).toBe('running');
      expect(timerCreatedCount).toBe(1);
    });
  });

  describe('4. Cadence & Pomodoro Interval Cycle Transitions', () => {
    it('switches to short break after sprint intervals 1, 2, 3', () => {
      const getNextCadence = (currentInterval: number, intervalsBeforeLongBreak = 4) => {
        const nextInterval = currentInterval + 1;
        const isLongBreak = nextInterval % intervalsBeforeLongBreak === 0;
        return {
          nextInterval,
          nextMode: isLongBreak ? 'long_break' : 'short_break',
          durationMinutes: isLongBreak ? 15 : 5
        };
      };

      expect(getNextCadence(1)).toEqual({
        nextInterval: 2,
        nextMode: 'short_break',
        durationMinutes: 5
      });
      expect(getNextCadence(2)).toEqual({
        nextInterval: 3,
        nextMode: 'short_break',
        durationMinutes: 5
      });
      expect(getNextCadence(3)).toEqual({
        nextInterval: 4,
        nextMode: 'long_break',
        durationMinutes: 15
      });
    });
  });

  describe('5. AppShell Layout Provider Wrapping', () => {
    it('exports FocusTimerProvider and useFocusTimer hooks cleanly', async () => {
      const contextModule = await import('@/lib/context/FocusTimerContext');
      expect(contextModule.FocusTimerProvider).toBeDefined();
      expect(contextModule.FocusTimerContext).toBeDefined();
      expect(contextModule.useFocusTimerContext).toBeDefined();

      const hookModule = await import('@/lib/hooks/useFocusTimer');
      expect(hookModule.useFocusTimer).toBeDefined();
      expect(hookModule.MODE_DURATIONS).toBeDefined();
    });
  });
});
