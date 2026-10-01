'use client';

import React, { useState } from 'react';
import styles from './rewards.module.css';

interface RewardCredential {
  id: string;
  title: string;
  course: string;
  status: 'unlocked' | 'in-progress' | 'locked';
  xp: number;
  icon: string;
  description: string;
  completionRate: number;
  modulesCompleted: number;
  totalModules: number;
  credentialId?: string;
  unlockedDate?: string;
  sha256Hash?: string;
  estimatedCompletion?: string;
  prerequisite?: string;
}

const INITIAL_REWARDS: RewardCredential[] = [
  {
    id: 'c99-architect',
    title: 'C99 Systems Architect',
    course: 'MIT 6.004: EMBEDDED SYSTEMS & C INTERNALS',
    status: 'unlocked',
    xp: 500,
    icon: '💻',
    description: 'Mastery of memory alignment, low-level pointer arithmetic, inline assembly, and bare-metal register mapping.',
    completionRate: 100,
    modulesCompleted: 8,
    totalModules: 8,
    credentialId: '#SF-C99-8821',
    unlockedDate: 'Oct 14, 2024 • 16:42 UTC',
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: 'consensus-master',
    title: 'Consensus Master',
    course: 'DISTRIBUTED SYSTEMS & RAFT CONSENSUS',
    status: 'unlocked',
    xp: 450,
    icon: '🛡️',
    description: 'Engineered partitioned state machine replication, leader election edge-cases, log compaction, and snapshotting.',
    completionRate: 100,
    modulesCompleted: 6,
    totalModules: 6,
    credentialId: '#SF-RAFT-4402',
    unlockedDate: 'Sep 28, 2024 • 11:15 UTC',
    sha256Hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
  },
  {
    id: 'rtos-hacker',
    title: 'RTOS Kernel Hacker',
    course: 'FREERTOS ARCHITECTURE & REAL-TIME KERNELS',
    status: 'unlocked',
    xp: 600,
    icon: '⚡',
    description: 'Context-switching heuristics, priority inversion mitigation with mutex semaphores, and preemptive task scheduling.',
    completionRate: 100,
    modulesCompleted: 12,
    totalModules: 12,
    credentialId: '#SF-RTOS-1904',
    unlockedDate: 'Aug 19, 2024 • 19:30 UTC',
    sha256Hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
  },
  {
    id: 'bare-metal-arm',
    title: 'Bare-Metal ARM Pioneer',
    course: 'ARM CORTEX-M BARE-METAL DEEP DIVE',
    status: 'in-progress',
    xp: 550,
    icon: '⚙️',
    description: 'Linker scripts from scratch, vector tables, interrupt prioritization, and UART DMA ring buffers.',
    completionRate: 85,
    modulesCompleted: 11,
    totalModules: 13,
    estimatedCompletion: 'Nov 05, 2024',
    prerequisite: 'Locked until 100% module mastery'
  },
  {
    id: 'k8s-specialist',
    title: 'Cloud Native & K8s Specialist',
    course: 'ADVANCED KUBERNETES ARCHITECTURE & OPERATORS',
    status: 'locked',
    xp: 700,
    icon: '🔒',
    description: 'Custom Resource Definitions (CRDs), reconciler loops, eBPF telemetry hooks, and high-availability control planes.',
    completionRate: 15,
    modulesCompleted: 2,
    totalModules: 14,
    prerequisite: 'Pass Adaptive Diagnostic ≥ 90%'
  },
  {
    id: 'llvm-compiler',
    title: 'Compiler Engineer & LLVM',
    course: 'COMPILERS & LLVM IR ARCHITECTURE',
    status: 'locked',
    xp: 800,
    icon: '🔒',
    description: 'Static single assignment (SSA), dead-code elimination passes, register allocation, and target machine code generation.',
    completionRate: 0,
    modulesCompleted: 0,
    totalModules: 10,
    prerequisite: 'Complete Systems Track Phase 3'
  }
];

