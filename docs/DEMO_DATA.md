# Demo Data & Fresh Installation Invariants

StudyFlow enforces a strict **Zero-Seed Invariant** across all public releases and deployment pipelines.

---

## The Zero-Seed Invariant

- **Fresh Production Setup**: A fresh setup running schema migrations contains **zero user accounts, zero courses, zero notes, and zero calendar events**.
- **No Fabricated User Identity**: The system never populates default user profiles or fake identities without explicit user creation.
- **Privacy & Clean Slate**: Developers and self-hosters always start with a clean slate.

---

## Local Development Demo Seeding

For testing, review, or local development where sample learning items and focus sessions are desired, StudyFlow provides an explicit, opt-in seed script:

```bash
npm run seed:demo
```

### What `npm run seed:demo` does:
- Reads SQL commands from `supabase/seed/demo.sql`.
- Inserts curated sample public learning items (such as MIT OpenCourseWare, CS50, or Khan Academy lectures) mapped to a specified local test user.
- Creates sample focus sessions and progress tracking entries for UI verification.

### What migrations do:
- Migrations in `supabase/migrations/` contain **DDL (schema definitions, tables, indexes, constraints, RLS policies, trigger functions) ONLY**.
- Migrations never contain DML `INSERT` statements with user data.
