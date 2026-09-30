# StudyFlow — MVP Architecture

**Version:** MVP-0.1
**Purpose:** Define boundaries and contracts before application code is written.

## 1. Architecture Goal

Provide the smallest production-capable architecture that supports:

- authentication;
- private user-owned library data;
- YouTube video/playlist import;
- source-order preservation;
- embedded YouTube playback;
- removal of StudyFlow-owned library records.

The architecture intentionally does not contain AI, analytics, planning, social, recommendation, or gamification subsystems.

## 2. Reference Technology Direction

The implementation team may use the following reference stack unless an explicit technical decision changes it:

- **Web application:** Next.js/React.
- **Authentication and database:** Supabase Auth + PostgreSQL.
- **Server-side business/API boundary:** Next.js server routes/server actions and/or Supabase Edge Functions, with one clearly documented ownership boundary.
- **YouTube metadata integration:** YouTube Data API v3.
- **Playback:** YouTube iframe embed / IFrame Player API.
- **Source control:** GitHub.
- **Testing:** unit + integration + end-to-end testing appropriate to the selected framework.

These are implementation choices, not additional product features.

## 3. High-Level System Boundary

```text
Browser
  |
  | HTTPS
  v
StudyFlow Web App
  |
  +--> Authentication Boundary
  |
  +--> StudyFlow Application/API Boundary
          |
          +--> Database
          |
          +--> YouTube Integration Adapter
                    |
                    v
              YouTube Data API

Browser
  |
  +--> YouTube Embedded Player
          |
          v
       YouTube
```

## 4. Responsibility Boundaries

### Browser / frontend

Responsible for:

- rendering authenticated views;
- collecting user input;
- showing validation and server results;
- rendering the YouTube embedded player;
- allowing the user to select playlist videos;
- never holding privileged server secrets.

Not responsible for:

- trusting client-provided ownership claims;
- directly executing privileged database mutations without server-side authorization;
- storing YouTube API secrets;
- deciding whether another user's data can be accessed.

### Authentication layer

Responsible for:

- identity establishment;
- session management;
- authenticated user identification.

Not responsible for:

- parsing YouTube URLs;
- importing YouTube content;
- deciding product-specific library ownership rules beyond the identity boundary.

### Application/API layer

Responsible for:

- authorization checks;
- URL normalization and source classification;
- orchestrating YouTube metadata retrieval;
- import idempotency;
- transaction boundaries;
- converting external API failures into stable application errors;
- coordinating database writes;
- enforcing product invariants.

### Database

Responsible for:

- durable StudyFlow state;
- user-to-library ownership;
- uniqueness constraints;
- playlist child ordering;
- relational integrity.

The database must not depend on browser logic for ownership enforcement.

### YouTube integration adapter

Responsible for:

- communicating with YouTube Data API;
- resolving playlist/video metadata;
- handling pagination;
- mapping external response data into an internal normalized model.

The rest of the application must not depend directly on raw YouTube SDK response objects.

The YouTube Data API `playlistItems.list` endpoint supports `playlistId`, returns playlist item metadata including `snippet.position`, and supports pagination through page tokens. citeturn421196search0turn421196search3

### YouTube player

Responsible for actual video playback.

StudyFlow owns the player container and UI around it, but YouTube remains the media provider. YouTube documents iframe embedding and the IFrame Player API for embedded playback. citeturn421196search1turn421196search2

## 5. Recommended Domain Model

### `profiles` / user profile mapping

Use the authentication provider's user identity as the authoritative owner ID. A profile table is optional for MVP-0.1 unless the selected authentication implementation requires one.

### `learning_items`

Represents one imported source.

Suggested fields:

- `id` — UUID/internal ID.
- `user_id` — owner.
- `type` — `video` or `playlist`.
- `youtube_video_id` — nullable for playlist parent.
- `youtube_playlist_id` — nullable for video parent.
- `source_url` — original user-submitted URL.
- `normalized_source_key` — canonical key used for idempotency.
- `title` — imported display title.
- `thumbnail_url` — optional display metadata.
- `status` — implementation-defined import status.
- `created_at`.
- `updated_at`.

Constraint intent:

- exactly one valid source type per row;
- source identity is unique per user;
- user ownership cannot be null.

### `learning_item_videos`

Represents videos belonging to an imported playlist.

Suggested fields:

- `id`.
- `learning_item_id`.
- `youtube_video_id`.
- `title`.
- `thumbnail_url`.
- `source_position`.
- `created_at`.

Constraint intent:

- `learning_item_id` references a playlist-type learning item;
- `source_position` is unique within the parent playlist;
- child rows cannot outlive their parent.