export default function RewardsPage() {
  const [rewards] = useState<RewardCredential[]>(INITIAL_REWARDS);
  const [filterTab, setFilterTab] = useState<'all' | 'unlocked' | 'in-progress' | 'locked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCert, setSelectedCert] = useState<RewardCredential | null>(null);

  const filteredRewards = rewards.filter((item) => {
    const matchesQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesQuery) return false;

    if (filterTab === 'unlocked') return item.status === 'unlocked';
    if (filterTab === 'in-progress') return item.status === 'in-progress';
    if (filterTab === 'locked') return item.status === 'locked';
    return true;
  });

  const unlockedCount = rewards.filter((r) => r.status === 'unlocked').length;
  const inProgressCount = rewards.filter((r) => r.status === 'in-progress').length;
  const lockedCount = rewards.filter((r) => r.status === 'locked').length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <div className={styles.protocolTag}>
            <span className={styles.protocolDot} />
            <span>CREDENTIAL REGISTRY • PROTOCOL V4.2</span>
          </div>
          <h1 className={styles.title}>Course Rewards & Badges</h1>
          <p className={styles.subtitle}>
            Verifiable credentials, mastery badges, and course completion rewards linked to your curriculum milestones.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setSelectedCert(rewards[0])}
            title="Inspect credential certificate"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Inspect Credential
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                alert('Verifiable transcript link copied to clipboard!');
              }
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Transcript
          </button>
        </div>
      </header>

      {/* Stats Row */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Rewards</span>
            <span className={styles.statIcon}>🎖️</span>
          </div>
          <div className={styles.statMainVal}>12 <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--sf-text-secondary)' }}>Badges Issued</span></div>
          <div className={styles.statSubtext}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>6 Unlocked</span>
            <span>•</span>
            <span>4 Active</span>
            <span>•</span>
            <span>2 Locked</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Verified Certificates</span>
            <span className={styles.statIcon}>📜</span>
          </div>
          <div className={styles.statMainVal}>4 <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--sf-text-secondary)' }}>SHA-256 Signed</span></div>
          <div className={styles.statSubtext}>
            <span style={{ color: '#10b981' }}>Latest: #SF-C99-8821</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Cognitive XP</span>
            <span className={styles.statIcon}>⚡</span>
          </div>
          <div className={styles.statMainVal}>4,850 <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--sf-text-secondary)' }}>PTS</span></div>
          <div className={styles.statSubtext}>
            <span>Level 14 Systems Architect</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>+350 this week</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Next Milestone</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>92%</span>
          </div>
          <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--sf-text-primary)' }}>Bare-Metal Pioneer</div>
          <div className={styles.statSubtext}>2 modules remaining</div>
          <div className={styles.progressBar}>
            <div className={styles.progressBarFill} style={{ width: '92%' }} />
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.filterTabs}>
          <button
            type="button"
            className={`${styles.filterTab} ${filterTab === 'all' ? styles.filterTabActive : ''}`}
            onClick={() => setFilterTab('all')}
          >
            All Rewards <span className={styles.filterTabBadge}>{rewards.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${filterTab === 'unlocked' ? styles.filterTabActive : ''}`}
            onClick={() => setFilterTab('unlocked')}
          >
            Unlocked <span className={styles.filterTabBadge}>{unlockedCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${filterTab === 'in-progress' ? styles.filterTabActive : ''}`}
            onClick={() => setFilterTab('in-progress')}
          >
            In Progress <span className={styles.filterTabBadge}>{inProgressCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${filterTab === 'locked' ? styles.filterTabActive : ''}`}
            onClick={() => setFilterTab('locked')}
          >
            Locked <span className={styles.filterTabBadge}>{lockedCount}</span>
          </button>
        </div>

        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search rewards, courses, or certificates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Rewards Cards Grid */}
      {filteredRewards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--sf-bg-surface)', borderRadius: '12px', border: '1px solid var(--sf-border-subtle)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎖️</div>
          <h3 style={{ margin: '0 0 6px 0', color: 'var(--sf-text-primary)' }}>No rewards found in this category</h3>
          <p style={{ margin: '0 0 16px 0', color: 'var(--sf-text-secondary)', fontSize: '0.875rem' }}>
            Complete courses and pass adaptive diagnostic assessments to unlock verified badges and cryptographically signed certificates.
          </p>
          <button type="button" className={styles.btnPrimary} onClick={() => { setFilterTab('all'); setSearchQuery(''); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {filteredRewards.map((reward) => {
            const isUnlocked = reward.status === 'unlocked';
            const isInProgress = reward.status === 'in-progress';

            return (
              <div key={reward.id} className={styles.rewardCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.rewardIconBox}>{reward.icon}</div>
                  <span
                    className={`${styles.statusBadge} ${
                      isUnlocked ? styles.statusUnlocked : isInProgress ? styles.statusInProgress : styles.statusLocked
                    }`}
                  >
                    {isUnlocked ? `🛡️ Reward Unlocked • ${reward.xp} XP` : isInProgress ? `⏳ In Progress (${reward.completionRate}%)` : `🔒 Complete to unlock`}
                  </span>
                </div>

                <div>
                  <div className={styles.courseCategory}>{reward.course}</div>
                  <h3 className={styles.rewardTitle}>{reward.title}</h3>
                  <p className={styles.rewardDesc}>{reward.description}</p>
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressLabelRow}>
                    <span>Curriculum Completion</span>
                    <strong>{reward.completionRate}% ({reward.modulesCompleted}/{reward.totalModules} Modules)</strong>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressBarFill}
                      style={{
                        width: `${reward.completionRate}%`,
                        background: isUnlocked ? '#10b981' : isInProgress ? '#f59e0b' : '#94a3b8'
                      }}
                    />
                  </div>
                </div>

                {isUnlocked ? (
                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Credential ID</span>
                      <span className={styles.metaVal}>{reward.credentialId}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Unlocked</span>
                      <span className={styles.metaVal}>{reward.unlockedDate?.split('•')[0]}</span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Prerequisite</span>
                      <span className={styles.metaVal}>{reward.prerequisite || 'Course in progress'}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Reward Reward</span>
                      <span className={styles.metaVal} style={{ color: '#6366f1' }}>+{reward.xp} XP</span>
                    </div>
                  </div>
                )}

                <div className={styles.cardActionRow}>
                  {isUnlocked ? (
                    <>
                      <button
                        type="button"
                        className={`${styles.cardActionBtn} ${styles.cardActionBtnPrimary}`}
                        onClick={() => setSelectedCert(reward)}
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Certificate
                      </button>
                      <button
                        type="button"
                        className={styles.cardActionBtn}
                        onClick={() => alert(`Certificate ${reward.credentialId} exported.`)}
                        title="Share / Export"
                      >
                        Export
                      </button>
                    </>
                  ) : isInProgress ? (
                    <button
                      type="button"
                      className={`${styles.cardActionBtn} ${styles.cardActionBtnPrimary}`}
                      onClick={() => alert(`Resuming ${reward.title}...`)}
                    >
                      Continue Course →
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.cardActionBtn}
                      onClick={() => alert(`Starting prerequisite module for ${reward.title}...`)}
                    >
                      Start Prerequisites ▶
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Certificate Modal */}
      {selectedCert && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCert(null)}>
          <div className={styles.certModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.certBorder}>
              <div style={{ fontSize: '2rem' }}>🎓</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6366f1' }}>
                LearnUp Verifiable Credential Registry
              </div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--sf-text-primary)' }}>{selectedCert.title}</h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--sf-text-secondary)' }}>{selectedCert.course}</p>
              
              <div style={{ background: 'var(--sf-bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--sf-border-subtle)', margin: '8px 0', fontSize: '0.75rem', textAlign: 'left' }}>
                <div style={{ marginBottom: '4px' }}><strong>Credential ID:</strong> {selectedCert.credentialId}</div>
                <div style={{ marginBottom: '4px' }}><strong>Issued On:</strong> {selectedCert.unlockedDate}</div>
                <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', color: 'var(--sf-text-muted)' }}>
                  <strong>SHA-256:</strong> {selectedCert.sha256Hash}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className={styles.btnSecondary} onClick={() => setSelectedCert(null)}>
                Close
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  window.print();
                }}
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
