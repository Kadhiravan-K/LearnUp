'use client';

import React, { useState, useEffect } from 'react';

interface Note {
  id: string;
  title: string;
  content: string;
  learning_item_id: string;
  youtube_video_id?: string;
  created_at: string;
  updated_at: string;
}

interface Bookmark {
  id: string;
  learning_item_id: string;
  youtube_video_id: string;
  position_seconds: number;
  label: string;
  created_at: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('notes');

  // New note form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadNotes();
    loadBookmarks();
  }, []);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      // TODO: Connect to /api/notes
      // const response = await fetch('/api/notes');
      // if (!response.ok) throw new Error('Failed to load notes');
      // const data = await response.json();
      // setNotes(data.notes || []);
      setNotes([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
      console.error('Error loading notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBookmarks = async () => {
    try {
      // TODO: Connect to /api/bookmarks
      // const response = await fetch('/api/bookmarks');
      // if (!response.ok) throw new Error('Failed to load bookmarks');
      // const data = await response.json();
      // setBookmarks(data.bookmarks || []);
      setBookmarks([]);
    } catch (err) {
      console.error('Error loading bookmarks:', err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setIsSubmitting(true);
    try {
      // TODO: Connect to POST /api/notes
      // const response = await fetch('/api/notes', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ title: newTitle, content: newContent })
      // });
      //
      // if (!response.ok) throw new Error('Failed to create note');
      // const data = await response.json();
      //
      // setNotes((prev) => [data.note, ...prev]);
      setNewTitle('');
      setNewContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
      console.error('Error creating note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      // TODO: Connect to DELETE /api/notes/[id]
      // const response = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      // if (!response.ok) throw new Error('Failed to delete note');
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
      console.error('Error deleting note:', err);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!confirm('Delete this bookmark?')) return;

    try {
      // TODO: Connect to DELETE /api/bookmarks/[id]
      // const response = await fetch(`/api/bookmarks/${bookmarkId}`, { method: 'DELETE' });
      // if (!response.ok) throw new Error('Failed to delete bookmark');
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bookmark');
      console.error('Error deleting bookmark:', err);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>Notes & Bookmarks</h1>
        <p style={{ color: 'var(--sf-color-text-secondary)', fontSize: '14px' }}>
          Create and manage notes for your learning content. Bookmarks mark important timestamps.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: 'var(--sf-color-error-bg)',
            border: '1px solid var(--sf-color-error-border)',
            borderRadius: '6px',
            color: 'var(--sf-color-error-text)'
          }}
        >
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--sf-color-border)' }}>
        <button
          onClick={() => setActiveTab('notes')}
          style={{
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            borderBottom: activeTab === 'notes' ? '2px solid var(--sf-color-primary)' : 'none',
            color: activeTab === 'notes' ? 'var(--sf-color-primary)' : 'var(--sf-color-text-secondary)',
            cursor: 'pointer',
            backgroundColor: 'transparent'
          }}
        >
          Notes ({notes.length})
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          style={{
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            borderBottom: activeTab === 'bookmarks' ? '2px solid var(--sf-color-primary)' : 'none',
            color: activeTab === 'bookmarks' ? 'var(--sf-color-primary)' : 'var(--sf-color-text-secondary)',
            cursor: 'pointer',
            backgroundColor: 'transparent'
          }}
        >
          Bookmarks ({bookmarks.length})
        </button>
      </div>

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div>
          {/* Create Note Form */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Create New Note</h2>
            <form onSubmit={handleAddNote}>
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Note title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--sf-color-input-border)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <textarea
                  placeholder="Note content"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  disabled={isSubmitting}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--sf-color-input-border)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !newTitle.trim() || !newContent.trim()}
                style={{
                  padding: '10px 16px',
                  backgroundColor: isSubmitting || !newTitle.trim() ? 'var(--sf-color-input-border)' : 'var(--sf-color-primary)',
                  color: 'var(--sf-color-text-on-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? 'Creating...' : 'Create Note'}
              </button>
            </form>
          </div>

          {/* Notes List */}
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Your Notes</h2>
            {isLoading ? (
              <p style={{ color: 'var(--sf-color-text-tertiary)' }}>Loading notes...</p>
            ) : notes.length === 0 ? (
              <p style={{ color: 'var(--sf-color-text-tertiary)', textAlign: 'center', padding: '24px' }}>No notes yet. Create one above.</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {notes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: '16px',
                      border: '1px solid var(--sf-color-border)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--sf-color-bg-secondary)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{note.title}</h3>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'var(--sf-color-error-bg)',
                          color: 'var(--sf-color-error-text)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                    <p style={{ margin: '0 0 8px 0', color: 'var(--sf-color-text-secondary)', fontSize: '14px' }}>{note.content}</p>
                    <p style={{ margin: 0, color: 'var(--sf-color-text-tertiary)', fontSize: '12px' }}>
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bookmarks Tab */}
      {activeTab === 'bookmarks' && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Your Bookmarks</h2>
          {isLoading ? (
            <p style={{ color: 'var(--sf-color-text-tertiary)' }}>Loading bookmarks...</p>
          ) : bookmarks.length === 0 ? (
            <p style={{ color: 'var(--sf-color-text-tertiary)', textAlign: 'center', padding: '24px' }}>
              No bookmarks yet. Create them while watching videos.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--sf-color-border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--sf-color-bg-secondary)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '500' }}>{bookmark.label}</p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--sf-color-text-tertiary)' }}>
                        Video: {bookmark.youtube_video_id}
                      </p>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--sf-color-text-tertiary)' }}>
                        Time: {Math.floor(bookmark.position_seconds / 60)}:{String(bookmark.position_seconds % 60).padStart(2, '0')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--sf-color-error-bg)',
                        color: 'var(--sf-color-error-text)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '32px', padding: '16px', backgroundColor: 'var(--sf-color-primary-light)', borderRadius: '8px', fontSize: '12px', color: 'var(--sf-color-primary)' }}>
        <p>🔗 API integration required for production. Connect to /api/notes and /api/bookmarks endpoints.</p>
      </div>
    </div>
  );
}
