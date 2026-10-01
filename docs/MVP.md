# LearnUp — MVP Definition

**Release:** MVP-0.1
**Scope:** Authentication + YouTube import + library + embedded playback + removal

## 1. MVP Objective

Validate one behavior end-to-end:

> A signed-in learner can bring a YouTube learning source into LearnUp and watch it from a private LearnUp library.

The MVP must be small enough for a first production release and complete enough to test real user behavior.

## 2. MVP Feature Set

| Area | Included | Explicit boundary |
|---|---|---|
| Authentication | Sign up, sign in, sign out, session | No social login requirement unless selected later as an implementation detail |
| Video import | Paste supported YouTube video URL | No arbitrary video hosting |
| Playlist import | Paste supported YouTube playlist URL | No editing the source playlist |
| Library | List current user's imported items | No recommendations |
| Playlist contents | Show imported videos in source order | No reorder/edit feature |
| Playback | YouTube embedded player | No video download/rehosting |
| Removal | Remove owned LearnUp item | Does not delete YouTube content |
| Data isolation | User-owned data only | No shared/public library |

## 3. User Stories

### US-001 — Create account

As a new learner, I want to create an account so my LearnUp library is private and persistent.

**Acceptance:** Valid signup creates/authenticates a user; invalid input produces a clear error; no library data is created for an unauthenticated identity.

### US-002 — Sign in

As a returning learner, I want to sign in so I can access my library.

**Acceptance:** Valid credentials grant access to the authenticated library; invalid credentials do not.

### US-003 — Import video

As a learner, I want to paste a YouTube video URL so I can add that video to LearnUp.

**Acceptance:** A valid supported URL creates one owned item and the item can be opened.

### US-004 — Import playlist

As a learner, I want to paste a YouTube playlist URL so I can access its videos as one LearnUp learning item.

**Acceptance:** The playlist and its available child videos are stored and displayed in source order.

### US-005 — Watch content

As a learner, I want to open an imported item and watch the YouTube content inside LearnUp.

**Acceptance:** Selecting an imported video displays the corresponding embedded YouTube player.

### US-006 — Remove content

As a learner, I want to remove a learning item from my library when I no longer need it.

**Acceptance:** Confirmed removal hides the item from the user's library and does not affect YouTube.

## 4. MVP Domain Model

### User

Owned by the authentication system.

Minimum logical fields:

- `id`
- authentication-provider metadata as required by the selected auth system
- timestamps as required by implementation

### Learning Item

Represents one imported LearnUp source.

Minimum logical fields:

- `id`
- `user_id`
- `type`: `video | playlist`
- `source_url`
- normalized source identifier(s)
- title
- thumbnail reference if available
- created timestamp
- updated timestamp

### Learning Item Video

Represents a video belonging to an imported playlist.

Minimum logical fields:

- `id`
- `learning_item_id`
- `youtube_video_id`
- title
- thumbnail reference if available
- `source_position`

For a direct video item, the implementation may either use a dedicated direct-video field on `learning_items` or a unified child-video model, provided the external API contract and database invariants remain clear. The implementation must choose one model and document it before coding.

## 5. MVP State Rules

### Learning item states

The product may internally use statuses such as `importing`, `ready`, and `failed` to make import behavior observable and recoverable.

Minimum externally visible success state: `ready`.

A failed import shall not be presented as a successfully playable item.

### Import idempotency

A normalized source is unique per user for MVP-0.1.

Examples:

- Same video URL with harmless URL variations → same source identity.
- Same playlist URL with harmless URL variations → same source identity.

## 6. MVP Screens / Views

### Public

- Landing/sign-in entry.
- Sign-up.
- Sign-in.

### Authenticated

- Library/dashboard.
- Add/import form.
- Video learning view.
- Playlist learning view.
- Confirmation/error states.

The product does not require additional navigation sections for excluded features.

## 7. MVP Operational Rules

1. User input is treated as untrusted.
2. URL parsing and source identification happen on a trusted server boundary.
3. YouTube API credentials are never exposed to the browser.
4. Playlist imports must handle pagination.
5. Playlist source order must be persisted explicitly.
6. All library queries are scoped to the authenticated user.
7. Remove operations are ownership-checked.
8. External YouTube content is embedded, not copied.
9. Duplicate imports do not create duplicate library items.
10. Failed external API calls never become successful library records.

## 8. MVP Exit Criteria

MVP-0.1 can be declared complete only when:

- The five MVP user stories pass acceptance testing.
- The complete happy path works from signup → import → library → play → remove.
- Playlist ordering is verified with a multi-item playlist.
- Duplicate import behavior is verified.
- Cross-user authorization is verified.
- External integration failure behavior is verified.
- Production build/deployment validation passes.
- No excluded feature has been introduced as a dependency of the MVP.

## 9. Explicit Non-MVP Backlog

These belong to later releases and shall not block MVP-0.1:

- Watch-progress persistence.
- Continue-watching.
- Notes.
- Bookmarks.
- Quizzes.
- AI assistant.
- Calendar/planning.
- Streaks.
- Leaderboards.
- Social features.
- Notifications.
- Recommendations.
- Gamification.
- Learning analytics.
- Career roadmaps.
