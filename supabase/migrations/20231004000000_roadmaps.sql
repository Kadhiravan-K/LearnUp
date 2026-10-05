-- Persist user-owned roadmap tracks and their library-linked milestones.
CREATE TABLE IF NOT EXISTS public.roadmap_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Engineering',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_roadmap_tracks_id_user UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_tracks_user_updated
    ON public.roadmap_tracks(user_id, updated_at DESC);

ALTER TABLE public.roadmap_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roadmap tracks"
    ON public.roadmap_tracks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own roadmap tracks"
    ON public.roadmap_tracks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own roadmap tracks"
    ON public.roadmap_tracks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own roadmap tracks"
    ON public.roadmap_tracks FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.roadmap_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roadmap_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    node_number TEXT NOT NULL,
    title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'locked'
        CHECK (status IN ('locked', 'active', 'in_progress', 'completed', 'capstone')),
    progress_percentage SMALLINT NOT NULL DEFAULT 0
        CHECK (progress_percentage BETWEEN 0 AND 100),
    hours_logged NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (hours_logged >= 0),
    tags TEXT[] NOT NULL DEFAULT '{}',
    prerequisite_node_id UUID REFERENCES public.roadmap_nodes(id) ON DELETE SET NULL,
    prerequisite_label TEXT,
    suggested_course_title TEXT,
    learning_item_id UUID REFERENCES public.learning_items(id) ON DELETE SET NULL,
    course_progress_percentage SMALLINT NOT NULL DEFAULT 0
        CHECK (course_progress_percentage BETWEEN 0 AND 100),
    course_total_lectures INTEGER CHECK (course_total_lectures IS NULL OR course_total_lectures >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_roadmap_nodes_track_owner
        FOREIGN KEY (roadmap_id, user_id)
        REFERENCES public.roadmap_tracks(id, user_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_roadmap_nodes_number UNIQUE (roadmap_id, node_number)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_nodes_track
    ON public.roadmap_nodes(roadmap_id, node_number);
CREATE INDEX IF NOT EXISTS idx_roadmap_nodes_library_item
    ON public.roadmap_nodes(learning_item_id);

ALTER TABLE public.roadmap_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roadmap nodes"
    ON public.roadmap_nodes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own roadmap nodes"
    ON public.roadmap_nodes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own roadmap nodes"
    ON public.roadmap_nodes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own roadmap nodes"
    ON public.roadmap_nodes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.create_roadmap_track(
    p_user_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_category TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    new_roadmap_id UUID := gen_random_uuid();
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'User does not match authenticated session'
            USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.roadmap_tracks (id, user_id, title, description, category)
    VALUES (new_roadmap_id, p_user_id, p_title, p_description, p_category);

    INSERT INTO public.roadmap_nodes (
        roadmap_id,
        user_id,
        node_number,
        title,
        description,
        status,
        tags
    )
    VALUES (
        new_roadmap_id,
        p_user_id,
        '01',
        'Foundations & Setup',
        'Core concepts and environment configuration.',
        'active',
        ARRAY['foundation', 'getting-started']
    );

    RETURN new_roadmap_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_roadmap_track(UUID, TEXT, TEXT, TEXT) TO authenticated;
