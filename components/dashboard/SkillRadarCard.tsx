'use client';

import React from 'react';
import styles from './SkillRadarCard.module.css';

export interface SkillRadarCardProps {
  domains?: Array<{ name: string; percentage: number }>;
  overallScore?: number;
}

export function SkillRadarCard({ domains = [], overallScore }: SkillRadarCardProps) {
  // Generic educational mastery dimensions
  const genericAxes = [
    { label: 'Retention', value: 85 },
    { label: 'Focus Depth', value: 80 },
    { label: 'Consistency', value: 75 },
    { label: 'Volume', value: 70 },
    { label: 'Pacing', value: 80 },
    { label: 'Velocity', value: 75 }
  ];

  const axes = domains.length >= 6
    ? domains.slice(0, 6).map((d) => ({ label: d.name, value: d.percentage }))
    : genericAxes;

  const score = overallScore !== undefined
    ? overallScore
    : domains.length > 0
    ? Math.round(domains.reduce((acc, d) => acc + d.percentage, 0) / domains.length)
    : 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Study Dimension Radar</h3>
          <p className={styles.subtitle}>6-dimensional competency graph</p>
        </div>
        <div className={styles.scoreBadge}>
          <div>{score} / 100</div>
          <div style={{ fontSize: '9px', fontWeight: 500 }}>Mastery</div>
        </div>
      </div>

      <div className={styles.radarWrapper}>
        <svg className={styles.radarSvg} viewBox="0 0 200 200" aria-label="Study radar competency chart">
          {/* Concentric hexagonal webs */}
          <polygon points="100,20 169,60 169,140 100,180 31,140 31,60" className={styles.webRing} />
          <polygon points="100,44 148,72 148,128 100,156 52,128 52,72" className={styles.webRing} />
          <polygon points="100,68 128,84 128,116 100,132 72,116 72,84" className={styles.webRing} />

          {/* Axes */}
          <line x1="100" y1="100" x2="100" y2="20" className={styles.webAxis} />
          <line x1="100" y1="100" x2="169" y2="60" className={styles.webAxis} />
          <line x1="100" y1="100" x2="169" y2="140" className={styles.webAxis} />
          <line x1="100" y1="100" x2="100" y2="180" className={styles.webAxis} />
          <line x1="100" y1="100" x2="31" y2="140" className={styles.webAxis} />
          <line x1="100" y1="100" x2="31" y2="60" className={styles.webAxis} />

          {/* Skill Filled Shape */}
          {score > 0 ? (
            <polygon
              points="100,35 155,70 148,125 100,160 45,130 55,75"
              className={styles.skillPolygon}
            />
          ) : (
            <polygon
              points="100,100 100,100 100,100 100,100 100,100 100,100"
              className={styles.skillPolygon}
            />
          )}

          {/* Labels */}
          <text x="100" y="14" className={styles.axisLabel}>{axes[0].label}</text>
          <text x="175" y="58" className={styles.axisLabel} style={{ textAnchor: 'start' }}>{axes[1].label}</text>
          <text x="175" y="146" className={styles.axisLabel} style={{ textAnchor: 'start' }}>{axes[2].label}</text>
          <text x="100" y="196" className={styles.axisLabel}>{axes[3].label}</text>
          <text x="25" y="146" className={styles.axisLabel} style={{ textAnchor: 'end' }}>{axes[4].label}</text>
          <text x="25" y="58" className={styles.axisLabel} style={{ textAnchor: 'end' }}>{axes[5].label}</text>
        </svg>
      </div>

      <div className={styles.footer}>
        <span>Overall Learning Score: <strong>{score} / 100</strong></span>
      </div>
    </div>
  );
}

