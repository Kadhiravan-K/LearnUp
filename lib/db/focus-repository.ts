import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { logger } from '../logging';
import { FocusSession, FocusStats, FocusMode, SoundscapeProfile } from '../types';

export interface IFocusRepository {
  listByUser(client: SupabaseClient, userId: string, limit?: number): Promise<FocusSession[]>;
  recordSession(
    client: SupabaseClient,
    userId: string,
    session: {
      learningItemId?: string | null;
      youtubeVideoId?: string | null;
      durationSeconds: number;
      mode: FocusMode;
      intervalNumber: number;
      soundscape: SoundscapeProfile;
      completed: boolean;
    }
  ): Promise<FocusSession>;
  getStats(client: SupabaseClient, userId: string): Promise<FocusStats>;
}

export class FocusRepository implements IFocusRepository {
  async listByUser(client: SupabaseClient, userId: string, limit: number = 100): Promise<FocusSession[]> {
    const { data, error } = await client
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to list focus sessions', {
        operation: 'listFocusSessions',
        userId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch focus sessions', 500);
    }
    return (data as FocusSession[]) || [];
  }

  async recordSession(
    client: SupabaseClient,
    userId: string,
    session: {
      learningItemId?: string | null;
      youtubeVideoId?: string | null;
      durationSeconds: number;
      mode: FocusMode;
      intervalNumber: number;
      soundscape: SoundscapeProfile;
      completed: boolean;
    }
  ): Promise<FocusSession> {
    const { data, error } = await client
      .from('focus_sessions')
      .insert({
        user_id: userId,
        learning_item_id: session.learningItemId || null,
        youtube_video_id: session.youtubeVideoId || null,
        duration_seconds: session.durationSeconds,
        mode: session.mode,
        interval_number: session.intervalNumber,
        soundscape: session.soundscape,
        completed: session.completed
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to record focus session', {
        operation: 'recordFocusSession',
        userId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to save focus session', 500);
    }

    return data as FocusSession;
  }

  async getStats(client: SupabaseClient, userId: string): Promise<FocusStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: sessions, error } = await client
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to calculate focus stats', {
        operation: 'getFocusStats',
        userId,
        error: error.message
      });
      throw new AppError('DATABASE_ERROR', 'Failed to compute focus telemetry', 500);
    }

    const allSessions = (sessions as FocusSession[]) || [];
    const todaySessions = allSessions.filter((s) => new Date(s.created_at) >= today && s.completed);

    const todayMinutes = Math.round(
      todaySessions.reduce((acc, s) => acc + s.duration_seconds, 0) / 60
    );

    const morningCutoff = new Date(today);
    morningCutoff.setHours(12, 0, 0, 0);

    const morningMinutes = Math.round(
      todaySessions
        .filter((s) => new Date(s.created_at) < morningCutoff)
        .reduce((acc, s) => acc + s.duration_seconds, 0) / 60
    );

    const currentMinutes = todayMinutes - morningMinutes;
    const targetMinutes = 180; // 3h daily goal
    const goalPercentage = Math.min(100, Math.round((todayMinutes / targetMinutes) * 100));

    const totalIntervals = 6;
    const currentInterval = (todaySessions.length % totalIntervals) + 1;
    const intervalsCompletedList = Array.from({ length: totalIntervals }, (_, i) => i < (todaySessions.length % totalIntervals));

    const nextBreakType = currentInterval >= 4 ? 'long_break' : 'short_break';

    // 7-day heatmap based on real historical dates
    const daysOfWeekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'Today'];
    const heatmapWeek = daysOfWeekLabels.map((day, idx) => {
      const offsetDays = 6 - idx;
      const d = new Date(Date.now() - offsetDays * 86400000).toISOString().split('T')[0];
      const hasActivity = allSessions.some(
        (s) => s.completed && new Date(s.created_at).toISOString().split('T')[0] === d
      );
      return {
        day,
        active: hasActivity,
        intensity: hasActivity ? 1.0 : 0.0
      };
    });

    // Calculate consecutive streak days from historical sessions
    const sessionDates = Array.from(
      new Set(
        allSessions
          .filter((s) => s.completed)
          .map((s) => new Date(s.created_at).toISOString().split('T')[0])
      )
    ).sort().reverse();

    let activeStreakDays = 0;
    if (sessionDates.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      let checkDate = sessionDates[0] === todayStr ? new Date() : sessionDates[0] === yesterday ? new Date(Date.now() - 86400000) : null;
      
      if (checkDate) {
        for (const dateStr of sessionDates) {
          const expectedStr = checkDate.toISOString().split('T')[0];
          if (dateStr === expectedStr) {
            activeStreakDays++;
            checkDate = new Date(checkDate.getTime() - 86400000);
          } else {
            break;
          }
        }
      }
    }

    // Peak sprints in a single day
    const sprintsByDay: Record<string, number> = {};
    allSessions.forEach((s) => {
      if (s.completed) {
        const d = new Date(s.created_at).toISOString().split('T')[0];
        sprintsByDay[d] = (sprintsByDay[d] || 0) + 1;
      }
    });
    const peakSprintsPerDay = Object.values(sprintsByDay).length > 0
      ? Math.max(...Object.values(sprintsByDay))
      : 0;

    const completedSprints = allSessions.filter((s) => s.completed).length;
    const flowRetentionRate = allSessions.length > 0
      ? Number(((completedSprints / allSessions.length) * 100).toFixed(1))
      : 100;

    return {
      todayFocusMinutes: todayMinutes,
      dailyGoalMinutes: targetMinutes,
      morningMinutes,
      currentMinutes,
      targetMinutes,
      goalPercentage,
      currentInterval,
      totalIntervals,
      nextBreakType,
      intervalsCompletedList,
      monthlySprints: completedSprints,
      activeStreakDays,
      heatmapWeek,
      peakSprintsPerDay,
      flowRetentionRate
    };
  }
}

export const focusRepository = new FocusRepository();
