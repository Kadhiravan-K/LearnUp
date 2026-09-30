# Plugin & Connector Architecture

StudyFlow provides an extensible connector architecture to integrate external study tools and export destinations (such as Anki, Notion, Obsidian, Readwise, and Google Calendar) while preserving user privacy and strict credential isolation.

---

## Connector Principles

1. **User Ownership**:
   - Connector configurations and sync preferences are stored per-user under `user_settings` or dedicated plugin tables protected by Row-Level Security (RLS).
   - No cross-user data sharing or third-party credential exposure.

2. **Client-Side Security**:
   - OAuth tokens, API secrets, and webhook URLs are processed server-side or encrypted at rest.
   - Secrets are never embedded into frontend JavaScript client bundles.

3. **Pluggable Interface**:
   - Connectors implement the `StudyFlowConnector` interface defined in `lib/connectors/`.
   - Each connector defines its capabilities:
     - `exportNotes`: Export markdown notes and summaries.
     - `syncBookmarks`: Sync timestamps and key learning milestones.
     - `calendarSync`: Export study sessions and schedule focus blocks.

---

## Connector Catalog

| Connector | Status | Supported Actions |
| --------- | ------ | ----------------- |
| **Anki** | Active | Flashcard generation from note highlights |
| **Notion** | Active | Course note & summary export to Notion databases |
| **Obsidian** | Active | Vault markdown export with frontmatter metadata |
| **Readwise** | Active | Highlight synchronization |
| **Google Calendar** | Active | Focus session scheduling & reminder sync |

---

## Developing a New Connector

To create a new connector:
1. Implement the connector interface in `lib/connectors/`.
2. Provide validation schemas for required settings using Zod.
3. Write automated unit tests for serialization and synchronization logic in `tests/unit/connectors.test.ts`.
