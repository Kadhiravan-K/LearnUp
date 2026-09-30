# StudyFlow — AI Coding Agent Rules

This file is the operating contract for AI coding agents working in the StudyFlow repository.

## 1. Mission

Build only the requested product behavior, prove it with tests, and preserve clear architecture boundaries.

AI agents are implementation and verification assistants. Human maintainers own product decisions, security review, merge approval, and release decisions.

## 2. Required Reading Order

Before changing code, an agent must read:

1. `AGENTS.md`
2. The relevant requirement in `docs/PRD.md` and/or `docs/MVP.md`
3. The relevant architecture section in `docs/ARCHITECTURE.md`
4. The issue description and acceptance criteria
5. Existing code/tests in the affected area

Do not start implementation from a one-line issue title when supporting context is available.

## 3. Scope Control

An agent must:

- implement only the issue's requested scope;
- avoid unrelated refactors;
- reuse existing utilities when appropriate;
- create new abstractions only when they clarify a real boundary;
- preserve existing behavior outside the issue;
- stop and surface an ambiguity rather than inventing a product requirement.

An agent must not add:

- AI;
- quizzes;
- calendar features;
- leaderboards;
- streaks;
- social communication;
- notifications;
- recommendations;
- gamification;
- roadmap generation;
- analytics or other post-MVP product systems.

## 4. Product Source of Truth

Priority order for conflicting instructions:

1. Explicit human instruction in the current task.
2. Approved acceptance criteria.
3. `docs/PRD.md`.
4. `docs/MVP.md`.
5. `docs/ARCHITECTURE.md`.
6. Existing implementation.
7. Agent assumptions.

The agent must never silently override a higher-priority product requirement.

## 5. Database Rules

1. Never modify production schema manually without a migration.
2. Every schema change must be reproducible from a clean database.
3. Add constraints for important invariants where feasible.
4. Ownership rules must be enforced server-side and, where supported, at the database/RLS layer.
5. Never trust a client-supplied `user_id` for authorization.
6. Do not weaken or bypass row-level security to make a feature work.
7. Do not delete user data as a side effect unless the issue explicitly requires it.
8. A StudyFlow remove operation must not modify the original YouTube source.
9. Test cross-user access for every new protected query/mutation.

## 6. YouTube Integration Rules

1. Keep YouTube integration behind a dedicated adapter/service boundary.
2. Do not spread raw YouTube SDK response types across the application.
3. Normalize input URLs before identity/duplicate checks.
4. Handle playlist pagination.
5. Preserve playlist source positions explicitly.
6. Make import retries idempotent.
7. Do not download or rehost YouTube video media.
8. Never expose privileged YouTube API credentials to the browser.
9. Convert external errors into stable internal error codes.
10. Do not assume every playlist item is accessible.

## 7. API Rules

- Define request/response schemas for non-trivial boundaries.
- Validate all external input.
- Use stable error codes.
- Never return stack traces or secrets to clients.
- Do not expose unnecessary third-party payloads.
- Do not create an API endpoint solely because it is convenient for the frontend; first verify the domain operation requires it.

## 8. Authentication and Authorization Rules

- Protected library operations require an authenticated session.
- Derive the current user from the trusted session.
- Every library read/mutation must be scoped to that user.
- A user must never be able to fetch or delete another user's learning item by changing an identifier.
- Use deny-by-default authorization behavior.

## 9. Frontend Rules

- UI components must not contain privileged integration logic.
- Do not duplicate business rules in multiple components.
- Form validation should provide immediate useful feedback where appropriate, but server-side validation remains authoritative.
- Loading, empty, success, and error states are required for asynchronous MVP flows.
- Preserve keyboard accessibility.
- Do not add navigation for excluded features.
- Avoid heavy client-side libraries unless an existing dependency or a documented requirement justifies them.

## 10. Testing Rules

Every feature issue must add or update tests.

### Minimum expectations

- Pure logic → unit test.
- Database boundary → integration test.
- Authorization → negative test.
- External provider integration → mocked/fixture-based integration test.
- Critical user journey → E2E test.
- Bug fix → regression test that fails before the fix when practical.

Do not delete a failing test to make CI green.

## 11. Error Handling Rules

Use explicit error categories rather than generic catch-and-ignore logic.

For user-facing flows:

- explain what the user can do next;
- avoid exposing internals;
- preserve a diagnostic identifier when practical.

For server logs:

- include operation name;
- include safe correlation context;
- include external status/error code where appropriate;
- exclude secrets/tokens.

## 12. Security Rules

An agent must never:

- commit secrets;
- hard-code API keys;
- print authentication tokens;
- bypass authorization checks;
- disable security controls merely to pass tests;
- add an insecure fallback without explicit human approval.

Use `.env.example` for variable names only.

## 13. Dependency Rules

Before adding a dependency:

1. Check whether existing project dependencies already solve the need.
2. Check whether the platform/framework already provides the capability.
3. Prefer a small, maintained dependency with a clear reason.
4. Document why a material dependency was added.

