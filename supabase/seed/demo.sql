-- LearnUp Demo: optional synthetic fixtures for local development only.
-- This file is never loaded automatically. Apply only with `npm run seed:demo`.
-- The seeder refuses production and remote Supabase targets and uses the local CLI.

BEGIN;

DO $$
DECLARE
  demo_user_id CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
  )
  VALUES (
    demo_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo@example.test',
    '',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"LearnUp Demo Learner"}',
    false
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

INSERT INTO public.learning_items (
  id, user_id, type, youtube_video_id, source_url, normalized_source_key,
  title, description, skill_domain, tags, status
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'video',
  'dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'video:dQw4w9WgXcQ',
  'LearnUp Demo: Systems Architecture',
  'Synthetic local-development fixture.',
  'engineering',
  ARRAY['demo', 'systems', 'architecture'],
  'ready'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.learning_items (
  id, user_id, type, youtube_playlist_id, source_url, normalized_source_key,
  title, description, skill_domain, tags, status
)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'playlist',
  'PL1234567890ABCDEFGHIJ',
  'https://www.youtube.com/playlist?list=PL1234567890ABCDEFGHIJ',
  'playlist:PL1234567890ABCDEFGHIJ',
  'LearnUp Demo: Distributed Computing Track',
  'Synthetic local-development playlist fixture.',
  'distributed_systems',
  ARRAY['demo', 'distributed', 'consensus'],
  'ready'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.learning_item_videos (
  id, learning_item_id, youtube_video_id, title, source_position, duration_formatted
)
VALUES
  ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', 'demo_vid_01', 'Module 01: Consensus', 0, '14:20'),
  ('10000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', 'demo_vid_02', 'Module 02: Leader Election', 1, '22:15'),
  ('10000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000002', 'demo_vid_03', 'Module 03: Log Replication', 2, '18:45')
ON CONFLICT (learning_item_id, source_position) DO NOTHING;

INSERT INTO public.notes (id, user_id, learning_item_id, youtube_video_id, content)
VALUES (
  '10000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'dQw4w9WgXcQ',
  '# LearnUp Demo Notes' || E'\n\n' || 'Synthetic local-development note fixture.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bookmarks (
  id, user_id, learning_item_id, youtube_video_id, position_seconds, label
)
VALUES (
  '10000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'dQw4w9WgXcQ',
  185,
  'LearnUp Demo bookmark'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.video_progress (
  user_id, youtube_video_id, position_seconds, duration_seconds, is_completed
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dQw4w9WgXcQ',
  120,
  212,
  false
)
ON CONFLICT (user_id, youtube_video_id) DO UPDATE SET
  position_seconds = EXCLUDED.position_seconds,
  duration_seconds = EXCLUDED.duration_seconds,
  is_completed = EXCLUDED.is_completed;

COMMIT;
