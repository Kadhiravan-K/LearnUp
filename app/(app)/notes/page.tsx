'use client';

import React, { useState } from 'react';
import styles from './notes.module.css';

interface NoteRecord {
  id: string;
  course: string;
  lecture: string;
  timestamp: string;
  title: string;
  content: string;
  type: 'code' | 'text' | 'lemma';
  snippet?: string;
  tags: string[];
  date: string;
}

interface BookmarkRecord {
  id: string;
  course: string;
  timestamp: string;
  label: string;
}

const INITIAL_NOTES: NoteRecord[] = [
  {
    id: 'note-1',
    course: 'Embedded Systems & C Internals',
    lecture: 'Lecture 7: Low-Level Memory & Hardware Interfaces',
    timestamp: '23:41',
    title: 'Pointer Arithmetic & Array Stride Alignment',
    content: 'Pointer increments stride strictly by sizeof(type). When indexing memory-mapped I/O buffers for UART transmission, pointer casting (uint32_t*)base + offset requires 4-byte architectural alignment or triggers a processor hard fault on ARM Cortex-M.',
    type: 'code',
    snippet: `// UART Driver Register Stride Example
volatile uint32_t *UART_DR = (uint32_t*)(UART0_BASE + 0x000);
while (*UART_FR & (1 << 5)); // Wait until TXFF flag is cleared
*UART_DR = data_byte;        // Hardware serial pipe dispatch`,
    tags: ['#embedded-c', '#uart-registers', '#arm-cortex'],
    date: 'Oct 24, 2024'
  },
  {
    id: 'note-2',
    course: 'Distributed Systems & Consensus',
    lecture: 'Lecture 4: Primary-Backup & Split-Brain',
    timestamp: '18:42',
    title: 'AppendEntries RPC & Leader Commit Calculation',
    content: 'Leader commit calculation rule: An entry is committed once successfully acknowledged by a majority (N/2 + 1) of nodes. Must originate from leader current term to avoid split-brain log overwriting.',
    type: 'code',
    snippet: `// Raft AppendEntries quorum calculation
if leaderCommit > rf.matchIndex[peer] {
    rf.commitIndex = min(leaderCommit, lastNewEntryIndex)
    rf.applyCond.Broadcast() // Notify state machine worker
}`,
    tags: ['#raft', '#quorum', '#split-brain'],
    date: 'Yesterday, 08:30 AM'
  },
  {
    id: 'note-3',
    course: 'Database Internals: LSM Trees & WAL',
    lecture: 'Lecture 5: SSTable Compaction & Bloom Filters',
    timestamp: '31:10',
    title: 'Write Amplification in Size-Tiered vs Leveled Compaction',
    content: 'Leveled compaction bounds read amplification to at most 1 SSTable per level using Bloom filters (calibrated to 10 bits/key for ~1% false positive probability). This significantly reduces random disk seeks at the expense of continuous write amplification during down-level merge passes.',
    type: 'lemma',
    snippet: 'Lemma 5.2: Bits per key m/n = -(ln p) / (ln 2)^2 ≈ 1.44 * log2(1/p)',
    tags: ['#lsm-tree', '#storage-engines', '#compaction'],
    date: '3 days ago'
  }
];

