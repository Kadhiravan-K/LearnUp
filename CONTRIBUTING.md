# Contributing to LearnUp

Thank you for your interest in contributing to LearnUp! We welcome contributions from the community to help make LearnUp the best distraction-free learning management and knowledge workspace.

Please review this guide before submitting issues or pull requests.

---

## Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior according to the instructions in that document.

---

## Development Setup

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Supabase CLI**: Optional for local database testing (`brew install supabase/tap/supabase` or `scoop bucket add supabase && scoop install supabase`)
- **Docker Desktop**: Optional, required only for running local Supabase emulator

### Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Kadhiravan-K/LearnUp.git
   cd LearnUp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in the required Supabase and provider keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `YOUTUBE_API_KEY` (optional for YouTube metadata resolution)

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Database & Data Invariants

1. **Zero-Seed Invariant**:
   - A fresh database setup must have **zero pre-seeded user rows or fabricated personal data**.
   - Production/test initialization migrations should create schemas, tables, views, and RLS policies only.
   - For local development and demonstration with sample courses, use the explicit opt-in script:
     ```bash
     npm run seed:demo
     ```

2. **Row-Level Security (RLS)**:
   - All tables holding user data (`learning_items`, `progress_records`, `notes`, `bookmarks`, `user_settings`, `focus_sessions`, `calendar_events`) must have RLS enabled.
   - Policies must strictly enforce `auth.uid() = user_id`.
   - Never trust client-supplied user identifiers.

3. **Database Migrations**:
   - All schema changes must be committed as versioned migration scripts in `supabase/migrations/`.
   - Migrations must be idempotent and reproducible from a clean database state.

---

## Testing & Quality Gates

Before opening a pull request, ensure all tests, type checks, and builds pass:

```bash
# Run unit & integration tests
npm test -- --run

# Run TypeScript type check
npx tsc --noEmit

# Run Next.js production build
npm run build

# Run Playwright end-to-end tests (optional, requires test environment)
npx playwright test
```

---

## Coding Standards

- **TypeScript Strict Mode**: No `any` types unless strictly required and justified.
- **Component Architecture**: Keep visual presentation and business logic separated.
- **Accessibility**: Ensure keyboard navigation, ARIA attributes, and high contrast compliance.
- **Sanitization & Security**: Never commit secret keys, private credentials, or personal email addresses. Use environment variables for sensitive configuration.

---

## Pull Request Workflow

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make changes following our coding and architecture rules.
3. Write comprehensive unit or integration tests for new functionality.
4. Run all verification commands (`npm test -- --run`, `npx tsc --noEmit`, `npm run build`).
5. Commit your changes with clear, descriptive commit messages:
   - `feat: add community template search filter`
   - `fix: correct playlist pagination boundary calculation`
   - `docs: update connector configuration guide`
6. Push your branch to your fork and submit a Pull Request against `main`.

Thank you for contributing to LearnUp!
