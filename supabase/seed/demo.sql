-- StudyFlow Optional Development Demo Seed
-- WARNING: This file is for LOCAL DEVELOPMENT ONLY.
-- Do NOT execute this file in production environments.
-- To apply this seed manually in development: npm run seed:demo

DO $$
DECLARE
  v_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_video_id uuid;
  v_playlist_id uuid;
BEGIN
  -- 1. Create Synthetic Demo User in auth.users if not present
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
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo@example.test',
    '',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"StudyFlow Demo Learner"}',
    false
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Insert Demo Video Item
  INSERT INTO public.learning_items (
    id, user_id, type, youtube_video_id, source_url, normalized_source_key,
    title, description, skill_domain, tags, status, created_at, updated_at
  )
  VALUES (
    uuid_generate_v4(),
    v_user_id,
    'video',
    'dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'video:dQw4w9WgXcQ',
    'StudyFlow Demo: Systems Architecture (Sample)',
    'Synthetic demo lecture on distributed memory architecture and high-throughput systems.',
    'engineering',
    ARRAY['demo', 'systems', 'architecture'],
    'ready',
    now(),
    now()
  )
  RETURNING id INTO v_video_id;

  -- 3. Insert Demo Playlist Item
  INSERT INTO public.learning_items (
    id, user_id, type, youtube_playlist_id, source_url, normalized_source_key,
    title, description, skill_domain, tags, status, created_at, updated_at
  )
  VALUES (
    uuid_generate_v4(),
    v_user_id,
    'playlist',
    'PL1234567890ABCDEFGHIJ',
    'https://www.youtube.com/playlist?list=PL1234567890ABCDEFGHIJ',
    'playlist:PL1234567890ABCDEFGHIJ',
    'StudyFlow Demo: Distributed Computing Track (Sample)',
    'A sample multi-module course exploring consensus protocols, Raft, and replication.',
    'distributed_systems',
    ARRAY['demo', 'distributed', 'consensus'],
    'ready',
    now(),
    now()
  )
  RETURNING id INTO v_playlist_id;

  -- 4. Insert Child Videos for Demo Playlist
  INSERT INTO public.learning_item_videos (id, learning_item_id, youtube_video_id, title, source_position, duration_formatted, created_at)
  VALUES
    (uuid_generate_v4(), v_playlist_id, 'demo_vid_01', 'Module 01: Introduction to Consensus', 0, '14:20', now()),
    (uuid_generate_v4(), v_playlist_id, 'demo_vid_02', 'Module 02: Raft Leader Election', 1, '22:15', now()),
    (uuid_generate_v4(), v_playlist_id, 'demo_vid_03', 'Module 03: Log Replication and Compaction', 2, '18:45', now());

  -- 5. Insert Demo Note
  INSERT INTO public.notes (id, user_id, learning_item_id, youtube_video_id, content, created_at, updated_at)
  VALUES (
    uuid_generate_v4(),
    v_user_id,
    v_video_id,
    'dQw4w9WgXcQ',
    '# Systems Architecture Notes' || E'\n\n' || 'Key theorem: $N \ge 2F + 1$ quorum requirement for fault-tolerant state machine replication.',
    now(),
    now()
  );

  -- 6. Insert Demo Bookmark
  INSERT INTO public.bookmarks (id, user_id, learning_item_id, youtube_video_id, position_seconds, label, created_at)
  VALUES (
    uuid_generate_v4(),
    v_user_id,
    v_video_id,
    'dQw4w9WgXcQ',
    185,
    'Quorum majority formula explanation',
    now()
  );

  -- 7. Insert Demo Progress
  INSERT INTO public.video_progress (user_id, youtube_video_id, position_seconds, duration_seconds, is_completed, updated_at)
  VALUES (
    v_user_id,
    'dQw4w9WgXcQ',
    120,
    212,
    false,
    now()
  );

END $$;
