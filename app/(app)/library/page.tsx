'use client';

import React, { useState, useMemo } from 'react';
import { useLibrary } from '@/lib/hooks/useLibrary';
import { LibraryGrid } from '@/components/library/LibraryGrid';
import {
  LibraryFilterBar,
  filterLibraryItems,
  getLibraryFilterCounts,
  type LibraryStatusFilter,
} from '@/components/library/LibraryFilterBar';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Alert } from '@/components/ui/Alert/Alert';
import { EmptyState } from '@/components/ui/EmptyState/EmptyState';
import { Button } from '@/components/ui/Button/Button';
import { ImportModal } from '@/components/library/ImportModal';
import { EditCourseModal } from '@/components/library/EditCourseModal';
import { DeleteConfirmModal } from '@/components/library/DeleteConfirmModal';
import type { LearningItem } from '@/lib/types';
import styles from './LibraryPage.module.css';

export default function LibraryPage() {
  const { items, isLoading, error, refresh } = useLibrary();
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LearningItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<LearningItem | null>(null);

  const filterCounts = useMemo(() => getLibraryFilterCounts(items), [items]);
  const filteredItems = useMemo(
    () => filterLibraryItems(items, statusFilter),
    [items, statusFilter]
  );

  const handleImportSuccess = () => {
    setIsImportModalOpen(false);
    refresh(); // Reload the grid to show the newly imported item
  };

  const handleEditSuccess = () => {
    setEditingItem(null);
    refresh();
  };

  const handleDeleteSuccess = () => {
    setDeletingItem(null);
    refresh();
  };

  // Listen for undo/restore events across the workspace
  React.useEffect(() => {
    const handleLibraryRefresh = () => refresh();
    window.addEventListener('studyflow_library_refresh', handleLibraryRefresh);
    return () => window.removeEventListener('studyflow_library_refresh', handleLibraryRefresh);
  }, [refresh]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>My Courses</h1>
          <p className={styles.subtitle}>
            Organize, track, and resume your imported YouTube courses, playlists, and videos.
          </p>
        </div>
        <Button onClick={() => setIsImportModalOpen(true)}>
          + Add Course
        </Button>
      </header>

      {isLoading && (
        <div className={styles.loadingContainer}>
          <Spinner size="lg" />
        </div>
      )}

      {!isLoading && error && (
        <Alert variant="error" title="Failed to load library">
          {error}
          <div style={{ marginTop: '1rem' }}>
            <Button variant="secondary" size="sm" onClick={refresh}>Try Again</Button>
          </div>
        </Alert>
      )}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          title="Your course library is empty"
          description="Start building your private curriculum by importing a YouTube video or playlist."
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          }
          action={
            <Button onClick={() => setIsImportModalOpen(true)}>
              + Add Your First Course
            </Button>
          }
        />
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className={styles.contentSection}>
          <div className={styles.toolbar}>
            <LibraryFilterBar
              activeFilter={statusFilter}
              onFilterChange={setStatusFilter}
              counts={filterCounts}
            />
          </div>

          <div id="library-grid-region" role="region" aria-label="Learning Items Grid">
            {filteredItems.length === 0 ? (
              <EmptyState
                title={
                  statusFilter === 'completed'
                    ? 'No completed items yet'
                    : statusFilter === 'not_started'
                    ? 'No unstarted items'
                    : 'No items in progress'
                }
                description={
                  statusFilter === 'completed'
                    ? 'Courses and videos you complete will appear here.'
                    : statusFilter === 'not_started'
                    ? 'All your imported courses have been started.'
                    : 'Courses and videos you start studying will appear here.'
                }
                action={
                  <Button variant="secondary" onClick={() => setStatusFilter('all')}>
                    Show All Items ({items.length})
                  </Button>
                }
              />
            ) : (
              <LibraryGrid
                items={filteredItems}
                onEdit={(item) => setEditingItem(item)}
                onDelete={(item) => setDeletingItem(item)}
              />
            )}
          </div>
        </div>
      )}

      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {editingItem && (
        <EditCourseModal
          isOpen={Boolean(editingItem)}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingItem && (
        <DeleteConfirmModal
          isOpen={Boolean(deletingItem)}
          item={deletingItem}
          itemId={deletingItem.id}
          itemTitle={deletingItem.title}
          onClose={() => setDeletingItem(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
