# LearnUp Production Pre-Flight Checklist

Use this checklist before authorizing the MVP-0.1 release to the public.
Design Reference: LearnUp design system reference — private design source omitted from the public repository.

## 1. Environment Variables Configured (Vercel)
Ensure the following variables are set correctly across **Preview** and **Production** environments in Vercel:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`: Points to the correct Supabase instance (Staging for Preview, Prod for Production). **(Safe for browser exposure)**
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The publishable anon key. **(Safe for browser exposure)**
- [ ] `SUPABASE_SERVICE_ROLE_KEY`: Used for backend admin bypass (e.g., webhooks, restricted routes). **(CRITICAL: Server-side ONLY. Do not prefix with `NEXT_PUBLIC_`)**
- [ ] `YOUTUBE_API_KEY`: Used by the backend to fetch video/playlist data. **(CRITICAL: Server-side ONLY. Do not prefix with `NEXT_PUBLIC_`)**

## 2. Supabase Configuration (Database & Auth)
- [ ] **Database Migrations:** `npx supabase db push` successfully applied `20230924000100_init.sql` (and any subsequent migrations) to the production project.
- [ ] **Row Level Security (RLS):** Policies are active. `learning_items` and `learning_item_videos` tables strictly filter by `auth.uid() = user_id`. No policies permit cross-user access.
- [ ] **Site URL:** Supabase Auth > URL Configuration > Site URL is set to the primary production domain (e.g., `https://LearnUp.app`).
- [ ] **Redirect URIs:** Added exactly `https://LearnUp.app/auth/callback`.
- [ ] **Email Confirmations:** Confirm whether Email Verification is required (`enable_confirmations` in `config.toml`). For MVP, if it is disabled, users can log in immediately. If enabled, ensure a custom SMTP is configured.
- [ ] **SMTP Provider:** Default Supabase SMTP is heavily rate-limited (3 emails/hour). Configure Resend, SendGrid, or AWS SES before a public launch.

## 3. Application Verification
- [ ] **Production Build:** `npm run build` succeeds locally with no TypeScript or Linting errors.
- [ ] **Error Handling:** Standardized error formats (`UNAUTHORIZED`, `NOT_FOUND`, `YOUTUBE_ERROR`, etc.) are working. Stack traces are completely stripped from production API responses.
- [ ] **Data Protection:** Cross-user data access is definitively blocked at both the API and Database levels.
- [ ] **HTTPS:** Vercel has successfully provisioned SSL certificates for the custom domain. All traffic redirects to HTTPS.
- [ ] **CI Pipeline:** GitHub Actions requires all tests (`db-rls.test.ts`, `api-qa.test.ts`, `e2e` suite) to pass before a merge into `main` is allowed.
