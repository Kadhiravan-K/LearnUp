'use client';

import React from 'react';
import styles from './StreakWidget.module.css';

export interface StreakWidgetProps {
  currentStreak?: number;
  allTimeBest?: number;
  totalStudyDays?: number;
}

export interface StreakWidgetProps {
  currentStreak?: number;
  allTimeBest?: number;
  totalStudyDays?: number;
}

export function StreakWidget({
  currentStreak = 0,
  allTimeBest = 0,
  totalStudyDays = 0
}: StreakWidgetProps) {
  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'Today'];
  const days = dayNames.map((label, idx) => {
    const isToday = idx === 6;
    // Highlight days completed based on current streak count
    const daysFromToday = 6 - idx;
    const completed = currentStreak > daysFromToday;

    return {
      label,
      completed,
      isToday: isToday && currentStreak > 0
    };
  });

  return (
    <section className={styles.widget} aria-label="Study Streak Progress">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span role="img" aria-label="flame">🔥</span>
          <h3 className={styles.title}>{currentStreak}-Day Study Streak</h3>
        </div>
        <span className={styles.topBadge}>{currentStreak > 0 ? 'Active' : 'Get Started'}</span>
      </div>

      <div className={styles.daysRow} role="group" aria-label="Weekly streak days">
        {days.map((day, idx) => (
          <div key={idx} className={styles.dayItem}>
            <div
              className={`${styles.dayCircle} ${
                day.isToday
                  ? styles.dayActive
                  : day.completed
                  ? styles.dayCompleted
                  : styles.dayIncomplete
              }`}
              title={day.isToday ? 'Today (Active)' : day.completed ? 'Completed' : 'Incomplete'}
            >
              {day.isToday ? (
                <span>🔥</span>
              ) : day.completed ? (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                day.label
              )}
            </div>
            <span className={styles.dayLabel}>{day.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.statsRow}>
        <span>Total study days: <strong className={styles.statHighlight}>{totalStudyDays} days</strong></span>
        <span>All-time best: <strong className={styles.statHighlight}>{allTimeBest}d</strong></span>
      </div>

      <div className={styles.levelCard}>
        <div className={styles.levelHeader}>
          <span>🏆 Study Cadence Mastery</span>
          <span>{currentStreak} / 10 days</span>
        </div>
        <div className={styles.levelProgress} role="progressbar" aria-valuenow={Math.min(100, currentStreak * 10)} aria-valuemin={0} aria-valuemax={100}>
          <div className={styles.levelProgressFill} style={{ width: `${Math.min(100, currentStreak * 10)}%` }} />
        </div>
      </div>
    </section>
  );
}

