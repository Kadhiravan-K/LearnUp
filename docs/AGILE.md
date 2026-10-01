# LearnUp — Agile Delivery Guide

**Release target:** MVP-0.1
**Development model:** Small, independently reviewable GitHub issues implemented with AI coding agents and human approval.

## 1. Agile Principles for This Project

1. Build the smallest testable increment.
2. Keep issues small enough to finish without a large speculative refactor.
3. Treat the PRD, architecture, and acceptance criteria as the contract.
4. Prefer vertical slices once foundational database/API boundaries exist.
5. Every change must be reviewable by a human.
6. AI agents implement and verify; humans own product decisions.
7. Do not add features because they are technically convenient.

## 2. Work Hierarchy

Use this structure in GitHub:

**Epic → Story/Issue → Pull Request → Tests → Merge**

For MVP-0.1, epics are organized as:

- E1 — Product and repository foundation
- E2 — Authentication
- E3 — Database and data ownership
- E4 — YouTube integration
- E5 — Import workflows
- E6 — Library UI
- E7 — Playback
- E8 — Removal and failure handling
- E9 — Quality, security, deployment

## 3. Recommended Sprint Structure

### Sprint 0 — Foundation

Outputs:

- Approved PRD/MVP/architecture/agent rules.
- Repository structure.
- Environment strategy.
- CI baseline.
- Issue backlog.

### Sprint 1 — Auth + Database

Outputs:

- Authentication working.
- Core tables/migrations created.
- Ownership enforcement tested.

### Sprint 2 — YouTube Integration + Import

Outputs:

- URL parser.
- YouTube source resolver.
- Video import.
- Playlist import.
- Playlist order persistence.
- Import error handling.

### Sprint 3 — Library + Playback

Outputs:

- Library page.
- Learning item detail/player.
- Playlist video selection.

### Sprint 4 — Remove + QA + Release

Outputs:

- Remove flow.
- Duplicate import handling.
- Security tests.
- E2E tests.
- Deployment validation.
- MVP release candidate.

## 4. Issue Writing Standard

Every implementation issue must contain:

### Context

Why the issue exists.

### Scope

Exact files/layers/features expected to change.

### Acceptance criteria

Observable conditions that prove completion.

### Non-goals

Features/refactors explicitly excluded from the issue.

### Test requirements

Tests the agent must create or update.

### Verification

Commands or checks the agent must run before requesting review.

## 5. Definition of Ready

An issue is **Ready** only when:

- The user/business outcome is explicit.
- Scope is defined.
- Dependencies are known.
- Acceptance criteria are testable.
- Data/API changes are described if applicable.
- Security/ownership implications are identified if applicable.
- Non-goals are stated.
- Required design reference is identified if UI work is involved.
- Test expectations are stated.
- The issue is small enough for one focused PR or can be deliberately split into smaller issues.

## 6. Definition of Done

An issue is **Done** only when all applicable conditions are true:

- Acceptance criteria pass.
- Automated tests pass.
- Relevant regression tests exist.
- Lint/type checking pass.
- Production build passes.
- Security/ownership checks pass for affected boundaries.
- No secrets are committed.
- Documentation is updated when behavior/contracts change.
- The PR is reviewed by a human.
- The issue is linked to the PR.
- Known limitations are documented.

## 7. Git Workflow

### Branches

Use:

- `main` — releasable code.
- `develop` — integration branch, if the team decides it is necessary.
- `feature/SF-<issue>-short-name`
- `fix/SF-<issue>-short-name`
- `chore/SF-<issue>-short-name`

For a small team, direct feature branches from `main` into PRs are acceptable and simpler; do not maintain a long-lived `develop` branch unless there is a real need.

### Pull requests

Every implementation change must use a PR unless it is a documented repository bootstrap action.

PR must include:

- What changed.
- Why it changed.
- Tests run.
- Screenshots for meaningful UI changes.
- Database migration notes when applicable.
- API contract changes when applicable.
- Known limitations.

### Commit style

Use concise conventional prefixes:

- `feat:` new user-visible capability.
- `fix:` bug correction.
- `test:` tests only.
- `refactor:` behavior-preserving structural change.
- `docs:` documentation only.
- `chore:` tooling/configuration.

Prefer one logical change per commit when practical.

## 8. AI Agent Development Cycle

For every issue:

1. Read `AGENTS.md`.
2. Read relevant docs before editing code.
3. Inspect the existing implementation.
4. State the intended change internally using the issue acceptance criteria.
5. Make the smallest change that satisfies the issue.
6. Add/update tests.
7. Run focused tests.
8. Run broader validation required by the issue.
9. Review the diff for accidental scope expansion.
10. Report changed files, tests, and known limitations.

An agent must not reinterpret a vague requirement by inventing a product feature. Missing product decisions must be surfaced for human resolution.

## 9. Testing Strategy

### Unit tests

Use for deterministic domain logic:

- YouTube URL parsing.
- Source ID normalization.
- Duplicate detection.
- Playlist ordering calculation.
- Input validation.

### Integration tests

Use for boundaries:

- Authenticated database access.
- User ownership rules.
- Video import persistence.
- Playlist import transactionality.
- YouTube adapter behavior using mocks/fixtures.
- Remove behavior.

### End-to-end tests

Minimum critical journey:

1. Sign up/sign in.
2. Import a known test video.
3. Confirm it appears in the library.
4. Open the item.
5. Verify the YouTube player container is rendered.
6. Remove the item.
7. Confirm it is absent from the library.

Playlist E2E:

1. Import a controlled test playlist.
2. Verify multiple videos appear.
3. Verify source order.
4. Select a non-first video.
5. Verify the player target changes.
6. Remove the playlist.

### Security tests

At minimum:

- Cross-user read denial.
- Cross-user remove denial.
- Unauthenticated operation denial.
- Input validation.
- Secret leakage checks in client bundles/logs.

### Contract tests

When external or internal APIs are formalized, test required fields, error shapes, and validation behavior.

## 10. Release Rule

No MVP release is allowed solely because the happy path works manually. The release candidate must pass automated critical-path, authorization, and import failure tests.

## 11. Backlog Grooming Rule

Before implementation starts on an issue, agents and humans should confirm:

- no duplicate issue exists;
- dependencies are complete;
- acceptance criteria are objective;
- the issue does not silently expand MVP scope.

## 12. Proposed Backlog

Detailed GitHub issues are defined in `AGENTS.md` appendix and should be copied into GitHub as individual issues rather than one large implementation task.
