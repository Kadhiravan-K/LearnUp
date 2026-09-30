-- 20230924000100_init.sql – StudyFlow MVP‑0.1 schema
-- This migration is idempotent and safe to run on a fresh Supabase project.

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enumerations
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'learning_item_type') THEN
    CREATE TYPE learning_item_type AS ENUM ('video', 'playlist');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'learning_item_status') THEN
    CREATE TYPE learning_item_status AS ENUM ('importing', 'ready', 'failed');
  END IF;
END $$;

-- Table: learning_items
CREATE TABLE IF NOT EXISTS public.learning_items (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL,
  type             learning_item_type NOT NULL,
  youtube_video_id text,
  youtube_playlist_id text,
  source_url       text NOT NULL,
  normalized_source_key text NOT NULL,
  title            text NOT NULL,
  thumbnail_url    text,
  status           learning_item_status NOT NULL DEFAULT 'importing',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT uniq_user_source UNIQUE (user_id, normalized_source_key),
  CONSTRAINT chk_type CHECK (
    (type = 'video'     AND youtube_video_id IS NOT NULL AND youtube_playlist_id IS NULL) OR
    (type = 'playlist' AND youtube_playlist_id IS NOT NULL AND youtube_video_id IS NULL)
  )
);

-- Index for fast per‑user queries
CREATE INDEX IF NOT EXISTS idx_learning_items_user_id ON public.learning_items(user_id);

-- Table: learning_item_videos (children of playlist items)
CREATE TABLE IF NOT EXISTS public.learning_item_videos (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  learning_item_id uuid NOT NULL,
  youtube_video_id text NOT NULL,
  title            text NOT NULL,
  thumbnail_url    text,
  source_position  integer NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_parent FOREIGN KEY (learning_item_id) REFERENCES public.learning_items(id) ON DELETE CASCADE,
  CONSTRAINT uniq_position UNIQUE (learning_item_id, source_position),
  CONSTRAINT uniq_video_per_playlist UNIQUE (learning_item_id, youtube_video_id)
);

-- Index to support ordered pagination of playlist children
CREATE INDEX IF NOT EXISTS idx_child_playlist_position ON public.learning_item_videos(learning_item_id, source_position);

-- -------------------------------------------------------------------
-- Row‑Level Security (RLS)
-- -------------------------------------------------------------------
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

-- Policies for learning_item_videos – ownership derived from parent
CREATE POLICY select_item_videos ON public.learning_item_videos
  FOR SELECT USING (
    auth.uid() = (
      SELECT user_id FROM public.learning_items WHERE id = learning_item_id
    )
  );
CREATE POLICY insert_item_videos ON public.learning_item_videos
  FOR INSERT WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.learning_items WHERE id = learning_item_id
    )
  );
CREATE POLICY update_item_videos ON public.learning_item_videos
  FOR UPDATE USING (
    auth.uid() = (
      SELECT user_id FROM public.learning_items WHERE id = learning_item_id
    )
  ) WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.learning_items WHERE id = learning_item_id
    )
  );
CREATE POLICY delete_item_videos ON public.learning_item_videos
  FOR DELETE USING (
    auth.uid() = (
      SELECT user_id FROM public.learning_items WHERE id = learning_item_id
    )
  );

-- -------------------------------------------------------------------
-- Trigger to keep updated_at in sync
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_learning_items_updated_at ON public.learning_items;
CREATE TRIGGER trg_learning_items_updated_at
BEFORE UPDATE ON public.learning_items
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- End of migration