const INITIAL_BOOKMARKS: BookmarkRecord[] = [
  { id: 'bm-1', course: 'Embedded Systems', timestamp: '23:41', label: 'Pointer arithmetic & UART TX ring' },
  { id: 'bm-2', course: 'Embedded Systems', timestamp: '31:10', label: 'Memory allocation & heap fragment' },
  { id: 'bm-3', course: 'Embedded Systems', timestamp: '42:05', label: 'Struct packing #pragma pack(1)' },
  { id: 'bm-4', course: 'Distributed Systems', timestamp: '08:15', label: 'Split-Brain Prevention & Asymmetry' },
  { id: 'bm-5', course: 'Distributed Systems', timestamp: '18:42', label: 'Raft AppendEntries RPC & Term Index' },
  { id: 'bm-6', course: 'Distributed Systems', timestamp: '32:10', label: 'Log Compaction & Snapshotting Flow' },
  { id: 'bm-7', course: 'Distributed Systems', timestamp: '49:22', label: 'Multi-Node Election Quorum Voting' }
];

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteRecord[]>(INITIAL_NOTES);
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>(INITIAL_BOOKMARKS);
  const [activeCategory, setActiveCategory] = useState<'all' | 'timestamps' | 'bookmarks' | 'lemmas'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick note state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState('#embedded');

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (n.snippet && n.snippet.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeCategory === 'timestamps') return !!n.timestamp;
    if (activeCategory === 'lemmas') return n.type === 'lemma';
    return true;
  });

  const handleSaveQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newNote: NoteRecord = {
      id: `note-${Date.now()}`,
      course: 'Active Learning Context',
      lecture: 'General Study Session',
      timestamp: '00:00',
      title: newTitle.trim(),
      content: newContent.trim() || 'Quick note saved.',
      type: 'text',
      tags: [newTag.startsWith('#') ? newTag : `#${newTag}`],
      date: 'Just now'
    };

    setNotes((prev) => [newNote, ...prev]);
    setNewTitle('');
    setNewContent('');
  };

  const handleExportMarkdown = () => {
    let md = `# StudyFlow Notes & Bookmarks Export\n\n`;
    notes.forEach((n) => {
      md += `## ${n.title}\n`;
      md += `*Course: ${n.course} (${n.lecture} @ ${n.timestamp})*\n\n`;
      md += `${n.content}\n\n`;
      if (n.snippet) {
        md += `\`\`\`\n${n.snippet}\n\`\`\`\n\n`;
      }
      md += `Tags: ${n.tags.join(' ')}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studyflow-notes-export.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <span>TELEMETRY</span>
            <span>/</span>
            <span>Notes & Bookmarks Hub</span>
          </div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Notes & Bookmarks Hub</h1>
            <span className={styles.syncedBadge}>{notes.length + bookmarks.length} Records Synced</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.btnSecondary} onClick={handleExportMarkdown}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export Markdown (.md)
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              const el = document.getElementById('quick-note-title');
              el?.focus();
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Quick Note <span style={{ fontSize: '0.6875rem', padding: '1px 5px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>N</span>
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className={styles.searchWrapper}>
        <svg className={styles.searchIcon} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search across all notes, timestamps, syntax, or keywords (e.g. 'UART', 'Raft AppendEntries', 'Write Amplification')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Category Tabs */}
      <div className={styles.categoryTabs}>
        <button
          type="button"
          className={`${styles.catBtn} ${activeCategory === 'all' ? styles.catBtnActive : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          <span>All Notes & Bookmarks</span>
          <span className={styles.catBadge}>{notes.length + bookmarks.length}</span>
        </button>
        <button
          type="button"
          className={`${styles.catBtn} ${activeCategory === 'timestamps' ? styles.catBtnActive : ''}`}
          onClick={() => setActiveCategory('timestamps')}
        >
          <span>Course Notes & Timestamps</span>
          <span className={styles.catBadge}>{notes.length}</span>
        </button>
        <button
          type="button"
          className={`${styles.catBtn} ${activeCategory === 'lemmas' ? styles.catBtnActive : ''}`}
          onClick={() => setActiveCategory('lemmas')}
        >
          <span>Knowledge Index (Lemmas)</span>
          <span className={styles.catBadge}>142</span>
        </button>
      </div>

      {/* Main 2-Column Grid */}
      <div className={styles.mainGrid}>
        {/* Left Column: Notes List */}
        <div className={styles.notesList}>
          {filteredNotes.map((note) => (
            <article key={note.id} className={styles.noteCard}>
              <div className={styles.noteHeader}>
                <div className={styles.courseTag}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
                  <span>{note.course} • {note.lecture}</span>
                </div>
                {note.timestamp && (
                  <button
                    type="button"
                    className={styles.timestampJumpBtn}
                    onClick={() => alert(`Seeking course video to ${note.timestamp}`)}
                    title="Jump to video timestamp"
                  >
                    <span>▶</span>
                    <span>{note.timestamp}</span>
                  </button>
                )}
              </div>

              <h3 className={styles.noteTitle}>{note.title}</h3>
              <p className={styles.noteBody}>{note.content}</p>

              {note.snippet && note.type === 'code' && (
                <pre className={styles.codeBlock}>
                  <code>{note.snippet}</code>
                </pre>
              )}

              {note.snippet && note.type === 'lemma' && (
                <div className={styles.lemmaBox}>
                  <strong>∑ {note.snippet}</strong>
                </div>
              )}

              <div className={styles.noteFooter}>
                <div className={styles.tagList}>
                  {note.tags.map((t) => (
                    <span key={t} className={styles.tag}>{t}</span>
                  ))}
                </div>

                <div className={styles.actionsGroup}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted)', marginRight: '8px' }}>{note.date}</span>
                  <button type="button" className={styles.iconBtn} title="Share" onClick={() => alert('Shared note snippet.')}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    title="Delete Note"
                    onClick={() => setNotes((prev) => prev.filter((n) => n.id !== note.id))}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Right Column: Bookmarks Ledger & Quick Note */}
        <aside className={styles.rightPane}>
          {/* Video Bookmarks Ledger */}
          <div className={styles.bookmarksLedger}>
            <div className={styles.ledgerHeader}>
              <div className={styles.ledgerTitle}>
                <span>🔖</span>
                <span>Video Bookmarks</span>
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                {bookmarks.length} Bookmarked
              </span>
            </div>

            <div>
              {bookmarks.map((bm) => (
                <div key={bm.id} className={styles.ledgerItem}>
                  <div>
                    <div className={styles.ledgerItemLabel}>{bm.label}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--sf-text-muted)' }}>{bm.course}</div>
                  </div>
                  <button
                    type="button"
                    className={styles.jumpSmallBtn}
                    onClick={() => alert(`Jumping to ${bm.timestamp}`)}
                  >
                    ▶ {bm.timestamp}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Note Capture Card */}
          <div className={styles.quickNoteCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 700, color: 'var(--sf-text-primary)' }}>
              <span>✍️</span>
              <span>Capture Timestamp Note</span>
            </div>

            <form onSubmit={handleSaveQuickNote} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                id="quick-note-title"
                type="text"
                placeholder="Note title or formula..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className={styles.quickNoteInput}
                required
              />

              <textarea
                placeholder="Write synthesis, code snippets, or notes..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className={styles.quickNoteTextarea}
              />

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="#tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid var(--sf-border-subtle)' }}
                />
                <button type="submit" className={styles.btnPrimary} style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
