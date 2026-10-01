# LearnUp Deployment Guide

This document outlines the deployment architecture and standard operating procedures for LearnUp from local development to production.

## Architecture

- **Frontend / API:** Next.js 14 App Router, deployed on [Vercel](https://vercel.com).
- **Database / Auth:** PostgreSQL and Supabase Auth, hosted on [Supabase](https://supabase.com).
- **Source Control:** GitHub.
- **CI/CD:** GitHub Actions (Quality Gate) + Vercel (Deployment).

## Deployment Flow: Local → Preview → Production

### 1. Local Development
- Run `npm run dev` to start the Next.js server.
- Run `npx supabase start` to run the local Postgres DB, Auth, and Storage emulator.
- Apply migrations automatically on start, or using `npx supabase migration up`.

### 2. Preview Environment
Every Pull Request to `main` or `develop` triggers a Vercel Preview deployment.

1. **GitHub PR Created:** Vercel intercepts the PR and begins a build.
2. **Quality Gate:** GitHub Actions runs `ci.yml` (Lint, Typecheck, Unit, E2E tests). E2E runs against the local Supabase instance.
3. **Database (Preview):** Supabase provides database branching. Connect Vercel to a Supabase Preview Branch URL if testing schema changes, or test UI changes against a shared staging environment.
4. **Auth Redirects:** Supabase must be configured to allow wildcard subdomains for Vercel preview branches (e.g., `https://*-LearnUp.vercel.app/**`) in the redirect URIs list.

### 3. Production Deployment
Merging into `main` automatically triggers a Vercel Production deployment.

#### Steps for Initial Production Setup

1. **Supabase Production Project:**
   - Create a new project in the Supabase Dashboard.
   - Run `npx supabase login`.
   - Link the project: `npx supabase link --project-ref <your-project-ref>`.
   - Push migrations: `npx supabase db push`.
   - Set up Auth Redirects:
     - **Site URL:** `https://LearnUp.app` (or your custom domain).
     - **Redirect URIs:** `https://LearnUp.app/auth/callback`.

2. **Vercel Production Project:**
   - Import the GitHub repository in Vercel.
   - Override the build command to standard `npm run build` if not automatically detected.
   - Add the Production Environment Variables (see `PRODUCTION_CHECKLIST.md`).
   - Ensure a Custom Domain is assigned (Vercel automatically provisions SSL/HTTPS certificates via Let's Encrypt).

## Rollback Strategy

If a critical issue is discovered in production, follow these steps:

### 1. Application Rollback (Vercel)
Vercel allows "Instant Rollbacks" to previous deployments.
1. Navigate to the **Deployments** tab in the Vercel Dashboard.
2. Locate the last known good deployment (prior to the breaking merge).
3. Click the three dots (⋮) and select **Promote to Production** (or **Assign Custom Domains**).
4. The DNS will switch instantly, reverting the application code without re-running the build.

### 2. Database Rollback (Supabase)
Only rollback the database if the application rollback requires a previous schema state.
1. **Point-In-Time Recovery (PITR):** If enabled on your Supabase Pro plan, you can restore the database to the exact minute before the bad migration was applied directly from the dashboard.
2. **Manual Down Migration:** If PITR is not available, you must write a manual SQL script to revert the schema changes and apply it via the SQL Editor or `npx supabase db push` from a reverted git state. *Warning: Down migrations can cause data loss. Always take a manual backup before proceeding.*
