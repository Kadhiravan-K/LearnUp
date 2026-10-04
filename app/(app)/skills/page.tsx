'use client';

import React, { useState } from 'react';
import styles from './skills.module.css';

interface SkillNode {
  id: string;
  name: string;
  category: 'core' | 'emerging' | 'review' | 'mastered' | 'focus';
  badgeLabel: string;
  mastery: number;
  description: string;
  coursesCount: number;
  completedCoursesCount: number;
  loggedHours: number;
  tags: string[];
  level: number;
  verifiedLemmas: number;
  repetitionCards: number;
  repetitionDue: number;
  nextMilestone: string;
  relatedCourses: Array<{ title: string; progress: number; status: string; hours?: string }>;
  feed: Array<{ text: string; time: string; type: string }>;
}

const INITIAL_SKILLS: SkillNode[] = [];

const INITIAL_TAGS: any[] = [];

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillNode[]>(INITIAL_SKILLS);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('embedded-systems');
  const [activeTab, setActiveTab] = useState<'all' | 'core' | 'emerging' | 'review'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tags, setTags] = useState(INITIAL_TAGS);
  const [newTagInput, setNewTagInput] = useState('');

  // Modals
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<'core' | 'emerging' | 'review' | 'mastered' | 'focus'>('core');

  const selectedSkill = skills.find((s) => s.id === selectedSkillId) || skills[0];

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'core') return skill.category === 'core' || skill.category === 'mastered';
    if (activeTab === 'emerging') return skill.category === 'emerging' || skill.category === 'focus';
    if (activeTab === 'review') return skill.category === 'review';
    return true;
  });

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const newSkill: SkillNode = {
      id: newSkillName.toLowerCase().replace(/\s+/g, '-'),
      name: newSkillName.trim(),
      category: newSkillCategory,
      badgeLabel: newSkillCategory === 'core' ? 'Core Node' : newSkillCategory === 'emerging' ? 'Emerging' : 'Custom Node',
      mastery: 10,
      description: newSkillDesc.trim() || 'Custom domain competency track.',
      coursesCount: 1,
      completedCoursesCount: 0,
      loggedHours: 0,
      tags: ['#custom', '#learning'],
      level: 1,
      verifiedLemmas: 1,
      repetitionCards: 5,
      repetitionDue: 0,
      nextMilestone: 'Level 1 Fundamentals (25%)',
      relatedCourses: [],
      feed: [{ text: 'Created competency node', time: 'Just now', type: 'created' }]
    };

    setSkills((prev) => [newSkill, ...prev]);
    setSelectedSkillId(newSkill.id);
    setIsAddSkillOpen(false);
    setNewSkillName('');
    setNewSkillDesc('');
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newTagInput.startsWith('#') ? newTagInput.trim() : `#${newTagInput.trim()}`;
    if (cleanTag.length > 1 && !tags.some((t) => t.name.toLowerCase() === cleanTag.toLowerCase())) {
      setTags((prev) => [...prev, { name: cleanTag, count: 1, color: '#6366f1' }]);
      setNewTagInput('');
    }
  };

  const handleExportGraph = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(skills, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "LearnUp-skills-taxonomy.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <span>Workspace</span>
            <span>/</span>
            <span>My Learning</span>
            <span>/</span>
            <span className={styles.breadcrumbCurrent}>Skills & Taxonomy</span>
          </div>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>My Skills & Competency Matrix</h1>
            <span className={styles.versionBadge}>Taxonomy v3.1</span>
          </div>
          <p className={styles.subtitle}>
            Quantified mastery across technical proficiencies, tracked verification hours, spaced repetition retention, and system-wide curriculum taxonomy.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.btnSecondary} onClick={handleExportGraph} title="Export skills graph in JSON">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export Graph
          </button>
          <button type="button" className={styles.btnSecondary} onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Manage Labels {tags.length}
          </button>
          <button type="button" className={styles.btnPrimary} onClick={() => setIsAddSkillOpen(true)}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add New Skill
          </button>
        </div>
      </header>

      {/* Top 4 Stat Metrics */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statLabel}>Total Skills Tracked</span>
            <span className={styles.statIconBadge}>⚙️</span>
          </div>
          <div className={styles.statValueRow}>
            <span className={styles.statValue}>{skills.length}</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--sf-text-secondary)' }}>Active Nodes</span>
          </div>
          <div className={styles.statSubtext}>
            <span>6 Core</span>
            <span>•</span>
            <span>12 Sub-skills</span>
            <span>•</span>
            <span className={styles.statSubHighlight}>100% Synced</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statLabel}>Total Learning Hours</span>
            <span className={styles.statIconBadge}>⏱️</span>
          </div>
          <div className={styles.statValueRow}>
            <span className={styles.statValue}>142.5</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--sf-text-secondary)' }}>hrs</span>
          </div>
          <div className={styles.statSubtext}>
            <span className={styles.statSubHighlight}>↗ +14.8h</span>
            <span>logged this cycle</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statLabel}>Average Mastery</span>
            <span className={styles.statIconBadge}>🛡️</span>
          </div>
          <div className={styles.statValueRow}>
            <span className={styles.statValue}>68.4%</span>
            <span className={styles.statDelta}>+4.2%</span>
          </div>
          <div className={styles.statSubtext}>
            <span>Targeting 80% competency threshold</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statLabel}>Active Roadmaps</span>
            <span className={styles.statIconBadge}>🧭</span>
          </div>
          <div className={styles.statValueRow}>
            <span className={styles.statValue}>4</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--sf-text-secondary)' }}>Pipelines Bound</span>
          </div>
          <div className={styles.statSubtext}>
            <span>Cortex-M • Rust Core • IoT Stack</span>
          </div>
        </div>
      </section>

      {/* Main 2-Column Matrix View */}
      <div className={styles.mainLayout}>
        {/* Left Column: Filter tabs, Search & Cards List */}
        <div className={styles.skillsLeftPane}>
          <div className={styles.controlsBar}>
            <div className={styles.tabsRow}>
              <div className={styles.tabsGroup}>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All Skills <span className={styles.tabBadge}>{skills.length}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${activeTab === 'core' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('core')}
                >
                  Core Competencies <span className={styles.tabBadge}>6</span>
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${activeTab === 'emerging' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('emerging')}
                >
                  Emerging <span className={styles.tabBadge}>4</span>
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${activeTab === 'review' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('review')}
                >
                  Needs Review
                </button>
              </div>
            </div>

            <div className={styles.searchBarWrapper}>
              <svg className={styles.searchIcon} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Filter skills (e.g. Embedded, Python, RTOS, C99)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <span className={styles.countIndicator}>{filteredSkills.length} Nodes</span>
            </div>
          </div>

          <div className={styles.cardsList}>
            {filteredSkills.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--sf-bg-surface)", borderRadius: "12px", border: "1px solid var(--sf-border-subtle)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🎯</div>
                <h3 style={{ margin: "0 0 6px 0", color: "var(--sf-text-primary)" }}>No skills found</h3>
                <p style={{ margin: 0, color: "var(--sf-text-secondary)", fontSize: "0.875rem" }}>You have not added any skills yet.</p>
              </div>
            ) : (
              filteredSkills.map((skill) => {
              const isSelected = skill.id === selectedSkillId;
              let badgeClass = styles.badgeCore;
              if (skill.category === 'emerging') badgeClass = styles.badgeEmerging;
              if (skill.category === 'review') badgeClass = styles.badgeReview;
              if (skill.category === 'mastered') badgeClass = styles.badgeMastered;

              return (
                <div
                  key={skill.id}
                  className={`${styles.skillCard} ${isSelected ? styles.skillCardSelected : ''}`}
                  onClick={() => setSelectedSkillId(skill.id)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedSkillId(skill.id); }}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitleSection}>
                      <div className={styles.skillIconBox}>
                        {skill.category === 'core' ? '💻' : skill.category === 'emerging' ? '📡' : skill.category === 'mastered' ? '⚡' : '⚙️'}
                      </div>
                      <div>
                        <div className={styles.skillNameRow}>
                          <h3 className={styles.skillName}>{skill.name}</h3>
                          <span className={`${styles.badgeTag} ${badgeClass}`}>{skill.badgeLabel}</span>
                          {isSelected && <span className={`${styles.badgeTag} ${styles.badgeSelected}`}>SELECTED</span>}
                        </div>
                        <p className={styles.skillDescription}>{skill.description}</p>
                      </div>
                    </div>

                    <div className={styles.masteryScore}>
                      <div className={styles.masteryPercent}>{skill.mastery}%</div>
                      <div className={styles.masteryLabel}>Mastery</div>
                    </div>
                  </div>

                  <div className={styles.metricsRow}>
                    <span className={styles.metricItem}>
                      Courses: <strong>{skill.coursesCount} Total</strong> ({skill.completedCoursesCount} Done)
                    </span>
                    <span className={styles.metricItem}>
                      Logged Effort: <strong>{skill.loggedHours} hrs</strong>
                    </span>
                  </div>

                  <div className={styles.progressBarContainer}>
                    <div className={styles.progressBarFill} style={{ width: `${skill.mastery}%` }} />
                  </div>

                  <div className={styles.tagsRow}>
                    <div className={styles.tagsList}>
                      {skill.tags.map((t) => (
                        <span key={t} className={styles.tagPill}>{t}</span>
                      ))}
                    </div>
                    <span className={styles.activityMeta}>⏱️ Active node</span>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

        {/* Right Column: Node Inspector */}
        {selectedSkill ? (
          <aside className={styles.inspectorPane} aria-label="Skill Node Inspector">
          <div className={styles.inspectorHeader}>
            <div className={styles.inspectorTitleRow}>
              <div className={styles.skillIconBox}>⚙️</div>
              <div>
                <span className={styles.inspectorSubhead}>Node Inspector • Active</span>
                <h2 className={styles.inspectorTitle}>{selectedSkill.name}</h2>
              </div>
            </div>
          </div>

          <div className={styles.tierBanner}>
            <div className={styles.tierProgress}>
              <span>Proficient • Level {selectedSkill.level}</span>
              <span style={{ color: '#10b981' }}>{selectedSkill.mastery}% Mastered</span>
            </div>
            <div className={styles.tierDetail}>Next Milestone: {selectedSkill.nextMilestone}</div>
          </div>

          <div className={styles.inspectorMetricsGrid}>
            <div className={styles.inspectorMetricBox}>
              <div className={styles.inspectorMetricLabel}>
                <span>Total Hours</span>
                <span>⏱️</span>
              </div>
              <div className={styles.inspectorMetricVal}>{selectedSkill.loggedHours}h</div>
              <div className={styles.inspectorMetricNote}>+2.5h this week</div>
            </div>

            <div className={styles.inspectorMetricBox}>
              <div className={styles.inspectorMetricLabel}>
                <span>Courses Bound</span>
                <span>📚</span>
              </div>
              <div className={styles.inspectorMetricVal}>{selectedSkill.coursesCount} Courses</div>
              <div className={styles.inspectorMetricNote}>{selectedSkill.completedCoursesCount} Certified 100%</div>
            </div>

            <div className={styles.inspectorMetricBox}>
              <div className={styles.inspectorMetricLabel}>
                <span>Verified Lemmas</span>
                <span>📋</span>
              </div>
              <div className={styles.inspectorMetricVal}>{selectedSkill.verifiedLemmas} Nodes</div>
              <div className={styles.inspectorMetricNote}>All passed</div>
            </div>

            <div className={styles.inspectorMetricBox}>
              <div className={styles.inspectorMetricLabel}>
                <span>Repetition Deck</span>
                <span>🎴</span>
              </div>
              <div className={styles.inspectorMetricVal}>{selectedSkill.repetitionCards} Cards</div>
              <div className={styles.inspectorMetricNote}>{selectedSkill.repetitionDue} due today</div>
            </div>
          </div>

          <button type="button" className={styles.attachCourseBtn} onClick={() => alert(`Bound ${selectedSkill.name} to active syllabus tracks.`)}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
            </svg>
            Attach Course
          </button>

          <div>
            <div className={styles.sectionHeader}>
              <span>Related Courses</span>
              <span>{selectedSkill.relatedCourses.length} Total</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {selectedSkill.relatedCourses.map((rc) => (
                <div key={rc.title} className={styles.courseItem}>
                  <div>
                    <div className={styles.courseItemTitle}>{rc.title}</div>
                    <div className={styles.courseItemMeta}>{rc.status} • {rc.progress}%</div>
                  </div>
                  {rc.progress === 100 ? (
                    <span style={{ color: '#10b981', fontWeight: 600 }}>✓</span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--sf-accent-primary)' }}>{rc.hours}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className={styles.sectionHeader}>
              <span>Node Telemetry Stream</span>
              <span style={{ color: '#10b981', fontSize: '0.6875rem' }}>LIVE FEED</span>
            </div>
            <div className={styles.feedList} style={{ marginTop: '8px' }}>
              {selectedSkill.feed.map((item, idx) => (
                <div key={idx} className={styles.feedItem}>
                  <div className={styles.feedDot} />
                  <div>
                    <div style={{ color: 'var(--sf-text-primary)', fontWeight: 500 }}>{item.text}</div>
                    <div style={{ color: 'var(--sf-text-secondary)', fontSize: '0.6875rem' }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </aside>
        ) : (
          <aside className={styles.inspectorPane}>
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--sf-text-muted)" }}>
              Select or create a skill node to view telemetry.
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Section: Taxonomy & Labels Manager */}
      <section className={styles.taxonomyManager}>
        <div className={styles.managerHeader}>
          <div className={styles.managerTitle}>
            <span>🏷️</span>
            <span>Taxonomy & Labels Manager</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--sf-text-secondary)', fontWeight: 400 }}>({tags.length} Active Tags)</span>
          </div>

          <form onSubmit={handleAddTag} className={styles.newTagInputRow}>
            <input
              type="text"
              placeholder="New label..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              className={styles.newTagInput}
            />
            <button type="submit" className={styles.btnPrimary} style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>
              Add
            </button>
          </form>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--sf-text-secondary)', margin: 0 }}>
          Create, rename, color-code, and audit system-wide tags across courses, skills, and flashcard decks.
        </p>

        <div className={styles.tagGrid}>
          {tags.map((tag) => (
            <div key={tag.name} className={styles.tagCard}>
              <div className={styles.tagCardName}>
                <span className={styles.tagDot} style={{ background: tag.color }} />
                <span>{tag.name}</span>
              </div>
              <span className={styles.tagCardMeta}>{tag.count} linked items</span>
            </div>
          ))}
        </div>
      </section>

      {/* Modal: Add New Skill */}
      {isAddSkillOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddSkillOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--sf-text-primary)' }}>Add New Competency Node</h3>
            <form onSubmit={handleAddSkill} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Skill Name</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Consensus (Raft)"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className={styles.formInput}
                  autoFocus
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value as any)}
                  className={styles.formInput}
                >
                  <option value="core">Core Competency</option>
                  <option value="emerging">Emerging Skill</option>
                  <option value="review">Needs Review</option>
                  <option value="mastered">Mastered</option>
                  <option value="focus">Needs Focus</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <input
                  type="text"
                  placeholder="Summary of domain requirements and key focus"
                  value={newSkillDesc}
                  onChange={(e) => setNewSkillDesc(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsAddSkillOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Save Skill Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
