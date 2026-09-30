'use client';

import React, { useState } from 'react';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { useLibrary } from '@/lib/hooks/useLibrary';
import { AnalyticsMetricCard } from '@/components/analytics/AnalyticsMetricCard';
import { StudyConsistencyHeatmap } from '@/components/analytics/StudyConsistencyHeatmap';
import { DailyTimeModalityChart } from '@/components/analytics/DailyTimeModalityChart';
import { CurriculumVelocityMatrix } from '@/components/analytics/CurriculumVelocityMatrix';
import { CognitiveLoadVolume } from '@/components/analytics/CognitiveLoadVolume';
import { SkillDomainAllocation } from '@/components/analytics/SkillDomainAllocation';
import { LearningGoalsTrajectory } from '@/components/analytics/LearningGoalsTrajectory';
import { AIKnowledgeDiagnostic } from '@/components/analytics/AIKnowledgeDiagnostic';
import { Button } from '@/components/ui/Button/Button';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import styles from './AnalyticsPage.module.css';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const { analytics, isLoading: isAnalyticsLoading } = useAnalytics();
  const { items } = useLibrary();

  const totalHours = analytics?.totalHours ?? 0;
  const activeStreak = analytics?.activeStreakDays ?? 0;
  const longestStreak = analytics?.longestStreakDays ?? 0;
  const completedCourses = analytics?.completedCoursesCount ?? 0;
  const totalCourses = items.length;
  const inProgressCourses = items.filter((i) => (i.progress?.progress_percentage || 0) > 0 && !i.progress?.is_completed).length;
  const totalLectures = analytics?.totalLecturesWatched ?? 0;
  const totalFocusSessions = analytics?.totalFocusSessions ?? 0;

  const dailyAvgMinutes = analytics?.dailyAverageMinutes ?? 0;
  const dailyAvgHours = Math.floor(dailyAvgMinutes / 60);
  const dailyAvgRemainingMins = dailyAvgMinutes % 60;
  const dailyAvgDisplay = dailyAvgHours > 0 ? `${dailyAvgHours}h ${dailyAvgRemainingMins}m` : `${dailyAvgRemainingMins}m`;

  const curriculumItems = items.map((i) => ({
    id: i.id,
    title: i.title,
    progressPercent: i.progress?.progress_percentage ?? 0,
    totalDurationSeconds: i.total_duration_seconds ?? 0
  }));

  if (isAnalyticsLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.headerSection}>
        <div className={styles.headerLeft}>
          <div className={styles.subBreadcrumb}>
            <span>Workspace</span>
            <span>/</span>
            <span>Analytics &amp; Telemetry</span>
            <span>/</span>
            <span style={{ color: 'var(--sf-color-primary)', fontWeight: 600 }}>
              Learning Performance &amp; Intelligence Hub
            </span>
          </div>

          <div className={styles.titleRow}>
            <h1 className={styles.heading}>Learning Analytics &amp; Intelligence</h1>
            <span className={styles.synthesisPill}>
              <span className={styles.synthesisDot} />
              REAL-TIME SYNTHESIS ACTIVE
            </span>
          </div>

          <p className={styles.subheading}>
            Multi-dimensional telemetry across cognitive effort, curriculum velocity, retention decay, and adaptive goal pacing.
          </p>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.timePills} role="group" aria-label="Time Filter">
            <button
              type="button"
              className={`${styles.timeBtn} ${timeRange === 'today' ? styles.timeBtnActive : ''}`}
              onClick={() => setTimeRange('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`${styles.timeBtn} ${timeRange === 'week' ? styles.timeBtnActive : ''}`}
              onClick={() => setTimeRange('week')}
            >
              This Week
            </button>
            <button
              type="button"
              className={`${styles.timeBtn} ${timeRange === 'month' ? styles.timeBtnActive : ''}`}
              onClick={() => setTimeRange('month')}
            >
              This Month
            </button>
            <button
              type="button"
              className={`${styles.timeBtn} ${timeRange === 'all' ? styles.timeBtnActive : ''}`}
              onClick={() => setTimeRange('all')}
            >
              All Time
            </button>
          </div>

          <button type="button" className={styles.dateRangeBtn}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Telemetry Synchronized</span>
          </button>

          <Button variant="secondary" size="sm">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Telemetry
          </Button>
        </div>
      </header>

      {/* Top 7 Metric Cards Row */}
      <section className={styles.metricsRow} aria-label="Key Performance Indicators">
        <AnalyticsMetricCard
          label="Total Hours"
          value={totalHours.toString()}
          unit="hrs"
          delta={totalHours > 0 ? `Active learning tracked` : `Start first session`}
          subtext="Deep focus & video study"
          icon={
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />

        <AnalyticsMetricCard
          label="Daily Average"
          value={dailyAvgDisplay}
          delta={dailyAvgMinutes > 0 ? `Computed average` : `No activity yet`}
          subtext="Target: 2h 00m"
          icon={
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />

        <AnalyticsMetricCard
          label="Active Streak"
          value={activeStreak.toString()}
          unit="Days"
          delta={activeStreak > 0 ? "● Active streak" : "Start streak today"}
          deltaType={activeStreak > 0 ? "highlight" : "neutral"}
          subtext={activeStreak > 0 ? `${activeStreak} consecutive study days` : "0 consecutive days"}
          icon={<span role="img" aria-label="fire">🔥</span>}
        />

        <AnalyticsMetricCard
          label="Longest Streak"
          value={longestStreak.toString()}
          unit="Days"
          delta="Personal record"
          subtext={longestStreak > 0 ? `${longestStreak} day peak run` : "0 day benchmark"}
          icon={
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="7" />
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
          }
        />

        <AnalyticsMetricCard
          label="Completed"
          value={completedCourses.toString()}
          unit="Courses"
          delta={`${inProgressCourses} in-progress`}
          subtext={`${totalCourses} total enrolled`}
          icon={
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AnalyticsMetricCard
          label="Lectures"
          value={totalLectures.toString()}
          unit="Videos"
          delta={`${Math.round((analytics?.modalityDistribution?.videoMinutes || 0) / 60)} hrs watched`}
          subtext="Video study progress"
          icon={
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          }
        />

        <AnalyticsMetricCard
          label="Focus Sessions"
          value={totalFocusSessions.toString()}
          unit="Sprints"
          delta={totalFocusSessions > 0 ? "Completed sprints" : "0 sprints"}
          subtext="25m standard focus"
          icon={
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </section>

      {/* 52-Week Study Consistency Heatmap */}
      <StudyConsistencyHeatmap
        data={analytics?.consistencyHeatmap}
        activeStreak={activeStreak}
        longestStreak={longestStreak}
        totalSessions={totalFocusSessions}
      />

      {/* 2-Column Row: Modality Distribution + Curriculum Velocity */}
      <div className={styles.twoColRow}>
        <DailyTimeModalityChart modality={analytics?.modalityDistribution} />
        <CurriculumVelocityMatrix items={curriculumItems} />
      </div>

      {/* 2-Column Row: Cognitive Load Volume + Skill Domain Allocation */}
      <div className={styles.twoColRow}>
        <CognitiveLoadVolume totalHours={totalHours} totalSprints={totalFocusSessions} />
        <SkillDomainAllocation domains={analytics?.skillDomains} />
      </div>

      {/* Active Learning Goals & Pacing Trajectory */}
      <LearningGoalsTrajectory
        totalHours={totalHours}
        totalCourses={totalCourses}
        completedCourses={completedCourses}
        totalSprints={totalFocusSessions}
        totalLectures={totalLectures}
      />

      {/* AI Knowledge Diagnostic & Retention Vulnerabilities */}
      <AIKnowledgeDiagnostic totalCourses={totalCourses} totalHours={totalHours} />
    </div>
  );
}

