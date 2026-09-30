# StudyFlow — Product Requirements Document

**Version:** MVP-0.1
**Status:** Draft for implementation
**Product owner:** StudyFlow team
**Primary implementation model:** AI-assisted development with human review

## 1. Product Goal

StudyFlow MVP-0.1 gives a learner one simple place to collect YouTube learning content and watch it without losing the source structure.

The product succeeds when a signed-in user can:

1. Create an account or sign in.
2. Submit a valid YouTube video URL or playlist URL.
3. Import that content into a private personal library.
4. See playlist videos in the same order as the source playlist.
5. Open a learning item and watch the selected YouTube video inside StudyFlow.
6. Remove a learning item from the StudyFlow library.

**Core product promise:** “Paste YouTube learning content, keep it organized in your library, and watch it from StudyFlow.”

## 2. Target User

### Primary user

A learner who already uses YouTube for education and wants a dedicated library for learning videos and playlists.

### User characteristics

- Frequently learns from YouTube.
- Wants a simple place to collect learning content.
- Does not need advanced learning-management features yet.
- Understands standard YouTube URLs.
- Uses a modern web browser on desktop or mobile-width screens.

### Primary problem

Learning content is often scattered across YouTube watch history, saved playlists, bookmarks, and external notes. MVP-0.1 focuses only on one narrow problem: importing and watching selected YouTube learning content from a personal StudyFlow library.

## 3. Product Scope

### In scope

- User authentication: sign up, sign in, sign out, and authenticated session handling.
- Import one YouTube video from a URL.
- Import one YouTube playlist from a URL.
- Store imported content against the authenticated user.
- Display imported library items.
- Display playlist videos in source order.
- Open an imported learning item.
- Play YouTube content using an official YouTube embedded player.
- Remove an imported learning item.
- Validation and user-friendly error states for invalid or unsupported URLs.
- Isolation so one user cannot read or modify another user's library.

### Explicitly out of scope

- AI features.
- Quizzes.
- Calendar.
- Leaderboards.
- Streaks.
- Social communication.
- Notifications.
- Recommendations.
- Gamification.
- Roadmap generation.
- Notes or bookmarks.
- Learning analytics.
- Course authoring.
- Downloading YouTube videos.
- Rehosting YouTube videos.
- Uploading videos to StudyFlow.
- YouTube account/channel management.
- Editing the source YouTube playlist.

## 4. MVP User Journeys

### Journey A — New user signup

1. User opens StudyFlow.
2. User selects Sign Up.
3. User submits valid credentials according to the authentication provider's rules.
4. Account is created.
5. User is authenticated.
6. User lands on the authenticated library/dashboard area.
7. User sees an empty-state message when no learning items exist.

### Journey B — Existing user login

1. User opens StudyFlow.
2. User selects Sign In.
3. User submits valid credentials.
4. User is authenticated.
5. User sees only their own library.

### Journey C — Import a video

1. Authenticated user opens Add Learning Item.
2. User pastes a supported YouTube video URL.
3. User submits the URL.
4. StudyFlow validates and normalizes the URL.
5. StudyFlow resolves the YouTube video ID and retrieves the minimum metadata required by the UI.
6. StudyFlow creates a library item owned by the authenticated user.
7. The imported video appears in the user's library.
8. Opening the item loads the YouTube video inside StudyFlow.

### Journey D — Import a playlist

1. Authenticated user opens Add Learning Item.
2. User pastes a supported YouTube playlist URL.
3. User submits the URL.
4. StudyFlow validates and normalizes the URL.
5. StudyFlow resolves the playlist ID.
6. StudyFlow retrieves playlist metadata and all available playlist items using pagination where required.
7. StudyFlow persists the videos with their source positions.
8. The playlist appears in the user's library.
9. Opening the playlist shows imported videos in the original source order.
10. Selecting a video plays that video inside StudyFlow.

The YouTube Data API exposes playlist item `position`, which is a zero-based indication of playlist order; implementation should preserve that ordering rather than relying on response arrival order. citeturn421196search0turn421196search3

### Journey E — Remove a learning item

