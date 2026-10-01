# LearnUp — Database Design (MVP‑0.1)

## Overview
This document describes the PostgreSQL schema used by the LearnUp MVP (version 0.1). The database is hosted on Supabase and follows the architecture outlined in `docs/ARCHITECTURE.md` and the product requirements in `docs/PRD.md`.

The schema stores:
- **Authenticated users** (managed by Supabase Auth – table `auth.users`).
- **Learning items** – a top‑level record representing either a single YouTube video or a YouTube playlist imported by a user.
- **Playlist child videos** – rows that belong to a playlist‑type learning item, preserving the original YouTube `position`.

All data is owned by a specific user and protected by Row‑Level Security (RLS) policies so that no user can read or modify another user’s library.

---

## Enumerations
```sql
CREATE TYPE IF NOT EXISTS learning_item_type AS ENUM ('video', 'playlist');
CREATE TYPE IF NOT EXISTS learning_item_status AS ENUM ('importing', 'ready', 'failed');
```
- `learning_item_type` – distinguishes a direct video from a playlist.
- `learning_item_status` – tracks the import lifecycle; only items with status `ready` are shown in the UI.

---

## Tables
### `learning_items`
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `uuid` **PK** | No | Primary key, generated with `uuid_generate_v4()` |
| `user_id` | `uuid` | No | Owner – references `auth.users(id)` (FK) |
| `type` | `learning_item_type` | No | `video` or `playlist` |
| `youtube_video_id` | `text` | **Yes** (only for `video`) | Canonical YouTube video identifier |
| `youtube_playlist_id` | `text` | **Yes** (only for `playlist`) | Canonical YouTube playlist identifier |
| `source_url` | `text` | No | The raw URL the user submitted |
| `normalized_source_key` | `text` | No | Canonical key used for idempotent imports (e.g. `video:<id>` or `playlist:<id>`) |
| `title` | `text` | No | Title fetched from YouTube |
| `thumbnail_url` | `text` | Yes | Optional thumbnail for UI cards |
| `status` | `learning_item_status` | No | Import lifecycle state |
| `created_at` | `timestamptz` | No | Default `now()` |
| `updated_at` | `timestamptz` | No | Updated on change (trigger) |

**Constraints & indexes**
- `PRIMARY KEY (id)`
- `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `UNIQUE (user_id, normalized_source_key)` – guarantees one import per user per source (idempotency).
- `CHECK ((type = 'video' AND youtube_video_id IS NOT NULL AND youtube_playlist_id IS NULL) OR (type = 'playlist' AND youtube_playlist_id IS NOT NULL AND youtube_video_id IS NULL))`
- Index on `user_id` for fast per‑user lookups.

### `learning_item_videos`
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `uuid` **PK** | No | Primary key |
| `learning_item_id` | `uuid` | No | FK to the parent playlist (`learning_items.id`) |
| `youtube_video_id` | `text` | No | Video identifier of the child |
| `title` | `text` | No | Video title from YouTube |
| `thumbnail_url` | `text` | Yes | Optional thumbnail |
| `source_position` | `integer` | No | Zero‑based position from the YouTube playlist (preserved order) |
| `created_at` | `timestamptz` | No | Default `now()` |

**Constraints & indexes**
- `PRIMARY KEY (id)`
- `FOREIGN KEY (learning_item_id) REFERENCES learning_items(id) ON DELETE CASCADE`
- `UNIQUE (learning_item_id, source_position)` – guarantees deterministic ordering.
- `UNIQUE (learning_item_id, youtube_video_id)` – prevents duplicate child rows on retry.
- Index on `(learning_item_id, source_position)` for ordered pagination.

---

## Row‑Level Security (RLS)
Both tables have RLS enabled and policies that bind every operation to the authenticated session user (`auth.uid()`).
```sql
-- Enable RLS
ALTER TABLE public.learning_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_item_videos ENABLE ROW LEVEL SECURITY;

