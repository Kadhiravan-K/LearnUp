'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CommunityTemplate, TemplateCategory } from '@/lib/types';
import {
  getCommunityTemplates,
  saveContributedTemplate,
  deleteContributedTemplate
} from '@/lib/templates/communityTemplates';
import { Button } from '@/components/ui/Button/Button';
import styles from './BrowseTemplatesModal.module.css';

export interface BrowseTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (msg: string) => void;
}

export function BrowseTemplatesModal({ isOpen, onClose, onNotify }: BrowseTemplatesModalProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<CommunityTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Contribute Form State
  const [isContributing, setIsContributing] = useState(false);
  const [contribTitle, setContribTitle] = useState('');
  const [contribCategory, setContribCategory] = useState<TemplateCategory>('roadmap');
  const [contribDesc, setContribDesc] = useState('');
  const [contribAuthor, setContribAuthor] = useState('');
  const [contribTags, setContribTags] = useState('');
  const [contribDuration, setContribDuration] = useState('20 Hours');
  const [contribPayloadUrl, setContribPayloadUrl] = useState('');

  const loadTemplates = () => {
    setTemplates(getCommunityTemplates());
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (onNotify) onNotify(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const filteredTemplates = templates.filter((tpl) => {
    if (selectedCategory !== 'all' && tpl.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        tpl.title.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        tpl.author.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleUseTemplate = async (tpl: CommunityTemplate) => {
    setDownloadingId(tpl.id);

    try {
      if (tpl.category === 'roadmap') {
        try {
          await fetch('/api/roadmaps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: tpl.data?.title || tpl.title,
              description: tpl.data?.description || tpl.description
            })
          });
        } catch {}
        showToast(`Template "${tpl.title}" imported into your Roadmaps!`);
        setDownloadingId(null);
        setTimeout(() => {
          onClose();
          router.push('/roadmaps');
        }, 1000);
      } else if (tpl.category === 'playlist') {
        const urlToImport = tpl.data?.sampleVideoUrl || tpl.data?.url;
        if (urlToImport) {
          try {
            await fetch('/api/learning-items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: urlToImport })
            });
            window.dispatchEvent(new CustomEvent('studyflow_library_refresh'));
          } catch {}
        }
        showToast(`Course "${tpl.title}" imported to your Library!`);
        setDownloadingId(null);
        setTimeout(() => {
          onClose();
          router.push('/library');
        }, 1000);
      } else if (tpl.category === 'focus') {
        try {
          localStorage.setItem(
            'studyflow_pomodoro_config',
            JSON.stringify({
              focusDurationMinutes: tpl.data?.focusMinutes || 90,
              shortBreakMinutes: tpl.data?.shortBreakMinutes || 20,
              longBreakMinutes: tpl.data?.longBreakMinutes || 30,
              intervalsBeforeLongBreak: 4,
              autoStartBreaks: true,
              autoStartSprints: true
            })
          );
        } catch {}
        showToast(`Focus Cadence "${tpl.title}" configured in your timer!`);
        setDownloadingId(null);
        setTimeout(() => {
          onClose();
          router.push('/focus');
        }, 1000);
      } else {
        showToast(`Template "${tpl.title}" applied!`);
        setDownloadingId(null);
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch {
      setDownloadingId(null);
      showToast('Could not complete template import.');
    }
  };

  const handleCreateContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribTitle.trim() || !contribDesc.trim()) {
      showToast('Please fill in title and description.');
      return;
    }

    const tagArray = contribTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    saveContributedTemplate({
      title: contribTitle.trim(),
      description: contribDesc.trim(),
      category: contribCategory,
      author: contribAuthor.trim() || 'Community Contributor',
      tags: tagArray.length > 0 ? tagArray : ['Community', contribCategory],
      previewItemsCount: 6,
      estimatedDuration: contribDuration || '15 Hours',
      data: {
        type: contribCategory,
        title: contribTitle.trim(),
        description: contribDesc.trim(),
        sampleVideoUrl: contribPayloadUrl.trim() || undefined
      }
    });

    showToast(`Template "${contribTitle}" shared successfully!`);
    setIsContributing(false);
    setContribTitle('');
    setContribDesc('');
    setContribTags('');
    setContribPayloadUrl('');
    loadTemplates();
  };

  const handleDeleteContribution = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteContributedTemplate(id);
    showToast('Contributed blueprint removed.');
    loadTemplates();
  };

  const categories: Array<{ id: string; label: string; icon: string }> = [
    { id: 'all', label: 'All Blueprints', icon: '🌐' },
    { id: 'roadmap', label: 'Roadmap Tracks', icon: '🗺️' },
    { id: 'playlist', label: 'Playlists & Courses', icon: '📺' },
    { id: 'focus', label: 'Focus Workflows', icon: '⏱️' }
  ];

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        {toastMsg && <div className={styles.toastBanner}>{toastMsg}</div>}

        {/* Modal Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>🧭</div>
            <div>
              <div className={styles.titleRow}>
                <h2 className={styles.title}>Browse Community Templates</h2>
                <span className={styles.cloudBadge}>COMMUNITY VAULT</span>
              </div>
              <p className={styles.subtitle}>
                Download peer-reviewed learning roadmaps, curated course playlists, and calibrated focus workflows.
              </p>
            </div>
          </div>

          <div className={styles.headerRight}>
            <button
              type="button"
              className={styles.contributeHeaderBtn}
              onClick={() => setIsContributing(!isContributing)}
            >
              <span>{isContributing ? '✕ Close Form' : '+ Share Blueprint'}</span>
            </button>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close templates browser"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contribution Drawer */}
        {isContributing && (
          <form onSubmit={handleCreateContribution} className={styles.contributeOverlay}>
            <div className={styles.formHeader}>
              <h3 className={styles.formTitle}>✨ Share Your Blueprint with Community</h3>
              <span className={styles.cloudBadge}>COMMUNITY CONTRIBUTION</span>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Blueprint Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems in Go, Stanford CS229..."
                  value={contribTitle}
                  onChange={(e) => setContribTitle(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select
                  value={contribCategory}
                  onChange={(e) => setContribCategory(e.target.value as TemplateCategory)}
                  className={styles.formSelect}
                >
                  <option value="roadmap">Roadmap Track</option>
                  <option value="playlist">Playlist / Video Course</option>
                  <option value="focus">Focus Workflow &amp; Cadence</option>
                </select>
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.formLabel}>Description *</label>
                <textarea
                  required
                  placeholder="Explain what topics are covered and key milestones..."
                  value={contribDesc}
                  onChange={(e) => setContribDesc(e.target.value)}
                  className={styles.formTextarea}
                  rows={2}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Your Name / Handle</label>
                <input
                  type="text"
                  placeholder="e.g. Alex (Stanford CS)"
                  value={contribAuthor}
                  onChange={(e) => setContribAuthor(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Go, Distributed Systems, Raft"
                  value={contribTags}
                  onChange={(e) => setContribTags(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Estimated Duration</label>
                <input
                  type="text"
                  placeholder="e.g. 25 Hours, Daily Workstation"
                  value={contribDuration}
                  onChange={(e) => setContribDuration(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>YouTube Playlist / Video URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/playlist?list=..."
                  value={contribPayloadUrl}
                  onChange={(e) => setContribPayloadUrl(e.target.value)}
                  className={styles.formInput}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsContributing(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Publish Blueprint
              </Button>
            </div>
          </form>
        )}

        {/* Search & Category Filter Bar */}
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search templates by subject, author, keyword (e.g., Rust, PyTorch, Math)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.categoryPills}>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`${styles.catPill} ${selectedCategory === c.id ? styles.catPillActive : ''}`}
                onClick={() => setSelectedCategory(c.id)}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className={styles.templatesGrid}>
          {filteredTemplates.length === 0 ? (
            <div className={styles.emptyResults}>
              <div className={styles.emptyIcon}>🔍</div>
              <h3>No templates found matching your search</h3>
              <p>Try searching for different keywords or select &quot;All Blueprints&quot;.</p>
            </div>
          ) : (
            filteredTemplates.map((tpl) => {
              const isUserContributed = tpl.id.startsWith('contributed_');

              return (
                <div key={tpl.id} className={styles.templateCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardBadgeRow}>
                      <span
                        className={`${styles.categoryBadge} ${
                          tpl.category === 'roadmap'
                            ? styles.badgeRoadmap
                            : tpl.category === 'playlist'
                            ? styles.badgePlaylist
                            : styles.badgeFocus
                        }`}
                      >
                        {tpl.category.toUpperCase()}
                      </span>
                      {isUserContributed && (
                        <span className={`${styles.categoryBadge} ${styles.badgeContributed}`}>
                          CONTRIBUTED
                        </span>
                      )}
                      <span className={styles.ratingBadge}>★ {tpl.rating}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={styles.durationBadge}>⏱ {tpl.estimatedDuration}</span>
                      {isUserContributed && (
                        <button
                          type="button"
                          className={styles.deleteCardBtn}
                          onClick={(e) => handleDeleteContribution(tpl.id, e)}
                          title="Delete this template"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className={styles.templateTitle}>{tpl.title}</h3>
                  <p className={styles.templateDesc}>{tpl.description}</p>

                  <div className={styles.tagsRow}>
                    {tpl.tags.map((tag) => (
                      <span key={tag} className={styles.tagPill}>
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.authorMeta}>
                      <span className={styles.authorName}>By {tpl.author}</span>
                      <span className={styles.downloadsCount}>⬇ {tpl.downloadsCount.toLocaleString()} downloads</span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleUseTemplate(tpl)}
                      disabled={downloadingId === tpl.id}
                    >
                      {downloadingId === tpl.id ? 'Importing...' : 'Use Template ⬇'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
