-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    student_id TEXT DEFAULT 'SF-9021',
    theme_mode TEXT NOT NULL DEFAULT 'light' CHECK (theme_mode IN ('light', 'dark', 'system')),
    accent_color TEXT NOT NULL DEFAULT 'indigo' CHECK (accent_color IN ('indigo', 'violet', 'cobalt', 'orange')),
    default_sprint_duration INTEGER NOT NULL DEFAULT 25 CHECK (default_sprint_duration > 0 AND default_sprint_duration <= 180),
    short_break_duration INTEGER NOT NULL DEFAULT 5 CHECK (short_break_duration > 0 AND short_break_duration <= 60),
    long_break_duration INTEGER NOT NULL DEFAULT 15 CHECK (long_break_duration > 0 AND long_break_duration <= 120),
    acoustic_cue_profile TEXT NOT NULL DEFAULT 'binaural_chime',
    auto_start_breaks BOOLEAN NOT NULL DEFAULT true,
    auto_start_next_sprint BOOLEAN NOT NULL DEFAULT false,
    ambient_soundscape BOOLEAN NOT NULL DEFAULT true,
    compact_hud_timer BOOLEAN NOT NULL DEFAULT true,
    auto_mark_video_completed BOOLEAN NOT NULL DEFAULT true,
    default_player_layout TEXT NOT NULL DEFAULT 'technical_workstation' CHECK (default_player_layout IN ('technical_workstation', 'cinema_mode')),
    streak_threshold_minutes INTEGER NOT NULL DEFAULT 30 CHECK (streak_threshold_minutes > 0),
    spaced_repetition_algorithm TEXT NOT NULL DEFAULT 'leitner',
    ai_provider TEXT NOT NULL DEFAULT 'anthropic',
    ai_model TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
    encrypted_api_key TEXT,
    context_window INTEGER NOT NULL DEFAULT 200000,
    temperature NUMERIC(3, 2) NOT NULL DEFAULT 0.20,
    notify_focus_completion BOOLEAN NOT NULL DEFAULT true,
    notify_milestone_celebration BOOLEAN NOT NULL DEFAULT true,
    notify_streak_reminder BOOLEAN NOT NULL DEFAULT true,
    notify_quiz_prompts BOOLEAN NOT NULL DEFAULT true,
    notify_weekly_digest BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
CREATE POLICY "Users can select own settings"
    ON public.user_settings
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
    ON public.user_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON public.user_settings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
    ON public.user_settings
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Auto-update timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_updated_at_user_settings ON public.user_settings;
CREATE TRIGGER handle_updated_at_user_settings
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
