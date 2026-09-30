-- 20230926000000_notes.sql - SF-027 Notes schema and RLS

CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  learning_item_id uuid NOT NULL,
  youtube_video_id text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_learning_item FOREIGN KEY (learning_item_id) REFERENCES public.learning_items(id) ON DELETE CASCADE
);

-- Index for fast user queries (e.g., getting all notes for a user)
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);

-- Index for fast lookup by learning item and video (e.g., loading notes for a video player)
CREATE INDEX IF NOT EXISTS idx_notes_item_video ON public.notes(learning_item_id, youtube_video_id);

-- -------------------------------------------------------------------
-- Row-Level Security (RLS)
-- -------------------------------------------------------------------
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_notes ON public.notes
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY insert_notes ON public.notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY update_notes ON public.notes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY delete_notes ON public.notes
  FOR DELETE USING (auth.uid() = user_id);

-- -------------------------------------------------------------------
-- Trigger to keep updated_at in sync
-- -------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_notes_updated_at ON public.notes;
CREATE TRIGGER trg_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- End of migration