1. Authenticated user opens their library.
2. User chooses Remove on a learning item.
3. StudyFlow asks for confirmation.
4. User confirms.
5. StudyFlow removes the item from the user's library.
6. If the item is a playlist, its StudyFlow-owned child records are removed as part of the same logical operation.
7. The original YouTube content is not modified.

## 5. Functional Requirements

### FR-001 Authentication

The system shall require authentication before a user can create, view, open, or remove library items.

**Test:** Unauthenticated requests to protected library operations are rejected; authenticated requests identify exactly one user.

### FR-002 Private library

The system shall associate every library item with exactly one user identity.

**Test:** User A cannot retrieve, open, or remove User B's library item by changing an ID in a request.

### FR-003 Video URL import

The system shall accept a supported YouTube video URL and resolve one canonical YouTube video ID.

**Test:** A valid supported video URL creates one library item containing the expected video ID.

### FR-004 Playlist URL import

The system shall accept a supported YouTube playlist URL and resolve one canonical YouTube playlist ID.

**Test:** A valid supported playlist URL creates one playlist library item and its imported video children.

### FR-005 Playlist ordering

The system shall preserve the source playlist order at import time.

**Test:** If the YouTube source reports items with positions 0, 1, 2, the StudyFlow UI displays them in positions 0, 1, 2 even if the API response was paginated or returned in a different processing order.

### FR-006 Library display

The system shall display imported learning items belonging to the current user.

**Minimum metadata for a library card:** item type, title, and enough source metadata to open the item.

### FR-007 Learning item opening

The system shall provide a stable authenticated route/action for opening an imported video or playlist.

### FR-008 Embedded playback

The system shall play YouTube content through an official embedded YouTube player rather than downloading or rehosting the video. YouTube documents iframe embedding using `https://www.youtube.com/embed/VIDEO_ID` and its IFrame Player API for programmatic player control. citeturn421196search1turn421196search2

### FR-009 Playlist playback selection

For an imported playlist, the user shall be able to select an imported video and play that specific video.

### FR-010 Remove

The system shall allow an authenticated user to remove a library item they own.

### FR-011 Ownership enforcement

All read, create, and delete operations affecting StudyFlow library data shall be enforced server-side and at the persistence layer where supported.

### FR-012 Idempotent import

For MVP-0.1, importing the same normalized YouTube source twice for the same user shall not create duplicate library items.

Expected behavior: return or surface the existing item as already imported.

### FR-013 Error handling

The system shall distinguish at least these failure classes:

- Invalid URL format.
- Unsupported YouTube URL format.
- YouTube source not found or unavailable.
- Playlist contains inaccessible/deleted/private items.
- External API failure or quota/rate-limit failure.
- Authentication/authorization failure.
- Persistence failure.

Each failure shall produce a non-technical user-facing message and a diagnostic log entry with a correlation/request identifier where applicable.

### FR-014 No silent data loss

A playlist import shall not be reported as successfully completed if required persistence fails partway through the operation.

The implementation shall use a transaction or equivalent compensating strategy so the database does not claim a complete playlist import when child records are incomplete.

### FR-015 No source mutation

StudyFlow shall never modify the user's YouTube video, playlist, channel, or account as part of MVP-0.1 library import or removal.

## 6. Non-Functional Requirements

### NFR-001 Security

- Secrets and API credentials shall remain server-side.
- The browser shall never receive a privileged YouTube API key through source code or public runtime configuration.
- Library operations shall enforce user ownership.
- User input shall be validated at trust boundaries.
- Error responses shall not expose secrets, stack traces, SQL, tokens, or internal implementation details.

### NFR-002 Reliability

- Import operations shall be safe to retry without creating duplicate StudyFlow records.
- Partial playlist imports shall not be presented as successful complete imports.
- Database migrations shall be versioned and reproducible.

### NFR-003 Performance

For normal supported inputs, the application should make the first useful library response quickly and shall not block the browser with large synchronous client-side processing.

For playlists, pagination and server-side processing shall be used when the external API requires multiple pages. The YouTube Data API `playlistItems.list` endpoint supports pagination and returns `nextPageToken` when more results remain. citeturn421196search0

### NFR-004 Accessibility

