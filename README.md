# LearnUp

LearnUp is a focused, distraction-free personal learning platform that allows users to organize, structure, and watch educational YouTube content (videos and playlists) in a dedicated private library.

---

## Features (MVP-0.1)

- **Authentication**: Secure email and password signup, signin, and signout powered by Supabase Auth with SSR session handling.
- **Personal Library**: Private collection of learning items isolated per user with Row-Level Security (RLS).
- **YouTube Import**:
  - Direct video import.
  - Full playlist import with pagination.
  - Idempotent imports preventing accidental duplicate entries.
  - Robust error handling for private, deleted, or invalid sources.
- **Ordered Playlist Playback**: Preserves original playlist sequence (`source_position`) with an interactive sidebar to switch videos seamlessly.
- **Distraction-Free Player**: Responsive 16:9 embedded YouTube player adhering to official terms without third-party recommendations or ads.
- **Library Management**: Soft-touch confirmation modal to safely remove items and cleanup associated child records without affecting the original YouTube source.
- **Community Templates & Catalog**: Pre-built study templates and learning blueprints for rapid course setup.
- **Zero-Seed Guarantee**: Clean-slate initialization with zero fabricated user rows on fresh installations.
- **Accessibility & Design**: Built with WCAG AA compliant contrast, full keyboard navigation, visible focus rings, and CSS Module design tokens ready for theme switching.

---

## Tech Stack