Do not introduce a large library for a single small utility.

## 14. Refactoring Rules

- No drive-by refactors.
- No whole-project rewrites for localized problems.
- No architecture changes inside a feature issue unless architecture is part of the issue.
- Preserve public behavior during refactors unless explicitly requested.
- Split large refactors into separate issues when practical.

## 15. Git Rules

Branch naming:

```text
feature/SF-123-short-name
fix/SF-456-short-name
chore/SF-789-short-name
```

Commit prefixes:

```text
feat:
fix:
test:
refactor:
docs:
chore:
```

Rules:

- Do not commit directly to `main` for normal feature work.
- Keep one issue's implementation focused in its PR.
- Do not force-push shared branches without human approval.
- Keep generated/build artifacts out of source control unless explicitly required.

## 16. Required Verification Before PR

The agent must run the checks applicable to the changed area, normally including:

- lint;
- type checking;
- unit tests;
- integration tests for affected boundaries;
- E2E tests for critical flow changes;
- production build.

If a check cannot be run, the agent must report why rather than claiming success.

## 17. PR Description Requirements

The agent must report:

- Summary.
- Issue ID.
- Files changed.
- Database changes.
- API changes.
- Tests added/updated.
- Verification commands and results.
- Security considerations.
- Known limitations.

## 18. Definition of Ready

An issue is ready for an AI coding agent when:

- the user outcome is stated;
- scope is explicit;
- acceptance criteria are testable;
- non-goals are explicit;
- dependencies are known;
- architecture impact is known;
- test expectations are known;
- design references are supplied for UI work;
- the issue can be completed without inventing a missing product decision.

## 19. Definition of Done

An issue is done when:

- all acceptance criteria pass;
- tests are added/updated;
- applicable automated checks pass;
- authorization is tested where relevant;
- no secret is introduced;
- documentation/contracts are updated when behavior changes;
- the diff has no accidental feature work;
- a human reviewer can understand the change and verification result;
- the PR is approved and merged according to repository policy.

## 20. Agent Reporting Template

At the end of an implementation task, report:

```text
Implemented
- <brief result>

Changed
- <file 1>
- <file 2>

Database
- <none or migration summary>

API
- <none or contract summary>

Tests
- <tests added/updated>

Verification
- <commands and results>

Known limitations
- <none or list>
```

Never report a check as passed unless the command actually completed successfully.

# 21. Proposed GitHub Backlog — MVP-0.1

Create these as separate small issues.

## Epic E1 — Foundation

### SF-001 — Create repository documentation baseline

**Scope:** Add PRD, MVP, Agile, architecture, and AGENTS documentation.

**Acceptance:** All five files exist; no application code is introduced; documents agree on MVP boundaries.

**Labels:** `docs`, `foundation`

### SF-002 — Bootstrap project and CI

**Scope:** Create the agreed application shell, package configuration, lint/typecheck/test/build commands, and CI.

**Acceptance:** Clean checkout installs; CI runs required checks; no product feature behavior required.

**Labels:** `chore`, `foundation`

## Epic E2 — Authentication

### SF-003 — Configure authentication provider

**Scope:** Implement selected auth provider configuration.

**Acceptance:** Valid signup/signin creates an authenticated session; invalid auth fails safely.

**Labels:** `auth`, `backend`

### SF-004 — Protect authenticated application area

**Scope:** Add route/session protection for library features.

**Acceptance:** Unauthenticated users cannot access protected library operations.

**Labels:** `auth`, `security`

## Epic E3 — Database and Ownership

### SF-005 — Create learning item schema migration

**Scope:** Create core learning item tables/constraints from architecture decisions.

**Acceptance:** Migration succeeds from clean state; source type and ownership invariants are enforced.

**Labels:** `database`

### SF-006 — Add playlist child-video schema

**Scope:** Add playlist child rows and source-order constraints.

**Acceptance:** Child rows require a valid parent playlist and deterministic `source_position`.

**Labels:** `database`

### SF-007 — Add ownership/RLS tests

**Scope:** Verify User A cannot read/update/delete User B's learning items.

**Acceptance:** Negative tests fail access reliably.

**Labels:** `security`, `database`, `test`

## Epic E4 — YouTube Integration

### SF-008 — Implement YouTube URL parser

**Scope:** Parse and classify supported video/playlist URLs.

**Acceptance:** Supported URLs produce canonical source IDs; unsupported/malformed URLs produce typed validation errors.

**Labels:** `youtube`, `backend`, `test`

### SF-009 — Implement YouTube Data API adapter

**Scope:** Add server-side adapter for required video/playlist metadata calls.

**Acceptance:** Adapter returns internal normalized models and hides raw provider response types.

**Labels:** `youtube`, `backend`

### SF-010 — Implement playlist pagination

**Scope:** Follow playlist pagination until completion or defined failure.

**Acceptance:** Test fixture spanning multiple pages imports all available items exactly once.