- Core actions shall be keyboard accessible.
- Form controls shall have accessible labels.
- Focus states shall be visible.
- Error states shall be associated with the relevant control.
- Interactive elements shall have sufficient accessible names.

### NFR-005 Observability

Server-side import failures shall be logged with structured event names and non-sensitive diagnostic context.

### NFR-006 Maintainability

- Domain logic shall be separated from UI rendering.
- External YouTube integration shall be isolated behind a small adapter/service boundary.
- Database access shall be isolated from presentation components.
- Public API contracts shall be typed and validated.

### NFR-007 Browser compatibility

The MVP shall support the latest stable versions of Chrome, Edge, Firefox, and Safari at the time of release, subject to YouTube embed/browser restrictions.

### NFR-008 Legal/content handling

StudyFlow shall use YouTube's supported embed mechanism and shall not download, cache, or redistribute copyrighted video media.

## 7. Acceptance Criteria

### AC-001 Signup and login

Given a new user with valid credentials, when the user signs up, then an authenticated session is established or the user is clearly instructed how to complete any provider-required verification.

Given an existing valid user, when the user signs in, then the user can access their library.

### AC-002 Empty library

Given an authenticated user with no imported items, when the library page loads, then it shows an empty state and an Add Learning Item action.

### AC-003 Video import

Given a valid supported public YouTube video URL, when the user imports it, then exactly one owned library item exists for that normalized source and the item can be opened.

### AC-004 Video playback

Given an imported video, when the user opens it, then StudyFlow renders the corresponding YouTube video in an embedded player.

### AC-005 Playlist import

Given a valid accessible public YouTube playlist URL, when the user imports it, then one playlist library item and its available child videos are persisted for the authenticated user.

### AC-006 Playlist order

Given a playlist whose source order is A, B, C, when imported, then StudyFlow displays A, B, C in that order.

### AC-007 Playlist playback

Given an imported playlist containing A, B, C, when the user selects B, then the embedded player loads B.

### AC-008 Duplicate import

Given an already imported normalized source, when the user submits the same source again, then no second duplicate library item is created.

### AC-009 Remove video

Given an owned video item, when the user confirms removal, then it no longer appears in the user's library.

### AC-010 Remove playlist

Given an owned playlist item, when the user confirms removal, then the playlist and its StudyFlow-owned child records are no longer available through the user's library.

### AC-011 Authorization

Given User B knows User A's library item identifier, when User B requests the item, then the server returns an authorization failure or not-found response without exposing the record.

### AC-012 Invalid URL

Given an unsupported or malformed URL, when the user attempts import, then no library item is created and the UI explains the input problem.

### AC-013 External failure

Given the YouTube integration returns an error, when the import is attempted, then StudyFlow does not create a false-success library item and shows a recoverable error state.

## 8. Success Criteria for MVP-0.1

MVP-0.1 is ready for limited real-user validation when:

- All acceptance criteria pass.
- Automated unit/integration tests cover URL parsing, import idempotency, ordering, ownership, and remove behavior.
- Critical end-to-end journeys pass in CI or an equivalent repeatable environment.
- No known high-severity authorization issue exists.
- The production build succeeds from a clean checkout.
- Required secrets/configuration are documented without exposing secret values.

## 9. Product Decisions

### Decision: YouTube is the content source

StudyFlow stores references and metadata needed for its library experience. It does not become a video hosting platform.

### Decision: Playlist order is source-defined

The imported order is based on the YouTube playlist item position at import time.

### Decision: Removal is StudyFlow-only

Removing an item changes only the user's StudyFlow library. It does not delete or edit YouTube content.

### Decision: MVP does not track watch progress

The user can watch content, but progress persistence is intentionally excluded from MVP-0.1 to keep the first release narrow.

## 10. References

- Design System: StudyFlow design system reference — private design source omitted from the public repository.
- YouTube Data API — Playlist Items: https://developers.google.com/youtube/v3/docs/playlistItems/list
- YouTube IFrame Player / Embed parameters: https://developers.google.com/youtube/player_parameters
- YouTube IFrame Player API reference: https://developers.google.com/youtube/iframe_api_reference
