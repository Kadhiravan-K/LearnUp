-- 20230929000000_course_metadata.sql
-- Add metadata columns for course description, skill domain, taxonomy tags, author, and duration

ALTER TABLE public.learning_items
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS skill_domain TEXT DEFAULT 'Systems Architecture',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS author TEXT,
ADD COLUMN IF NOT EXISTS total_duration_seconds INTEGER DEFAULT 0;

ALTER TABLE public.learning_item_videos
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration_formatted TEXT DEFAULT '00:00';
