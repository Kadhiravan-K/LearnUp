'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useLearningItem } from '@/lib/hooks/useLearningItem';
import { YouTubePlayer, YouTubePlayerRef } from '@/components/player/YouTubePlayer';
import { PlaylistSidebar } from '@/components/player/PlaylistSidebar';
import { NotesSection } from '@/components/notes/NotesSection';
import { BookmarksSection } from '@/components/bookmarks/BookmarksSection';
import { VibeCodeGenerator } from '@/components/plugins/VibeCodeGenerator';
import { DeleteConfirmModal } from '@/components/library/DeleteConfirmModal';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Alert } from '@/components/ui/Alert/Alert';
import { Button } from '@/components/ui/Button/Button';
import styles from './ItemDetail.module.css';

export default function LearningItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const { item, isLoading, error } = useLearningItem(id as string);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [completedVideoIds, setCompletedVideoIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks' | 'vibe_code'>('notes');

  const playerRef = useRef<YouTubePlayerRef>(null);

  useEffect(() => {
    // Fetch all raw video progress to pass completion status to sidebar
    fetch('/api/progress/all-videos')
      .then(res => res.json())
      .then(resJson => {
        const data = resJson.data;
        if (Array.isArray(data)) {
          const completed = new Set(data.filter(p => p.is_completed).map(p => p.youtube_video_id));
          setCompletedVideoIds(completed as Set<string>);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (item) {
      if (item.type === 'video' && item.youtube_video_id) {
        setActiveVideoId(item.youtube_video_id);
      } else if (item.type === 'playlist' && item.videos && item.videos.length > 0) {
        setActiveVideoId((current) => {
          if (current) return current;
          const sorted = [...item.videos!].sort((a, b) => a.source_position - b.source_position);
          return sorted[0].youtube_video_id;
        });
      }
    }
  }, [item]);

  const handleVideoCompleted = () => {
    if (activeVideoId) {
      setCompletedVideoIds(prev => new Set(prev).add(activeVideoId));
      
      // Auto-advance
      if (item?.type === 'playlist' && item.videos) {
        const sorted = [...item.videos].sort((a, b) => a.source_position - b.source_position);
        const currentIndex = sorted.findIndex(v => v.youtube_video_id === activeVideoId);
        if (currentIndex !== -1 && currentIndex < sorted.length - 1) {
          setActiveVideoId(sorted[currentIndex + 1].youtube_video_id);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer} aria-busy="true" aria-label="Loading learning content">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Link href="/library" className={styles.backButton} aria-label="Back to Library">
            <svg className={styles.backIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Library</span>
          </Link>
        </div>
        <Alert variant="error" title="Could not load item">
          {error || 'Item not found.'}
        </Alert>
      </div>
    );
  }

  const activeVideo = item?.type === 'playlist'
    ? item.videos?.find((v) => v.youtube_video_id === activeVideoId)
    : null;

  const currentDisplayTitle = activeVideo ? activeVideo.title : item.title;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeading}>
          <div className={styles.breadcrumbBar}>
            <Link href="/library" className={styles.backButton} aria-label="Back to Library">
              <svg className={styles.backIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Library</span>
            </Link>
            {item.type === 'playlist' && (
              <>
                <span className={styles.breadcrumbDivider}>/</span>
                <span className={styles.playlistName}>{item.title}</span>
              </>
            )}
          </div>
          <h1 className={styles.title}>{currentDisplayTitle}</h1>
          {item.type === 'playlist' && activeVideo && (
            <div className={styles.playlistSubtitle}>
              <span className={styles.lectureBadge}>Lecture {activeVideo.source_position + 1} of {item.videos?.length || 1}</span>
              <span>• Part of <strong>{item.title}</strong></span>
            </div>
          )}
        </div>
        
        <div className={styles.headerActions}>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => setIsDeleteModalOpen(true)}
            aria-label={`Delete ${item.title}`}
          >
            Delete
          </Button>
        </div>
      </header>

      <div className={styles.playerLayout}>
        <div className={styles.mainContent}>
          {activeVideoId ? (
            <YouTubePlayer 
              ref={playerRef}
              key={activeVideoId}
              videoId={activeVideoId} 
              title={currentDisplayTitle} 
              onCompleted={handleVideoCompleted}
            />
          ) : (
            <div className={styles.placeholder}>Video unavailable</div>
          )}

          {activeVideoId && (
            <div className={styles.toolsContainer}>
              <div className={styles.tabBar} role="tablist" aria-label="Learning Tools">
                <button
                  type="button"
                  role="tab"
                  id="tab-notes"
                  aria-controls="panel-notes"
                  aria-selected={activeTab === 'notes'}
                  className={`${styles.tabButton} ${activeTab === 'notes' ? styles.tabButtonActive : ''}`}
                  onClick={() => setActiveTab('notes')}
                >
                  Study Notes
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-bookmarks"
                  aria-controls="panel-bookmarks"
                  aria-selected={activeTab === 'bookmarks'}
                  className={`${styles.tabButton} ${activeTab === 'bookmarks' ? styles.tabButtonActive : ''}`}
                  onClick={() => setActiveTab('bookmarks')}
                >
                  Video Bookmarks
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-vibe-code"
                  aria-controls="panel-vibe-code"
                  aria-selected={activeTab === 'vibe_code'}
                  className={`${styles.tabButton} ${activeTab === 'vibe_code' ? styles.tabButtonActive : ''}`}
                  onClick={() => setActiveTab('vibe_code')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>⚡</span> Vibe Code Generator
                </button>
              </div>

              {activeTab === 'notes' && (
                <div id="panel-notes" role="tabpanel" aria-labelledby="tab-notes">
                  <NotesSection
                    learningItemId={item.id}
                    youtubeVideoId={activeVideoId}
                  />
                </div>
              )}

              {activeTab === 'bookmarks' && (
                <div id="panel-bookmarks" role="tabpanel" aria-labelledby="tab-bookmarks">
                  <BookmarksSection
                    learningItemId={item.id}
                    youtubeVideoId={activeVideoId}
                    getCurrentTime={() => playerRef.current?.getCurrentTime() || 0}
                    onSeek={(seconds) => playerRef.current?.seekTo(seconds)}
                  />
                </div>
              )}

              {activeTab === 'vibe_code' && (
                <div id="panel-vibe-code" role="tabpanel" aria-labelledby="tab-vibe-code">
                  <VibeCodeGenerator
                    videoId={activeVideoId}
                    courseTitle={item.title}
                    currentSecond={playerRef.current?.getCurrentTime() || 0}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        {item.type === 'playlist' && item.videos && (
          <div className={styles.sidebarContent}>
            <PlaylistSidebar 
              videos={item.videos} 
              activeVideoId={activeVideoId} 
              onVideoSelect={setActiveVideoId} 
              completedVideoIds={completedVideoIds}
            />
          </div>
        )}
      </div>

      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={() => {
          router.push('/library');
        }}
        itemId={item.id}
        itemTitle={item.title}
      />
    </div>
  );
}
