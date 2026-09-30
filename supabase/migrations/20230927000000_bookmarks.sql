-- 20230927000000_bookmarks.sql - SF-030 Bookmarks schema and RLS

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  learning_item_id uuid NOT NULL,
  youtube_video_id text NOT NULL,
  position_seconds integer NOT NULL CHECK (position_seconds >= 0),
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_learning_item FOREIGN KEY (learning_item_id) REFERENCES public.learning_items(id) ON DELETE CASCADE
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);

-- Index for fast lookup by learning item and video
CREATE INDEX IF NOT EXISTS idx_bookmarks_item_video ON public.bookmarks(learning_item_id, youtube_video_id);

-- Index for ordering bookmarks by timestamp
CREATE INDEX IF NOT EXISTS idx_bookmarks_position ON public.bookmarks(learning_item_id, youtube_video_id, position_seconds);

-- -------------------------------------------------------------------
-- Row-Level Security (RLS)
-- -------------------------------------------------------------------
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_bookmarks ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY insert_bookmarks ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_bookmarks ON public.bookmarks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY delete_bookmarks ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- End of migration
