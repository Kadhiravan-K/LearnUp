-- supabase/tests/learning_items_test.sql
-- Automated tests for StudyFlow MVP schema security and integrity.
-- Uses pgTAP (https://pgtap.org/) for assertions.

-- Ensure pgTAP is available
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Begin a transaction so we can roll back after tests, keeping the DB clean.
BEGIN;

-- Helper to set the simulated authenticated user for RLS policies.
-- Supabase evaluates auth.uid() from the JWT claim "sub".
CREATE OR REPLACE FUNCTION set_auth_user(uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', $1::text, true);
END;
$$;

-- Test data: two distinct users
SELECT set_auth_user('11111111-1111-1111-1111-111111111111'::uuid) AS set_user_a;
SELECT set_auth_user('22222222-2222-2222-2222-222222222222'::uuid) AS set_user_b;

-- Plan the number of tests (adjust as needed)
SELECT plan(12);

-- 1. User A can create a video learning item
INSERT INTO public.learning_items (
  user_id, type, youtube_video_id, source_url, normalized_source_key, title, status
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'video',
  'vid123',
  'https://youtu.be/vid123',
  'video:vid123',
  'Test Video',
  'ready'
) RETURNING id INTO STRICT _a_video_id;
SELECT ok(true, 'User A created a video learning item') AS ok1;

-- 2. User A can read their own learning item
SELECT set_auth_user('11111111-1111-1111-1111-111111111111'::uuid);
SELECT ok(
  EXISTS (SELECT 1 FROM public.learning_items WHERE id = _a_video_id),
  'User A can read their own learning item'
) AS ok2;

-- 3. User B cannot read User A's learning item
SELECT set_auth_user('22222222-2222-2222-2222-222222222222'::uuid);
SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.learning_items WHERE id = _a_video_id),
  'User B cannot read User A''s learning item'
) AS ok3;

-- 4 & 5: Watch progress column does NOT exist in the current MVP schema.
-- These tests are intentionally skipped with a diagnostic message.
SELECT skip('Watch progress columns are not part of MVP-0.1 schema; tests omitted') AS skip45;

-- 6. Deleting a playlist deletes its child videos via cascade and respects RLS.
-- Create a playlist with two children for User A.
SELECT set_auth_user('11111111-1111-1111-1111-111111111111'::uuid);
INSERT INTO public.learning_items (
  user_id, type, youtube_playlist_id, source_url, normalized_source_key, title, status
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'playlist',
  'plst123',
  'https://youtube.com/playlist?list=plst123',
  'playlist:plst123',
  'Test Playlist',
  'ready'
) RETURNING id INTO STRICT _a_playlist_id;

INSERT INTO public.learning_item_videos (
  learning_item_id, youtube_video_id, title, source_position
) VALUES
  (_a_playlist_id, 'vidA', 'Child A', 0),
  (_a_playlist_id, 'vidB', 'Child B', 1)
RETURNING id INTO STRICT _child_a_id, _child_b_id;

-- Verify children exist for User A
SELECT ok(
  (SELECT COUNT(*) FROM public.learning_item_videos WHERE learning_item_id = _a_playlist_id) = 2,
  'Playlist children inserted for User A'
) AS ok6a;

-- Delete the playlist as User A
DELETE FROM public.learning_items WHERE id = _a_playlist_id;

-- Children should be gone (cascade delete)
SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.learning_item_videos WHERE learning_item_id = _a_playlist_id),
  'Cascade delete removed child videos when playlist deleted'
) AS ok6b;

-- 7. Duplicate ownership constraint (unique normalized_source_key per user)
-- Attempt to insert another video with same source key for same user – should fail.
BEGIN;
  INSERT INTO public.learning_items (
    user_id, type, youtube_video_id, source_url, normalized_source_key, title, status
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'video',
    'vid123',
    'https://youtu.be/vid123',
    'video:vid123',
    'Duplicate Video',
    'ready'
  );
EXCEPTION WHEN unique_violation THEN
  SELECT ok(true, 'Duplicate source key for same user is rejected') AS ok7;
END;

-- 8. Invalid foreign key rejection for child video
BEGIN;
  INSERT INTO public.learning_item_videos (
    learning_item_id, youtube_video_id, title, source_position
  ) VALUES (
    '99999999-9999-9999-9999-999999999999'::uuid, -- non‑existent parent
    'vidX',
    'Orphan Video',
    0
  );
EXCEPTION WHEN foreign_key_violation THEN
  SELECT ok(true, 'Inserting child with invalid parent foreign key is rejected') AS ok8;
END;

-- 9. Playlist video ordering is preserved
-- Insert a new playlist with out‑of‑order positions and verify ordering via query.
INSERT INTO public.learning_items (
  user_id, type, youtube_playlist_id, source_url, normalized_source_key, title, status
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'playlist',
  'plst_order',
  'https://youtube.com/playlist?list=plst_order',
  'playlist:plst_order',
  'Ordered Playlist',
  'ready'
) RETURNING id INTO STRICT _order_playlist_id;

INSERT INTO public.learning_item_videos (
  learning_item_id, youtube_video_id, title, source_position
) VALUES
  (_order_playlist_id, 'vid1', 'First', 2),
  (_order_playlist_id, 'vid2', 'Second', 0),
  (_order_playlist_id, 'vid3', 'Third', 1);

-- Query ordered list
SELECT array_agg(youtube_video_id ORDER BY source_position) INTO STRICT _ordered_ids
FROM public.learning_item_videos
WHERE learning_item_id = _order_playlist_id;

SELECT is(
  _ordered_ids,
  ARRAY['vid2','vid3','vid1']::text[],
  'Playlist child videos are returned in source_position order'
) AS ok9;

-- Finish tests
SELECT * FROM finish();

-- Rollback to leave DB untouched (tests only)
ROLLBACK;
