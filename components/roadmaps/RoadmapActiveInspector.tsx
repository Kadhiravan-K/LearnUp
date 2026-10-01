'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { RoadmapTrack, RoadmapNode } from '@/lib/types';
import styles from './RoadmapActiveInspector.module.css';

export interface RoadmapActiveInspectorProps {
  track: RoadmapTrack;
  node: RoadmapNode;
  onLinkCourseSubmit?: (courseTitle: string, isPrerequisite: boolean) => void;
}

export function RoadmapActiveInspector({
  track,
  node,
  onLinkCourseSubmit
}: RoadmapActiveInspectorProps) {
  const [isAttachOpen, setIsAttachOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMandatoryPrereq, setIsMandatoryPrereq] = useState(true);
  const [successToast, setSuccessToast] = useState(false);

  const handleConfirmLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (onLinkCourseSubmit) {
      onLinkCourseSubmit(searchQuery.trim(), isMandatoryPrereq);
    }
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 2500);
    setSearchQuery('');
  };

  const course = node.attached_course;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.inspectorBadge}>
            🔍 ACTIVE INSPECTOR
          </span>
          <span className={styles.nodeCountTag}>
            Node {node.node_number} / 0{track.nodes.length}
          </span>
        </div>

        <h3 className={styles.nodeTitle}>{node.title}</h3>
        <p className={styles.nodeDescription}>
          Currently driving your active study sessions. Attached course is synchronizing telemetry to this roadmap milestone.
        </p>
      </div>

      {/* Active Attached Course Display */}
      {course && (
        <div className={styles.courseCard}>
          <div className={styles.courseHeader}>
            <div className={styles.providerTag}>
              <span>RT</span>
            </div>
            <div className={styles.courseMeta}>
              <div className={styles.courseTitleRow}>
                <h4 className={styles.courseTitle}>{course.title}</h4>
                <span className={styles.activeTag}>Active</span>
              </div>
              <span className={styles.providerName}>Provider: {course.provider || 'LearnUp Library'}</span>
            </div>
          </div>

          <div className={styles.courseProgressRow}>
            <span className={styles.progressLabel}>
              Progress <strong>{course.completed_lectures || 0}/{course.total_lectures || 12} Lectures ({course.progress_percentage}%)</strong>
            </span>
          </div>

          <div className={styles.courseCardFooter}>
            <Link href="/library" className={styles.viewCurriculumLink}>
              View Full Curriculum ›
            </Link>
            {course.runtime_formatted && (
              <span className={styles.runtimeTag}>➔ {course.runtime_formatted}</span>
            )}
          </div>
        </div>
      )}

      {/* Attach Course to Topic Collapsible Section */}
      <div className={styles.attachSection}>
        <button
          type="button"
          className={styles.attachHeaderBtn}
          onClick={() => setIsAttachOpen(!isAttachOpen)}
        >
          <div className={styles.attachHeaderLeft}>
            <span>🔗</span>
            <span className={styles.attachHeaderTitle}>Attach Course to Topic</span>
          </div>
          <span className={styles.collapseIcon}>{isAttachOpen ? '✕' : '▼'}</span>
        </button>

        {isAttachOpen && (
          <form onSubmit={handleConfirmLink} className={styles.attachForm}>
            {successToast && (
              <div className={styles.successToast}>✓ Attached course link confirmed!</div>
            )}

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Search Library / Catalogs</label>
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. ESP32 IoT Production Systems"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Link Target Node</label>
              <select className={styles.select} value={node.id} disabled>
                <option value={node.id}>
                  {node.node_number}. {node.title}
                </option>
              </select>
            </div>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isMandatoryPrereq}
                onChange={(e) => setIsMandatoryPrereq(e.target.checked)}
              />
              <span className={styles.checkboxText}>
                <strong>Prerequisite requirement</strong>
              </span>
              <span className={styles.mandatoryBadge}>Mandatory</span>
            </label>

            <button
              type="submit"
              className={styles.confirmBtn}
              disabled={!searchQuery.trim()}
            >
              <span>🔗</span>
              <span>Confirm Link Attachment</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
