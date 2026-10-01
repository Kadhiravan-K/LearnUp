'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CoursePreviewData } from '@/lib/types';
import { isValidYouTubeUrl } from '@/lib/utils/url';
import { createClient } from '@/lib/supabase/browser';
import { ActionableError } from '@/components/ui/ActionableError/ActionableError';
import styles from './AddCourseModal.module.css';

export interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (courseId?: string) => void;
}

export function AddCourseModal({ isOpen, onClose, onSuccess }: AddCourseModalProps) {
  // Source type & step state
  const [sourceType, setSourceType] = useState<'video' | 'playlist'>('playlist');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [url, setUrl] = useState('');
  
  // Loading and feedback states
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Preview & Metadata form state
  const [previewData, setPreviewData] = useState<CoursePreviewData | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [courseName, setCourseName] = useState('');
  const [description, setDescription] = useState('');
  const [skillDomain, setSkillDomain] = useState('General Studies');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [customThumbnail, setCustomThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setErrorCode(null);
      if (!previewData) {
        setCurrentStep(1);
      }
    }
  }, [isOpen, previewData]);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch live preview from API with active session header
  const handleFetchPreview = async () => {
    setError(null);
    setErrorCode(null);
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Please provide a valid YouTube URL.');
      setErrorCode('VALIDATION_ERROR');
      return;
    }

    if (!isValidYouTubeUrl(trimmedUrl)) {
      setError('Please enter a valid YouTube video or playlist URL.');
      setErrorCode('VALIDATION_ERROR');
      return;
    }

    setIsPreviewLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else if (typeof window !== 'undefined' && (localStorage.getItem('LearnUp_is_guest') === 'true' || localStorage.getItem('LearnUp_guest_mode') === 'true')) {
        headers['Authorization'] = 'Bearer guest-session';
      }

      const res = await fetch('/api/learning-items/preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: trimmedUrl })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setPreviewData(json.data);
          setCourseName(json.data.title);
          setDescription(json.data.description || '');
          setSkillDomain(json.data.skillDomain || 'Systems Architecture');
          setTags(json.data.tags || []);
          setSelectedVideoIds(json.data.videos.map((v: { videoId: string }) => v.videoId));
          setIsConfirmed(true);
          setCurrentStep(3);
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error?.message || 'Could not fetch preview for this URL. Please check the link and try again.');
        setErrorCode(errJson.error?.code || 'FETCH_ERROR');
      }
    } catch {
      setError('Network error while fetching preview. Please verify your connection.');
      setErrorCode('NETWORK_ERROR');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Toggle video selection
  const handleToggleVideo = (videoId: string) => {
    if (selectedVideoIds.includes(videoId)) {
      setSelectedVideoIds(selectedVideoIds.filter((id) => id !== videoId));
    } else {
      setSelectedVideoIds([...selectedVideoIds, videoId]);
    }
  };

  const handleSelectAll = () => {
    if (previewData) {
      setSelectedVideoIds(previewData.videos.map((v) => v.videoId));
    }
  };

  const handleDeselectAll = () => {
    setSelectedVideoIds([]);
  };

  // Add tag
  const handleAddTag = () => {
    if (newTagInput.trim()) {
      const formatted = newTagInput.trim().replace(/^#/, '').toLowerCase();
      if (!tags.includes(formatted)) {
        setTags([...tags, formatted]);
      }
      setNewTagInput('');
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Submit and ingest course
  const handleImportCourse = async () => {
    setError(null);
    setErrorCode(null);
    setIsImporting(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else if (typeof window !== 'undefined' && (localStorage.getItem('LearnUp_is_guest') === 'true' || localStorage.getItem('LearnUp_guest_mode') === 'true')) {
        headers['Authorization'] = 'Bearer guest-session';
      }

      const payload = {
        url: url.trim(),
        title: courseName.trim() || previewData?.title || undefined,
        description: description.trim() || undefined,
        skillDomain: skillDomain || 'Systems Architecture',
        tags: tags.length > 0 ? tags : undefined,
        customThumbnailUrl: (customThumbnail && customThumbnail.startsWith('http')) ? customThumbnail : null,
        selectedVideoIds: selectedVideoIds.length > 0 ? selectedVideoIds : undefined
      };

      const res = await fetch('/api/learning-items', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        setCurrentStep(4);
        setTimeout(() => {
          onSuccess(json.data?.id);
          onClose();
        }, 800);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error?.message || 'Failed to import curriculum.');
        setErrorCode(errJson.error?.code || 'IMPORT_ERROR');
      }
    } catch {
      setError('An error occurred during curriculum ingestion. Please try again.');
      setErrorCode('NETWORK_ERROR');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const totalVideosCount = previewData?.videos?.length || 25;
  const selectedCount = selectedVideoIds.length;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={styles.modal}>
        {/* MacOS Style Window Header */}
        <div className={styles.windowHeader}>
          <div className={styles.trafficLights}>
            <button type="button" className={`${styles.dot} ${styles.dotRed}`} onClick={onClose} aria-label="Close" />
            <button type="button" className={`${styles.dot} ${styles.dotYellow}`} aria-label="Minimize" />
            <button type="button" className={`${styles.dot} ${styles.dotGreen}`} aria-label="Maximize" />
          </div>

          <div className={styles.windowTitle}>
            <span className={styles.bookIcon}>📖</span>
            <span id="modal-title" className={styles.titleText}>Add Course &bull; Curriculum Ingestion Engine</span>
          </div>

          <div className={styles.escBadge}>
            <span>ESC to cancel</span>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className={styles.stepperContainer}>
          <div className={`${styles.stepNode} ${currentStep >= 1 ? styles.stepActive : ''}`}>
            <span className={styles.stepNum}>①</span>
            <span className={styles.stepText}>Paste URL</span>
          </div>
          <div className={`${styles.stepConnector} ${currentStep >= 2 ? styles.connectorActive : ''}`} />

          <div className={`${styles.stepNode} ${currentStep >= 2 ? styles.stepActive : ''}`}>
            <span className={styles.stepNum}>②</span>
            <span className={styles.stepText}>Preview</span>
          </div>
          <div className={`${styles.stepConnector} ${currentStep >= 3 ? styles.connectorActive : ''}`} />

          <div className={`${styles.stepNode} ${currentStep >= 3 ? styles.stepActive : ''}`}>
            <span className={styles.stepNum}>③</span>
            <span className={styles.stepText}>Select &amp; Polish</span>
          </div>
          <div className={`${styles.stepConnector} ${currentStep >= 4 ? styles.connectorActive : ''}`} />

          <div className={`${styles.stepNode} ${currentStep >= 4 ? styles.stepActive : ''}`}>
            <span className={styles.stepNum}>④</span>
            <span className={styles.stepText}>Done</span>
          </div>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className={styles.modalBody}>
          {error && (
            <ActionableError
              error={error}
              errorCode={errorCode || undefined}
              onRetry={handleFetchPreview}
              onAutoFillUrl={(sample) => {
                setUrl(sample);
                setError(null);
                setErrorCode(null);
              }}
            />
          )}

          {/* Section 1: Choose Curriculum Source */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleArea}>
                <span className={styles.blueBullet}>●</span>
                <span className={styles.sectionTitle}>1. CHOOSE CURRICULUM SOURCE</span>
              </div>
              <span className={styles.monoBadge}>Auto-parsing Enabled</span>
            </div>
            <p className={styles.sectionSubtitle}>
              Select whether you are importing a standalone lecture or a multi-part playlist.
            </p>

            {/* Source Selection Cards */}
            <div className={styles.sourceGrid}>
              <button
                type="button"
                className={`${styles.sourceCard} ${sourceType === 'video' ? styles.sourceCardActive : ''}`}
                onClick={() => setSourceType('video')}
              >
                <div className={styles.sourceCardLeft}>
                  <span className={sourceType === 'video' ? styles.radioActive : styles.radioInactive} />
                  <div className={styles.ytIconBox}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#EF4444">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div className={styles.sourceDetails}>
                    <span className={styles.sourceName}>Add YouTube Video</span>
                    <span className={styles.sourceDesc}>Single lecture or deep-dive recording</span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                className={`${styles.sourceCard} ${sourceType === 'playlist' ? styles.sourceCardActive : ''}`}
                onClick={() => setSourceType('playlist')}
              >
                <div className={styles.sourceCardLeft}>
                  <span className={sourceType === 'playlist' ? styles.radioActive : styles.radioInactive} />
                  <div className={styles.playlistIconBox}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className={styles.sourceDetails}>
                    <div className={styles.sourceTitleRow}>
                      <span className={styles.sourceName}>Import YouTube Playlist</span>
                      <span className={styles.recommendedBadge}>RECOMMENDED</span>
                    </div>
                    <span className={styles.sourceDesc}>Auto-imports full course track and chapters</span>
                  </div>
                </div>
              </button>
            </div>

            {/* URL Input Bar */}
            <div className={styles.urlInputRow}>
              <div className={styles.urlInputBox}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2} className={styles.linkIcon}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <input
                  type="text"
                  className={styles.urlInput}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=..."
                />
              </div>
              <button
                type="button"
                className={styles.fetchBtn}
                onClick={handleFetchPreview}
                disabled={isPreviewLoading}
              >
                {isPreviewLoading ? 'Fetching...' : 'Fetch Preview'}
              </button>
            </div>

            {/* Confirmed Banner */}
            {isConfirmed && (
              <div className={styles.confirmedBanner}>
                <span className={styles.checkIcon}>✓</span>
                <span>Valid YouTube playlist confirmed. 25 videos parsed and indexed.</span>
              </div>
            )}
          </section>

          {/* Section 2: Playlist Import Preview */}
          {previewData && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleArea}>
                  <span className={styles.blueBullet}>●</span>
                  <span className={styles.sectionTitle}>2. PLAYLIST IMPORT PREVIEW</span>
                </div>
                <div className={styles.selectionControls}>
                  <span className={styles.selectionCount}>{selectedCount} of {totalVideosCount} videos selected</span>
                  <button type="button" className={styles.controlLink} onClick={handleSelectAll}>Select all</button>
                  <span className={styles.pipe}>|</span>
                  <button type="button" className={styles.controlLink} onClick={handleDeselectAll}>Deselect all</button>
                </div>
              </div>

              {/* Course Overview Card */}
              <div className={styles.previewCard}>
                <div className={styles.previewThumbBox}>
                  <div className={styles.thumbPlaceholder}>
                    <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span className={styles.vidsBadge}>{totalVideosCount} vids</span>
                </div>

                <div className={styles.previewInfo}>
                  <div className={styles.previewTopRow}>
                    <h3 className={styles.previewCourseTitle}>{previewData.title}</h3>
                    <span className={styles.trackBadge}>TARGET TRACK: {previewData.targetTrack}</span>
                  </div>
                  <span className={styles.previewMetaText}>
                    {previewData.author} &bull; {totalVideosCount} Videos &bull; {previewData.totalDurationFormatted}
                  </span>
                </div>
              </div>

              {/* Syllabus Node List / Video Table */}
              <div className={styles.syllabusTable}>
                <div className={styles.tableHeader}>
                  <div className={styles.tableColLeft}>
                    <span className={styles.colHash}>#</span>
                    <span className={styles.colTitle}>VIDEO TITLE &amp; SYLLABUS NODE</span>
                  </div>
                  <span className={styles.colDuration}>DURATION</span>
                </div>

                <div className={styles.tableBody}>
                  {previewData.videos.map((vid, idx) => {
                    const isSelected = selectedVideoIds.includes(vid.videoId);
                    const formattedIdx = String(idx + 1).padStart(2, '0');
                    return (
                      <div
                        key={vid.id}
                        className={`${styles.tableRow} ${isSelected ? styles.rowSelected : ''}`}
                        onClick={() => handleToggleVideo(vid.videoId)}
                      >
                        <div className={styles.rowLeft}>
                          <input
                            type="checkbox"
                            className={styles.rowCheckbox}
                            checked={isSelected}
                            onChange={() => handleToggleVideo(vid.videoId)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className={styles.rowIdx}>{formattedIdx}</span>
                          <div className={styles.miniThumb} />
                          <span className={styles.rowVidTitle}>{vid.title}</span>
                        </div>
                        <span className={styles.rowDuration}>{vid.duration}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Section 3: Course Details & Metadata */}
          {previewData && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleArea}>
                  <span className={styles.blueBullet}>●</span>
                  <span className={styles.sectionTitle}>3. COURSE DETAILS &amp; METADATA</span>
                </div>
              </div>
              <p className={styles.sectionSubtitle}>
                Refine the auto-populated metadata extracted from the syllabus.
              </p>

              <div className={styles.formGroup}>
                <label htmlFor="course-name-input" className={styles.formLabel}>Course Name *</label>
                <input
                  id="course-name-input"
                  type="text"
                  className={styles.formInput}
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="course-desc-input" className={styles.formLabel}>Description</label>
                <textarea
                  id="course-desc-input"
                  rows={3}
                  className={styles.formTextarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className={styles.twoColForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="skill-domain-select" className={styles.formLabel}>Skill Domain *</label>
                  <select
                    id="skill-domain-select"
                    className={styles.formSelect}
                    value={skillDomain}
                    onChange={(e) => setSkillDomain(e.target.value)}
                  >
                    <option value="Systems Architecture">Systems Architecture</option>
                    <option value="Frontend Engineering">Frontend Engineering</option>
                    <option value="Backend &amp; Distributed Systems">Backend &amp; Distributed Systems</option>
                    <option value="Data &amp; Machine Learning">Data &amp; Machine Learning</option>
                    <option value="Cloud Native &amp; DevOps">Cloud Native &amp; DevOps</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Taxonomy Labels</label>
                  <div className={styles.tagsContainer}>
                    {tags.map((tag) => (
                      <span key={tag} className={styles.tagChip}>
                        #{tag}
                        <button
                          type="button"
                          className={styles.tagRemoveBtn}
                          onClick={() => handleRemoveTag(tag)}
                          aria-label={`Remove tag ${tag}`}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    {isAddingTag ? (
                      <div className={styles.addTagInputWrapper}>
                        <input
                          type="text"
                          className={styles.addTagInput}
                          placeholder="tag-name"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          autoFocus
                        />
                        <button type="button" className={styles.addTagConfirmBtn} onClick={handleAddTag}>Add</button>
                      </div>
                    ) : (
                      <button type="button" className={styles.addTagBtn} onClick={() => setIsAddingTag(true)}>
                        + Add tag
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Course Thumbnail Editor */}
              <div className={styles.thumbnailGroup}>
                <div className={styles.thumbLabelRow}>
                  <span className={styles.formLabel}>Course Thumbnail</span>
                  <span className={styles.thumbExtractBadge}>Auto-extracted from YouTube (Editable)</span>
                </div>

                <div className={styles.thumbnailCard}>
                  <div className={styles.thumbBox}>
                    {customThumbnail ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={customThumbnail} alt="Thumbnail preview" className={styles.thumbImg} />
                    ) : (
                      <div className={styles.thumbBoxEmpty} />
                    )}
                  </div>

                  <div className={styles.thumbRight}>
                    <span className={styles.thumbPrompt}>Cover extracted from YouTube playlist cover</span>
                    <div className={styles.thumbActions}>
                      <button
                        type="button"
                        className={styles.thumbActionBtn}
                        onClick={() => {
                          const custom = prompt('Enter image URL:');
                          if (custom) setCustomThumbnail(custom);
                        }}
                      >
                        Upload Custom
                      </button>
                      <button
                        type="button"
                        className={styles.thumbRevertBtn}
                        onClick={() => setCustomThumbnail(null)}
                      >
                        Revert to default
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div className={styles.modalFooter}>
          <div className={styles.footerLeft}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isImporting}>
              Cancel
            </button>
            <span className={styles.shortcutText}>Shortcut: Esc</span>
          </div>

          <div className={styles.footerRight}>
            <div className={styles.footerStats}>
              <span className={styles.statsBold}>{selectedCount} of {totalVideosCount} Lectures</span>
              <span className={styles.statsLight}>Estimated ~18h 40m study plan</span>
            </div>

            <button
              type="button"
              className={styles.primaryImportBtn}
              onClick={handleImportCourse}
              disabled={isImporting || selectedCount === 0}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>{isImporting ? 'Ingesting Curriculum...' : `Import Selected Videos (${selectedCount})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
