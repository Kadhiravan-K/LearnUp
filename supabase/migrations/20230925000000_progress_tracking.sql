-- 20230925000000_progress_tracking.sql

CREATE TABLE IF NOT EXISTS public.video_progress (
  user_id uuid NOT NULL,
  youtube_video_id text NOT NULL,
  position_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  is_completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, youtube_video_id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_progress ON public.video_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_progress ON public.video_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY update_progress ON public.video_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY delete_progress ON public.video_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to keep updated_at in sync
DROP TRIGGER IF EXISTS trg_video_progress_updated_at ON public.video_progress;
CREATE TRIGGER trg_video_progress_updated_at
BEFORE UPDATE ON public.video_progress
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- View for aggregated library progress
-- security_invoker ensures this view respects the caller's RLS policies
CREATE OR REPLACE VIEW public.library_progress_view
WITH (security_invoker = on) AS
SELECT 
  li.id as learning_item_id,
  li.user_id,
  CASE 
    WHEN li.type = 'video' THEN 
      COALESCE(bool_or(vp.is_completed), false)
    WHEN li.type = 'playlist' THEN 
      (count(liv.id) > 0 AND count(liv.id) = sum(CASE WHEN vp.is_completed THEN 1 ELSE 0 END))
  END as is_completed,
  CASE
    WHEN li.type = 'video' THEN 
      CASE 
        WHEN max(vp.duration_seconds) IS NOT NULL AND max(vp.duration_seconds) > 0 THEN 
          LEAST((max(vp.position_seconds)::float / max(vp.duration_seconds)) * 100, 100)
        ELSE 0 
      END
    WHEN li.type = 'playlist' THEN 
      CASE 
        WHEN count(liv.id) > 0 THEN 
          (sum(CASE WHEN vp.is_completed THEN 1 ELSE 0 END)::float / count(liv.id)) * 100 
        ELSE 0 
      END
  END as progress_percentage
FROM public.learning_items li
LEFT JOIN public.learning_item_videos liv ON li.id = liv.learning_item_id
LEFT JOIN public.video_progress vp ON 
  vp.user_id = li.user_id AND 
  vp.youtube_video_id = CASE WHEN li.type = 'video' THEN li.youtube_video_id ELSE liv.youtube_video_id END
GROUP BY li.id, li.user_id, li.type;
