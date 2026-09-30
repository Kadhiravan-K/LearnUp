'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Alert } from '@/components/ui/Alert/Alert';
import type { RoadmapNode, AttachedCourseData } from '@/lib/types';
import styles from './AttachCourseModal.module.css';

export interface AttachCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: RoadmapNode;
  onSubmit: (nodeId: string, courseData: AttachedCourseData) => Promise<void>;
}

export function AttachCourseModal({ isOpen, onClose, node, onSubmit }: AttachCourseModalProps) {
  const [courseTitle, setCourseTitle] = useState(node.attached_course?.title || node.suggested_course_title || '');
  const [provider, setProvider] = useState(node.attached_course?.provider || 'Embedded Expert IO');
  const [totalLectures, setTotalLectures] = useState(node.attached_course?.total_lectures || 12);
  const [completedLectures, setCompletedLectures] = useState(node.attached_course?.completed_lectures || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) {
      setError('Course title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const pct = Math.min(100, Math.round((completedLectures / Math.max(1, totalLectures)) * 100));
      const courseData: AttachedCourseData = {
        id: `course_${Date.now()}`,
        title: courseTitle.trim(),
        provider: provider.trim(),
        total_lectures: totalLectures,
        completed_lectures: completedLectures,
        progress_percentage: pct,
        runtime_formatted: `${completedLectures} of ${totalLectures} Lectures (${pct}%)`
      };

      await onSubmit(node.id, courseData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to attach course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Attach Course to Node ${node.node_number}: ${node.title}`}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <Alert variant="error">{error}</Alert>}

        <div className={styles.field}>
          <label htmlFor="course-title" className={styles.label}>
            Course / Playlist Title
          </label>
          <input
            id="course-title"
            type="text"
            className={styles.input}
            placeholder="e.g. FreeRTOS Architecture & Real-Time Kernel"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="provider-name" className={styles.label}>
            Educational Provider / Channel
          </label>
          <input
            id="provider-name"
            type="text"
            className={styles.input}
            placeholder="e.g. Embedded Expert IO / MIT OpenCourseWare"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          />
        </div>

        <div className={styles.rowTwo}>
          <div className={styles.field}>
            <label htmlFor="total-lec" className={styles.label}>
              Total Lectures
            </label>
            <input
              id="total-lec"
              type="number"
              min="1"
              max="500"
              className={styles.input}
              value={totalLectures}
              onChange={(e) => setTotalLectures(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="completed-lec" className={styles.label}>
              Completed Lectures
            </label>
            <input
              id="completed-lec"
              type="number"
              min="0"
              max={totalLectures}
              className={styles.input}
              value={completedLectures}
              onChange={(e) => setCompletedLectures(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Confirm Link
          </Button>
        </div>
      </form>
    </Modal>
  );
}
