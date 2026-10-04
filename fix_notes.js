const fs = require('fs');
let notes = fs.readFileSync('app/(app)/notes/page.tsx', 'utf8');

notes = notes.replace(/const INITIAL_NOTES: NoteRecord\[\] = \[[\s\S]*?\];/s, 'const INITIAL_NOTES: NoteRecord[] = [];');
notes = notes.replace(/const INITIAL_BOOKMARKS: BookmarkRecord\[\] = \[[\s\S]*?\];/s, 'const INITIAL_BOOKMARKS: BookmarkRecord[] = [];');

notes = notes.replace('{filteredNotes.map((note) => (', '{filteredNotes.length === 0 ? (\n            <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--sf-bg-surface)", borderRadius: "12px", border: "1px solid var(--sf-border-subtle)" }}>\n              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📝</div>\n              <h3 style={{ margin: "0 0 6px 0", color: "var(--sf-text-primary)" }}>No notes found</h3>\n              <p style={{ margin: 0, color: "var(--sf-text-secondary)", fontSize: "0.875rem" }}>You have not created any notes yet.</p>\n            </div>\n          ) : (\n            filteredNotes.map((note) => (');

notes = notes.replace('</article>\n            ))}\n          </div>', '</article>\n            ))\n          )}\n          </div>');

fs.writeFileSync('app/(app)/notes/page.tsx', notes);