| Layer                    | Technology                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| **Framework**            | [Next.js 14](https://nextjs.org/) (App Router)                                                  |
| **Language**             | [TypeScript](https://www.typescriptlang.org/) (Strict mode)                                     |
| **UI & Styling**         | React 18, CSS Modules, CSS Custom Properties (Tokens)                                           |
| **Backend & Database**   | Next.js Route Handlers, Supabase (@supabase/ssr, PostgreSQL with RLS)                           |
| **External Integration** | YouTube Data API v3, YouTube IFrame Player Embed                                                |
| **Validation**           | [Zod](https://zod.dev/)                                                                         |
| **Testing**              | [Vitest](https://vitest.dev/) (Unit & Integration), [Playwright](https://playwright.dev/) (E2E) |
| **Linting & CI**         | ESLint (`next/core-web-vitals`), GitHub Actions                                                 |

---

## Quick Start

### Windows

Double-click:

`setup.bat`

Or run via npm:

`npm run setup`

### macOS / Linux

```bash
chmod +x setup.sh
./setup.sh
```

Then open:
[http://localhost:3000](http://localhost:3000)

**How it works:**

- **Local Development:** Uses local Supabase. Docker Desktop is required. The setup script will start your local database and automatically generate a `.env.local` file. You do NOT need the maintainer's Supabase account.
- **Hosted SaaS (Production):** Uses a hosted Supabase project. Supply your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your deployment environment (e.g., Vercel).
- **Secrets:** `.env.local` is generated locally and never committed to Git.

### Troubleshooting

- **Docker not running:** The setup script will halt if Docker is offline. Please start Docker Desktop and run the script again.
- **Port 54321 already in use:** Local Supabase requires port 54321. Stop any competing services using this port.
- **Missing Node.js:** The setup requires Node.js v20.x or higher. Please download from [nodejs.org](https://nodejs.org/).
- **Supabase startup/migration failure:** If `npx supabase start` fails, try resetting the container with `npm run db:reset` (warning: deletes local data).

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Unauthenticated visits will redirect to `/login`.

---

## Available Scripts

| Command             | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `npm run dev`       | Starts local Next.js development server on port 3000               |
| `npm run build`     | Builds optimized production bundle                                 |
| `npm run start`     | Runs production build locally                                      |
| `npm run lint`      | Runs ESLint checks                                                 |
| `npx tsc --noEmit`  | Validates TypeScript types across the entire codebase              |
| `npm test`          | Runs all Vitest unit and integration tests                         |
| `npm run seed:demo` | Seeds local development database with sample courses (opt-in)      |
| `npm run test:e2e`  | Runs Playwright end-to-end browser tests                           |
| `npm run test:all`  | Complete CI verification (`lint` → `typecheck` → `test` → `build`) |

---

## Project Structure

```
LearnUp/
├── .github/workflows/ci.yml       # GitHub Actions automated CI pipeline
├── app/
│   ├── (auth)/                    # Public auth pages (login, signup)
│   ├── (app)/                     # Protected application pages (library, [id], calendar, etc.)
│   ├── api/learning-items/        # Protected REST API routes
│   ├── globals.css                # Semantic CSS tokens & theme architecture
│   ├── layout.tsx                 # Root application shell
│   └── page.tsx                   # Landing redirector
├── components/
│   ├── auth/                      # LoginForm, SignupForm
│   ├── library/                   # LibraryGrid, LibraryCard, ImportModal, DeleteConfirmModal
│   ├── player/                    # YouTubePlayer, PlaylistSidebar
│   ├── layout/                    # Authenticated Header & Sidebar
│   └── ui/                        # Reusable primitives (Button, Input, Card, Modal, Alert, etc.)
├── lib/
│   ├── api/                       # Typed client-side API wrappers
│   ├── connectors/                # Third-party plugin integrations (Anki, Notion, Obsidian, etc.)
│   ├── db/                        # Database repository and query abstractions
│   ├── hooks/                     # Custom React hooks (useLibrary, useImport, useDelete, etc.)
│   ├── services/                  # Business logic (ImportService, LibraryService)
│   ├── supabase/                  # Browser, server, and middleware Supabase clients
│   ├── templates/                 # Static community learning templates
│   ├── types/                     # Shared domain interfaces and schemas
│   ├── utils/                     # Helper utilities (URL validation)
│   └── youtube/                   # YouTube Data API adapter
├── tests/
│   ├── unit/                      # Unit tests (parsers, metadata mapping, zero-seed invariant)
│   ├── integration/               # Integration tests (API endpoints, QA suite, auth hooks)
│   └── e2e/                       # Playwright E2E tests (auth, library, import, player, delete)
├── docs/                          # PRD, Architecture, API specification, and MVP contracts
└── supabase/migrations/           # PostgreSQL DDL migrations & Row-Level Security policies
```

---

## Architecture & Security Boundaries

1. **Authentication & Data Isolation**: All library operations derive the current user identity from the trusted session token (`requireAuth`). Client-supplied `user_id` values are never trusted. Row-Level Security (RLS) ensures users cannot read, mutate, or delete another user's records.
2. **Credential Separation**: `YOUTUBE_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remain strictly server-side. The frontend only communicates with Next.js route handlers (`/api/*`) via standard Bearer tokens.
3. **YouTube Integration Adapter**: All external provider communication is isolated in `lib/youtube/` behind structured domain interfaces, converting external provider failures into stable internal error codes (`SOURCE_NOT_FOUND`, `SOURCE_UNAVAILABLE`, `IMPORT_FAILED`).
4. **Media Integrity**: LearnUp strictly embeds videos via the official YouTube IFrame player and never proxies or downloads video stream bytes.
5. **Zero-Seed Guarantee**: Database migrations create schemas, tables, views, and RLS policies only. A fresh install contains zero pre-seeded user records.

---

## Documentation

- [Product Requirements Document (PRD)](docs/PRD.md)
- [MVP Specification](docs/MVP.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [API Contract Specification](docs/API.md)
- [Community Templates Guide](docs/COMMUNITY_TEMPLATES.md)
- [Plugins & Connectors Architecture](docs/PLUGINS.md)
- [Demo Data & Zero-Seed Invariant](docs/DEMO_DATA.md)
- [AI Coding Agent Guidelines](AGENTS.md)

---

## Contributing & Governance

- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)

---

## License

LearnUp is open-source software licensed under the [MIT License](LICENSE).
