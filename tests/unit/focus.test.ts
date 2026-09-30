import { describe, it, expect } from 'vitest';
import { MODE_DURATIONS } from '@/lib/hooks/useFocusTimer';
import { SOUNDSCAPE_OPTIONS } from '@/lib/audio/soundscapes';
import { recordFocusSessionSchema, validateInput } from '@/lib/validation/schemas';
import { FocusRepository } from '@/lib/db/focus-repository';

describe('Focus Sanctuary & Precision Timer System (SF-039)', () => {
  describe('1. Mode Durations & Intervals Invariants', () => {
    it('sets correct duration constants in seconds matching Figma specs', () => {
      expect(MODE_DURATIONS.sprint).toBe(1500); // 25m
      expect(MODE_DURATIONS.deep_block).toBe(3000); // 50m
      expect(MODE_DURATIONS.flow_state).toBe(5400); // 90m
      expect(MODE_DURATIONS.short_break).toBe(300); // 5m
      expect(MODE_DURATIONS.long_break).toBe(900); // 15m
    });
  });

  describe('2. Soundscape Audio Catalog', () => {
    it('exposes all 5 procedural audio presets with metadata', () => {
      expect(SOUNDSCAPE_OPTIONS).toHaveLength(5);
      const ids = SOUNDSCAPE_OPTIONS.map((s) => s.id);
      expect(ids).toEqual(['binaural_40hz', 'rain', 'pink_noise', 'lofi', 'silent']);
    });
  });

  describe('3. Validation Schema for Focus Session Recording', () => {
    it('accepts valid completed focus sprint payload', () => {
      const validPayload = {
        duration_seconds: 1500,
        mode: 'sprint',
        interval_number: 1,
        soundscape: 'binaural_40hz',
        completed: true
      };

      const validated = validateInput(recordFocusSessionSchema, validPayload);
      expect(validated.duration_seconds).toBe(1500);
      expect(validated.mode).toBe('sprint');
      expect(validated.completed).toBe(true);
    });

    it('rejects duration_seconds <= 0', () => {
      const invalidPayload = {
        duration_seconds: 0,
        mode: 'sprint'
      };

      expect(() => validateInput(recordFocusSessionSchema, invalidPayload)).toThrow(
        /Number must be greater than or equal to 1/
      );
    });
  });

  describe('4. Focus Repository Telemetry Calculation', () => {
    it('computes authentic zero telemetry stats when no sessions exist', async () => {
      const repo = new FocusRepository();
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null })
            })
          })
        })
      };

      const stats = await repo.getStats(mockSupabase as any, 'user-123');
      expect(stats.todayFocusMinutes).toBe(0);
      expect(stats.dailyGoalMinutes).toBe(180);
      expect(stats.goalPercentage).toBe(0);
      expect(stats.currentInterval).toBe(1);
      expect(stats.totalIntervals).toBe(6);
      expect(stats.monthlySprints).toBe(0);
      expect(stats.activeStreakDays).toBe(0);
      expect(stats.flowRetentionRate).toBe(100);
      expect(stats.heatmapWeek).toHaveLength(7);
    });

    it('computes dynamic telemetry stats when focus sessions are recorded', async () => {
      const repo = new FocusRepository();
      const todayStr = new Date().toISOString();
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: '1',
                      user_id: 'user-123',
                      duration_seconds: 1500,
                      completed: true,
                      mode: 'sprint',
                      created_at: todayStr
                    },
                    {
                      id: '2',
                      user_id: 'user-123',
                      duration_seconds: 3000,
                      completed: true,
                      mode: 'deep_block',
                      created_at: todayStr
                    }
                  ],
                  error: null
                })
            })
          })
        })
      };

      const stats = await repo.getStats(mockSupabase as any, 'user-123');
      expect(stats.todayFocusMinutes).toBe(75); // (1500 + 3000) / 60
      expect(stats.monthlySprints).toBe(2);
      expect(stats.activeStreakDays).toBe(1);
    });
  });
});