**Labels:** `youtube`, `backend`, `test`

## Epic E5 — Import Workflows

### SF-011 — Implement video import service

**Scope:** Create one owned learning item from a valid video source.

**Acceptance:** Valid import persists correct source ID/metadata; invalid source does not persist a success record.

**Labels:** `backend`, `youtube`

### SF-012 — Implement playlist import transaction

**Scope:** Persist playlist parent and child videos transactionally.

**Acceptance:** Complete import is `ready`; simulated failure does not leave a false-success partial import.

**Labels:** `backend`, `database`, `youtube`

### SF-013 — Add import idempotency

**Scope:** Prevent duplicate source imports per user.

**Acceptance:** Repeating the same normalized import returns/exposes the existing StudyFlow item and creates no duplicate.

**Labels:** `backend`, `database`, `test`

### SF-014 — Add import error mapping

**Scope:** Map provider, validation, authorization, and persistence errors to stable app error codes.

**Acceptance:** UI-safe error messages are produced without leaking internals.

**Labels:** `backend`, `security`

## Epic E6 — Library UI

### SF-015 — Build authenticated library shell

**Scope:** Render the user's library with loading, empty, success, and error states.

**Acceptance:** Only current user's items render; empty state offers Add Learning Item.

**Labels:** `frontend`

### SF-016 — Build add/import form

**Scope:** URL input and import submission flow.

**Acceptance:** User can submit video/playlist URLs and see validation/loading/success/error states.

**Labels:** `frontend`, `youtube`

### SF-017 — Render video library item

**Scope:** Display a direct-video learning item and open action.

**Acceptance:** Correct item opens its learning view.

**Labels:** `frontend`

### SF-018 — Render playlist learning item and child list

**Scope:** Display playlist metadata and imported child videos in `source_position` order.

**Acceptance:** UI order exactly matches persisted source order.

**Labels:** `frontend`, `youtube`

## Epic E7 — Playback

### SF-019 — Add YouTube embedded player

**Scope:** Render the official YouTube embed for a selected video.

**Acceptance:** Correct video ID is used; player container renders; StudyFlow does not proxy video bytes.

**Labels:** `frontend`, `youtube`

### SF-020 — Add playlist video selection

**Scope:** Allow selecting an imported playlist child to change the player target.

**Acceptance:** Selecting each child loads the corresponding video ID.

**Labels:** `frontend`, `youtube`, `test`

## Epic E8 — Removal

### SF-021 — Implement remove learning item service

**Scope:** Delete owned StudyFlow item with correct child cleanup.

**Acceptance:** User can remove own item; unauthorized removal fails; YouTube source remains unchanged.

**Labels:** `backend`, `security`, `database`

### SF-022 — Add remove confirmation UI

**Scope:** Confirmation dialog/action and post-delete state.

**Acceptance:** Cancel preserves item; confirm removes it and refreshes library state.

**Labels:** `frontend`

## Epic E9 — Quality and Release

### SF-023 — Add critical end-to-end tests

**Scope:** Automate signup/signin, video import, playlist import/order, playback view, and removal journeys.

**Acceptance:** Critical journeys pass consistently in CI/test environment.

**Labels:** `test`, `e2e`

### SF-024 — Add security regression suite

**Scope:** Unauthenticated and cross-user access tests for all protected library operations.

**Acceptance:** All protected operations deny unauthorized access.

**Labels:** `security`, `test`

### SF-025 — Production configuration and secrets checklist

**Scope:** Document environment variables, secret ownership, and deployment configuration without exposing values.

**Acceptance:** New environment can be configured from documentation; no secret values are stored in Git.

**Labels:** `chore`, `security`, `docs`

### SF-026 — MVP release candidate verification

**Scope:** Run full lint/typecheck/unit/integration/E2E/build suite and validate MVP acceptance criteria.

**Acceptance:** All required checks pass and a human release owner signs off.

**Labels:** `release`, `test`

## Figma Implementation Rules

Figma is the visual source of truth for the StudyFlow frontend.

Before implementing any Figma-based UI:

1. Read docs/PRD.md.
2. Read docs/MVP.md.
3. Read docs/ARCHITECTURE.md.
4. Read the relevant Figma frame.
5. Inspect the Figma design context.
6. Inspect the Figma screenshot.
7. Reuse existing project components where possible.
8. Do not invent new visual styles when an existing Figma component exists.
9. Do not implement features outside MVP-0.1.
10. Do not convert future Figma screens into MVP functionality.
11. Preserve responsive behavior from the Figma design.
12. Use semantic design tokens instead of arbitrary hardcoded values.
13. Match typography, spacing, colors, borders, radius and component states.
14. Implement loading, empty and error states where specified.
15. Validate the implementation against the Figma design before completing the issue.

### Figma → Code Priority

When implementing frontend UI:

1. MVP requirements define behavior.
2. Figma defines visual appearance.
3. Architecture defines technical boundaries.
4. Existing code/design-system components should be reused.
5. AI must not invent product behavior.