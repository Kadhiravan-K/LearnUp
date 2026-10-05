'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { RoadmapTrack, RoadmapNode } from '@/lib/types';
import { formatPercentage } from '@/lib/utils/formatPercentage';
import styles from './RoadmapActiveInspector.module.css';

export interface RoadmapActiveInspectorProps {
  track: RoadmapTrack;
  node: RoadmapNode;
  onAttachCourseClick: () => void;
}

export function RoadmapActiveInspector({
  track,
  node,
  onAttachCourseClick
}: RoadmapActiveInspectorProps) {
  const [isAttachOpen, setIsAttachOpen] = useState(true);

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
              Progress <strong>{formatPercentage(course.progress_percentage)}%</strong>
            </span>
          </div>

          <div className={styles.courseCardFooter}>
            <Link href={`/library/${course.id}`} className={styles.viewCurriculumLink}>
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
          <div className={styles.attachForm}>
            <p className={styles.fieldLabel}>Choose an existing course or playlist from your private library.</p>
            <button
              type="button"
              className={styles.confirmBtn}
              onClick={onAttachCourseClick}
            >
              <span>🔗</span>
              <span>{course ? 'Change Linked Course' : 'Select from Library'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