## 6. Data Invariants

The following invariants must be enforced by code, database constraints, or both:

1. Every learning item has exactly one owner.
2. A user can only access their own learning items.
3. A normalized source key is unique per owner.
4. A playlist child belongs to exactly one StudyFlow playlist item.
5. Playlist `source_position` is deterministic and preserved.
6. A successful playlist import has a consistent parent/child state.
7. Remove does not modify YouTube content.
8. No browser-supplied user ID is trusted as an authority.

## 7. Import Pipeline

```text
User submits URL
      |
      v
Validate authentication
      |
      v
Parse + normalize URL
      |
      +---- invalid --> user-safe error
      |
      v
Classify source
(video / playlist)
      |
      v
Check existing source for current user
      |
      +---- exists --> return existing item
      |
      v
YouTube adapter
      |
      v
Fetch metadata
      |
      +---- failure --> stable import error
      |
      v
Persist StudyFlow records transactionally
      |
      v
Return ready library item
```

## 8. Playlist Import Requirements

The implementation must:

- resolve a canonical playlist ID;
- retrieve all available playlist items required by the imported source;
- follow API pagination until completion or a defined failure condition;
- preserve each item's source position;
- avoid creating duplicate child rows on retry;
- ensure incomplete imports are not marked successful.

The YouTube API documentation states that playlist item position is zero-based and can be used to represent the playlist's order. citeturn421196search3

## 9. API Boundary

The exact endpoint names may vary by implementation, but the capability contract should remain stable.

### Authentication capabilities

- `signUp`
- `signIn`
- `signOut`
- `getCurrentUser`

### Library capabilities

- `listLearningItems`
- `getLearningItem`
- `importVideo`
- `importPlaylist`
- `removeLearningItem`

### Response principles

Responses should contain only fields needed by the caller. Do not expose raw external API payloads unless a documented use case requires them.

### Error principles

Use stable machine-readable error codes plus user-safe messages.

Example categories:

- `AUTH_REQUIRED`
- `FORBIDDEN`
- `INVALID_URL`
- `UNSUPPORTED_SOURCE`
- `SOURCE_NOT_FOUND`
- `SOURCE_UNAVAILABLE`
- `IMPORT_FAILED`
- `DUPLICATE_SOURCE`
- `NOT_FOUND`
- `INTERNAL_ERROR`

## 10. Security Boundary

### Server-only secrets

The YouTube Data API credential, database service credentials, and any privileged application secret must be server-side only.

### Authorization

Every protected read/mutation must derive the acting user from the authenticated session and enforce ownership.

### Validation

Validate:

- URL shape;
- source type;
- identifiers;
- request body structure;
- IDs and route parameters.

### Logging

Never log:

- passwords;
- session tokens;
- API secrets;
- full authorization headers;
- unnecessary personal data.

## 11. External Dependency Failure Strategy

The YouTube service is an external dependency and may fail, rate-limit, or return unavailable content.

The application must:

- time out or fail predictably;
- surface a stable error to the user;
- log enough diagnostic context to investigate;
- avoid claiming successful import when persistence is incomplete;
- make safe retry possible.

## 12. Playback Architecture

StudyFlow should use the official YouTube embed mechanism rather than proxying video bytes. The YouTube documentation supports iframe URLs of the form `https://www.youtube.com/embed/VIDEO_ID` and the IFrame Player API for player control/events. citeturn421196search1turn421196search2

For MVP-0.1, the player needs only enough integration to load the selected video reliably. Watch-progress synchronization is explicitly out of scope.

## 13. Repository Boundary

Recommended top-level organization:

```text
studyflow/
├── app/                     # UI and route entry points
├── components/              # reusable UI
├── lib/
│   ├── youtube/             # YouTube adapter/parser
│   ├── auth/                # auth helpers
│   ├── db/                  # persistence access
│   └── validation/          # boundary schemas
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
└── AGENTS.md
```

The exact folders may change with the selected framework, but the responsibility boundaries must remain recognizable.

## 14. Architecture Non-Goals

Do not add service boundaries for:

- AI.
- Recommendation engines.
- Notification workers.
- Analytics pipelines.
- Social systems.
- Gamification.
- Calendar services.
- Search infrastructure beyond what the MVP import flow requires.

## 15. Architecture Decisions Required Before Coding

Before implementation, the team must explicitly record:

1. Exact authentication provider configuration.
2. Exact database schema/migration naming.
3. Exact YouTube API credential ownership and quota monitoring approach.
4. Exact API route/action naming.
5. Exact direct-video data-model approach.
6. Exact deployment environments.

These decisions must be written in a project decision log before production implementation begins.