-- Policies for learning_items
CREATE POLICY select_learning_items ON public.learning_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_learning_items ON public.learning_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_learning_items ON public.learning_items
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY delete_learning_items ON public.learning_items
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for learning_item_videos (inherit ownership from parent)
CREATE POLICY select_item_videos ON public.learning_item_videos
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.learning_items WHERE id = learning_item_id));
CREATE POLICY insert_item_videos ON public.learning_item_videos
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.learning_items WHERE id = learning_item_id));
CREATE POLICY update_item_videos ON public.learning_item_videos
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.learning_items WHERE id = learning_item_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.learning_items WHERE id = learning_item_id));
CREATE POLICY delete_item_videos ON public.learning_item_videos
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.learning_items WHERE id = learning_item_id));
```
These policies enforce the **Security Rule 8** from `AGENTS.md`: a user never reads or modifies another user’s learning data.

---

## Triggers / Helper Functions
A simple `updated_at` trigger keeps the timestamp fresh on any column change.
```sql
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_learning_items_updated_at
BEFORE UPDATE ON public.learning_items
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
```
---

## Development Seed Data
The `supabase/seed/seed.sql` script inserts a deterministic user (matching a test auth record) and a handful of learning items to aid local development.
```sql
-- Replace the UUID below with a real test user ID generated by Supabase Auth in your dev environment.
INSERT INTO public.learning_items (id, user_id, type, youtube_video_id, source_url, normalized_source_key, title, status, created_at, updated_at)
VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'video', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video:dQw4w9WgXcQ', 'Rick Astley – Never Gonna Give You Up', 'ready', now(), now());

INSERT INTO public.learning_items (id, user_id, type, youtube_playlist_id, source_url, normalized_source_key, title, status, created_at, updated_at)
VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'playlist', 'PL1234567890ABCDEFGHIJ', 'https://www.youtube.com/playlist?list=PL1234567890ABCDEFGHIJ', 'playlist:PL1234567890ABCDEFGHIJ', 'Sample Playlist', 'ready', now(), now());

-- Child videos for the above playlist (positions 0‑2)
WITH parent AS (
  SELECT id FROM public.learning_items WHERE normalized_source_key = 'playlist:PL1234567890ABCDEFGHIJ'
)
INSERT INTO public.learning_item_videos (id, learning_item_id, youtube_video_id, title, source_position, created_at)
SELECT uuid_generate_v4(), parent.id, v_id, v_title, v_pos, now()
FROM (
  VALUES
    ('a1b2c3d4e5', 'First Video', 0),
    ('f6g7h8i9j0', 'Second Video', 1),
    ('k1l2m3n4o5', 'Third Video', 2)
) AS v(v_id, v_title, v_pos);
```
Adjust the placeholder user UUID to match a user created in your Supabase Auth dashboard before running the seed script.

---

## Verification Against MVP Acceptance Criteria
| MVP Feature | Schema Element | How the schema satisfies the criterion |
|-------------|----------------|----------------------------------------|
| Authenticated users | Uses `auth.users` and `user_id` FK; RLS policies enforce `auth.uid()` | Guarantees every operation is scoped to an authenticated session (FR‑001, FR‑002) |
| Save YouTube videos | `learning_items.type = 'video'` with `youtube_video_id` populated | One row per video, unique per user via `normalized_source_key` (AC‑003, AC‑008) |
| Save YouTube playlists | `learning_items.type = 'playlist'` with child rows in `learning_item_videos` | Parent‑child relationship, cascade delete, ordered via `source_position` (AC‑005, AC‑006) |
| Preserve ordering | `source_position` column with unique constraint per playlist | Guarantees deterministic order regardless of import pagination (FR‑005) |
| Track playback progress | **Not part of MVP** – column can be added later without breaking current schema |
| Mark videos completed | **Not part of MVP** – same as above |
| Delete own items | `ON DELETE CASCADE` on FK + RLS delete policies | Users can only delete their own rows; cascade removes child videos (AC‑009, AC‑010) |
| Idempotent import | `UNIQUE (user_id, normalized_source_key)` on `learning_items` and `UNIQUE (learning_item_id, youtube_video_id)` on children | Duplicate imports return existing rows, never create duplicates (FR‑012) |

---

## Migration & Deployment
The initial migration (`supabase/migrations/20230924000100_init.sql`) creates the enumerations, tables, constraints, indexes, and RLS policies. It is idempotent – running it on a fresh Supabase project produces the full schema, and re‑running on an existing project is a no‑op because `CREATE TYPE IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` are used where appropriate.

---

*Prepared by the Database Architect for LearnUp – MVP‑0.1*
