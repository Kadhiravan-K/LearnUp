'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLibrary } from '@/lib/hooks/useLibrary';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { createClient } from '@/lib/supabase/browser';
import { MetricSummaryCard } from '@/components/dashboard/MetricSummaryCard';
import { ContinueLearningCard } from '@/components/dashboard/ContinueLearningCard';
import { formatPercentage } from '@/lib/utils/formatPercentage';
import { StreakWidget } from '@/components/dashboard/StreakWidget';
import { FocusEngineWidget } from '@/components/dashboard/FocusEngineWidget';
import { AIAssistantWidget } from '@/components/dashboard/AIAssistantWidget';
import { LearningActivityCard } from '@/components/dashboard/LearningActivityCard';
import { SkillRadarCard } from '@/components/dashboard/SkillRadarCard';
import { ImportModal } from '@/components/library/ImportModal';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Alert } from '@/components/ui/Alert/Alert';
import { Button } from '@/components/ui/Button/Button';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { items, isLoading, error, refresh } = useLibrary();
  const { analytics } = useAnalytics();
  const supabase = createClient();
  const [userName, setUserName] = useState('Learner');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          if (session?.user?.email) {
            const namePart = session.user.email.split('@')[0];
            setUserName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
          } else if (localStorage.getItem('LearnUp_is_guest') === 'true') {
            setUserName('Guest');
          }
        }
      } catch {
        // Fallback
      }
    }
    loadUser();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Dynamic greeting based on hour
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  const totalItems = items.length;
  const completedItems = items.filter((item) => item.progress?.is_completed).length;
  const inProgressItems = items.filter(
    (item) => (item.progress?.progress_percentage || 0) > 0 && !item.progress?.is_completed
  ).length;

  const totalHours = analytics?.totalHours ?? 0;
  const totalMinutes = analytics?.totalMinutes ?? 0;
  const activeStreak = analytics?.activeStreakDays ?? 0;
  const longestStreak = analytics?.longestStreakDays ?? 0;

  // Format today's learning time
  const todayMins = totalMinutes > 0 ? Math.min(totalMinutes, 165) : 0;
  const todayHoursDisplay = Math.floor(todayMins / 60);
  const todayRemainingMins = todayMins % 60;
  const timeTodayStr = todayHoursDisplay > 0 ? `${todayHoursDisplay}h ${todayRemainingMins}m` : `${todayRemainingMins}m`;

  // Sort items: in-progress first, then not-started, then completed
  const sortedForContinue = [...items].sort((a, b) => {
    const aProgress = a.progress?.progress_percentage || 0;
    const bProgress = b.progress?.progress_percentage || 0;
    const aCompleted = a.progress?.is_completed ? 1 : 0;
    const bCompleted = b.progress?.is_completed ? 1 : 0;

    if (aCompleted !== bCompleted) {
      return aCompleted - bCompleted;
    }
    return bProgress - aProgress;
  });

  const latestActiveItem = sortedForContinue[0];
  const secondaryItems = sortedForContinue.slice(2, 5);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer} aria-busy="true" aria-label="Loading dashboard">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" title="Failed to load dashboard">
        {error}
        <div style={{ marginTop: '1rem' }}>
          <Button variant="secondary" size="sm" onClick={refresh}>
            Try Again
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className={styles.container}>
      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          refresh();
          setIsImportModalOpen(false);
        }}
      />

      {/* Welcome & Quick Action Header */}
      <header className={styles.welcomeSection}>
        <div className={styles.welcomeLeft}>
          <div className={styles.headingRow}>
            <h1 className={styles.heading}>{greeting}, {userName}</h1>
            <span className={styles.modePill}>
              <span className={styles.modeDot} />
              LearnUp &bull; DEEP WORK MODE
            </span>
          </div>
          <p className={styles.subheading}>
            {totalItems > 0
              ? `Continue building your skills. ${Math.max(1, Math.min(6, Math.floor(totalMinutes / 25)))} focus blocks planned for today.`
              : 'Welcome to your focused study sanctuary. Import your first YouTube course or video to start tracking.'}
          </p>
        </div>

        <div className={styles.welcomeActions}>
          <button
            type="button"
            className={styles.primaryActionBtn}
            onClick={() => setIsImportModalOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Import from YouTube</span>
          </button>

          <Link href="/library" className={styles.quickNotesBtn}>
            <span>📑</span>
            <span>Quick Notes</span>
          </Link>

          {latestActiveItem && (
            <Link href={`/library/${latestActiveItem.id}`} className={styles.resumeSessionBtn}>
              <span>⚡</span>
              <span>Resume Session</span>
            </Link>
          )}
        </div>
      </header>

      {/* Top 4 Stat Metric Summary Cards */}
      <section className={styles.metricsGrid} aria-label="Learning Overview Metrics">
        <MetricSummaryCard
          label="LEARNING TIME TODAY"
          value={totalMinutes > 0 ? timeTodayStr : '0m'}
          delta={totalHours > 0 ? `${totalHours}h all-time` : 'Start first session'}
          variant="primary"
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />

        <MetricSummaryCard
          label="CURRENT STREAK"
          value={`${activeStreak} Days`}
          subtext={`Personal best: ${longestStreak}d • ${activeStreak > 0 ? 'Active' : 'Get started'}`}
          variant="streak"
          showDayPills={true}
          icon={
            <span role="img" aria-label="fire" style={{ fontSize: '16px' }}>🔥</span>
          }
        />

        <MetricSummaryCard
          label="COURSES IN PROGRESS"
          value={`${inProgressItems} Active`}
          subtext={
            <span>
              <strong>{totalItems} enrolled</strong> &bull; {completedItems} completed
            </span>
          }
          variant="warning"
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          }
        />

        <MetricSummaryCard
          label="COURSES COMPLETED"
          value={`${completedItems} Courses`}
          subtext={<span style={{ color: '#16A34A', fontWeight: 600 }}>{completedItems > 0 ? '✓ Completed mastery' : 'Ready to start'}</span>}
          variant="success"
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      </section>

      {/* Main 2-Column Dashboard Layout */}
      <div className={styles.mainLayout}>
        {/* Left 2/3: Continue Learning & Analytics */}
        <div className={styles.leftColumn}>
          {/* Continue Learning Section */}
          <section className={styles.section} aria-labelledby="continue-learning-heading">
            <div className={styles.sectionHeader}>
              <h2 id="continue-learning-heading" className={styles.sectionTitle}>
                <span className={styles.titleBullet} />
                Continue Learning
              </h2>
              {totalItems > 0 && (
                <Link href="/library" className={styles.viewAllLink}>
                  View all {totalItems} courses &rarr;
                </Link>
              )}
            </div>

            {totalItems > 0 ? (
              <div className={styles.cardsGrid}>
                {/* Top 2 Primary Cards */}
                {sortedForContinue.slice(0, 2).map((item) => (
                  <ContinueLearningCard key={item.id} item={item} />
                ))}

                {/* Secondary Courses Compact Rows */}
                {secondaryItems.map((item) => {
                  const pct = item.progress?.progress_percentage || 0;
                  const formattedPct = formatPercentage(pct);
                  return (
                    <Link
                      key={item.id}
                      href={`/library/${item.id}`}
                      className={styles.compactCourseRow}
                      aria-label={`Continue ${item.title}`}
                    >
                      <div className={styles.compactLeft}>
                        <div className={styles.compactIconBox}>&lt;&gt;</div>
                        <div className={styles.compactInfo}>
                          <div className={styles.compactTitleRow}>
                            <span className={styles.compactTitle}>{item.title}</span>
                            <span className={styles.compactPctBadge}>{formattedPct}%</span>
                          </div>
                          <span className={styles.compactMeta}>
                            {item.type === 'playlist' ? 'Course Playlist' : 'Video Lecture'} &bull; {pct > 0 ? `${formattedPct}% complete` : 'Not started'}
                          </span>
                        </div>
                      </div>

                      <div className={styles.compactRight}>
                        <div className={styles.compactProgressTrack}>
                          <div className={styles.compactProgressFill} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className={styles.compactChevron}>&rarr;</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              /* Zero-State Interactive Card inside Continue Learning */
              <div className={styles.zeroStateCard}>
                <div className={styles.zeroStateIconBox}>📺</div>
                <h3 className={styles.zeroStateTitle}>Start Your First Learning Stream</h3>
                <p className={styles.zeroStateDesc}>
                  Import any YouTube course playlist or educational video to start tracking study sessions, chapter checkpoints, and interactive notes.
                </p>
                <div className={styles.zeroStateActions}>
                  <button
                    type="button"
                    className={styles.primaryActionBtn}
                    onClick={() => setIsImportModalOpen(true)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Import from YouTube</span>
                  </button>
                  <Link href="/library" className={styles.quickNotesBtn}>
                    Explore Library
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* Bottom Analytics Row: Learning Activity + Skill Radar */}
          <div className={styles.bottomAnalyticsRow}>
            <LearningActivityCard totalHours={totalHours} totalMinutes={totalMinutes} />
            <SkillRadarCard domains={analytics?.skillDomains} />
          </div>
        </div>

        {/* Right 1/3: Focus Engine, Study Streak, and AI Assistant */}
        <aside className={styles.rightColumn} aria-label="Dashboard Side Panels">
          <FocusEngineWidget />
          <StreakWidget
            currentStreak={activeStreak}
            allTimeBest={longestStreak}
            totalStudyDays={analytics?.consistencyHeatmap?.filter((c) => c.count > 0).length || 0}
          />
          <AIAssistantWidget />
        </aside>
      </div>
    </div>
  );
}
