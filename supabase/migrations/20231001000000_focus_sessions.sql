-- Migration: Focus Sessions & Precision Telemetry
-- Table for tracking Pomodoro focus intervals, cognitive streaks, and acoustic soundscape sessions

CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    learning_item_id UUID REFERENCES public.learning_items(id) ON DELETE SET NULL,
    youtube_video_id TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 1500 CHECK (duration_seconds > 0),
    mode TEXT NOT NULL DEFAULT 'sprint' CHECK (mode IN ('sprint', 'deep_block', 'flow_state', 'short_break', 'long_break', 'custom')),
    interval_number INTEGER NOT NULL DEFAULT 1 CHECK (interval_number >= 1),
    soundscape TEXT NOT NULL DEFAULT 'binaural_40hz',
    completed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON public.focus_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_course ON public.focus_sessions(learning_item_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own focus sessions"
    ON public.focus_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus sessions"
    ON public.focus_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus sessions"
    ON public.focus_sessions
    FOR DELETE
    USING (auth.uid() = user_id);
