import { SupabaseClient } from '@supabase/supabase-js';
import { LearningItemRepository } from '../db/repository';
import { ProgressRepository } from '../db/progress-repository';
import { FocusRepository } from '../db/focus-repository';
import { NotesRepository } from '../db/notes-repository';
import { BookmarksRepository } from '../db/bookmarks-repository';

export interface UserAnalyticsData {
  totalHours: number;
  totalMinutes: number;
  dailyAverageMinutes: number;
  activeStreakDays: number;
  longestStreakDays: number;
  completedCoursesCount: number;
  inProgressCoursesCount: number;
  totalCoursesCount: number;
  totalLecturesWatched: number;
  totalFocusSessions: number;
  skillDomains: Array<{
    name: string;
    count: number;
    hours: number;
    percentage: number;
    color: string;
  }>;
  consistencyHeatmap: Array<{
    date: string;
    day: string;
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
  }>;
  modalityDistribution: {
    videoMinutes: number;
    focusMinutes: number;
    notesCount: number;
    bookmarksCount: number;
  };
}

export class AnalyticsService {
  private learningRepo = new LearningItemRepository();
  private progressRepo = new ProgressRepository();
  private focusRepo = new FocusRepository();
  private notesRepo = new NotesRepository();
  private bookmarksRepo = new BookmarksRepository();

  async getUserAnalytics(client: SupabaseClient, userId: string): Promise<UserAnalyticsData> {
    const [courses, progressList, focusSessions, notes, bookmarks] = await Promise.all([
      this.learningRepo.listItems(client, userId).catch(() => []),
      this.progressRepo.getLibraryProgress(client, userId).catch(() => []),
      this.focusRepo.listByUser(client, userId, 1000).catch(() => []),
      this.notesRepo.listByUser(client, userId).catch(() => []),
      this.bookmarksRepo.listByUser(client, userId).catch(() => [])
    ]);

    // 1. Total watched seconds from video progress
    const { data: videoProgressRows } = await client
      .from('video_progress')
      .select('*')
      .eq('user_id', userId);

    const videoSeconds = (videoProgressRows || []).reduce(
      (acc: number, r: any) => acc + (r.position_seconds || 0),
      0
    );
    const videoMinutes = Math.round(videoSeconds / 60);

    // 2. Focus session minutes
    const completedFocus = focusSessions.filter((s) => s.completed);
    const focusSeconds = completedFocus.reduce(
      (acc, s) => acc + (s.duration_seconds || 0),
      0
    );
    const focusMinutes = Math.round(focusSeconds / 60);

    const totalMinutes = videoMinutes + focusMinutes;
    const totalHours = Number((totalMinutes / 60).toFixed(1));

    // 3. Activity dates aggregation for Streak calculation
    const allActivityDates = new Set<string>();

    (videoProgressRows || []).forEach((r: any) => {
      if (r.updated_at) allActivityDates.add(new Date(r.updated_at).toISOString().split('T')[0]);
    });
    focusSessions.forEach((s) => {
      if (s.created_at) allActivityDates.add(new Date(s.created_at).toISOString().split('T')[0]);
    });
    notes.forEach((n) => {
      if (n.created_at) allActivityDates.add(new Date(n.created_at).toISOString().split('T')[0]);
    });

    const sortedDates = Array.from(allActivityDates).sort().reverse();

    // Active Streak calculation
    let activeStreakDays = 0;
    if (sortedDates.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let checkDate = sortedDates[0] === todayStr
        ? new Date()
        : sortedDates[0] === yesterdayStr
        ? new Date(Date.now() - 86400000)
        : null;

      if (checkDate) {
        for (const dateStr of sortedDates) {
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

    // Longest Streak calculation
    let longestStreakDays = activeStreakDays;
    let currentStreakCount = 0;
    let lastDate: Date | null = null;

    const ascendingDates = Array.from(allActivityDates).sort();
    for (const dStr of ascendingDates) {
      const curDate = new Date(dStr);
      if (!lastDate) {
        currentStreakCount = 1;
      } else {
        const diffDays = Math.round((curDate.getTime() - lastDate.getTime()) / 86400000);
        if (diffDays === 1) {
          currentStreakCount++;
        } else if (diffDays > 1) {
          currentStreakCount = 1;
        }
      }
      if (currentStreakCount > longestStreakDays) {
        longestStreakDays = currentStreakCount;
      }
      lastDate = curDate;
    }

    const activeDaysCount = allActivityDates.size;
    const dailyAverageMinutes = activeDaysCount > 0 ? Math.round(totalMinutes / activeDaysCount) : 0;

    // 4. Course counts
    const totalCoursesCount = courses.length;
    const completedCoursesCount = progressList.filter((p) => p.is_completed).length;
    const inProgressCoursesCount = progressList.filter((p) => (p.progress_percentage || 0) > 0 && !p.is_completed).length;
    const totalLecturesWatched = (videoProgressRows || []).length;

    // 5. Skill Domains aggregation (Generic across any discipline)
    const domainMap: Record<string, { count: number; hours: number }> = {};
    const DOMAIN_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6', '#14B8A6'];

    courses.forEach((c) => {
      const domain = c.skill_domain || (c.tags && c.tags[0]) || 'General Learning';
      if (!domainMap[domain]) {
        domainMap[domain] = { count: 0, hours: 0 };
      }
      domainMap[domain].count += 1;
      domainMap[domain].hours += Number(((c.total_duration_seconds || 0) / 3600).toFixed(1));
    });

    const skillDomains = Object.entries(domainMap).map(([name, data], idx) => ({
      name,
      count: data.count,
      hours: data.hours,
      percentage: totalCoursesCount > 0 ? Math.round((data.count / totalCoursesCount) * 100) : 0,
      color: DOMAIN_COLORS[idx % DOMAIN_COLORS.length]
    }));

    // 6. Consistency Heatmap (last 365 days / 52 weeks)
    const consistencyHeatmap: Array<{ date: string; day: string; count: number; level: 0 | 1 | 2 | 3 | 4 }> = [];
    const now = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dStr = d.toISOString().split('T')[0];
      const hasActivity = allActivityDates.has(dStr);

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (hasActivity) {
        // Compute count for the day
        const dayFocus = completedFocus.filter((s) => s.created_at.startsWith(dStr)).length;
        const dayVideos = (videoProgressRows || []).filter((r: any) => r.updated_at?.startsWith(dStr)).length;
        const count = dayFocus + dayVideos;
        level = count >= 4 ? 4 : count >= 3 ? 3 : count >= 2 ? 2 : 1;
        consistencyHeatmap.push({ date: dStr, day: d.toLocaleDateString('en-US', { weekday: 'narrow' }), count, level });
      } else {
        consistencyHeatmap.push({ date: dStr, day: d.toLocaleDateString('en-US', { weekday: 'narrow' }), count: 0, level: 0 });
      }
    }

    return {
      totalHours,
      totalMinutes,
      dailyAverageMinutes,
      activeStreakDays,
      longestStreakDays,
      completedCoursesCount,
      inProgressCoursesCount,
      totalCoursesCount,
      totalLecturesWatched,
      totalFocusSessions: completedFocus.length,
      skillDomains,
      consistencyHeatmap,
      modalityDistribution: {
        videoMinutes,
        focusMinutes,
        notesCount: notes.length,
        bookmarksCount: bookmarks.length
      }
    };
  }
}

export const analyticsService = new AnalyticsService();
