-- Migration: Production-Ready Calendar System (SF-057)
-- Tables for calendars, categories, events, study sessions tracking, and sync state

-- 1. Custom Calendars Table
CREATE TABLE IF NOT EXISTS public.calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#6366f1',
    is_visible BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    source TEXT NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'google', 'outlook', 'apple', 'custom')),
    provider_calendar_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendars_user ON public.calendars(user_id);
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendars" ON public.calendars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calendars" ON public.calendars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendars" ON public.calendars FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendars" ON public.calendars FOR DELETE USING (auth.uid() = user_id);

-- 2. Calendar Categories Table
CREATE TABLE IF NOT EXISTS public.calendar_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_categories_user ON public.calendar_categories(user_id);
ALTER TABLE public.calendar_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar categories" ON public.calendar_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calendar categories" ON public.calendar_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendar categories" ON public.calendar_categories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendar categories" ON public.calendar_categories FOR DELETE USING (auth.uid() = user_id);

-- 3. Calendar Events Table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.calendar_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    url TEXT,
    notes TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    all_day BOOLEAN NOT NULL DEFAULT false,
    color_override TEXT,
    learning_item_id UUID REFERENCES public.learning_items(id) ON DELETE SET NULL,
    youtube_video_id TEXT,
    recurrence_rule JSONB,
    recurrence_parent_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    reminders JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled', 'completed')),
    is_study_session BOOLEAN NOT NULL DEFAULT false,
    planned_duration_minutes INTEGER,
    actual_duration_seconds INTEGER NOT NULL DEFAULT 0,
    sync_id TEXT,
    etag TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_event_dates CHECK (end_at >= start_at)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_range ON public.calendar_events(user_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar ON public.calendar_events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_category ON public.calendar_events(category_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_learning_item ON public.calendar_events(learning_item_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_parent ON public.calendar_events(recurrence_parent_id);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar events" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calendar events" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendar events" ON public.calendar_events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendar events" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

-- 4. Calendar Study Sessions Table (Live focus timer & telemetry)
CREATE TABLE IF NOT EXISTS public.calendar_event_study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    learning_item_id UUID REFERENCES public.learning_items(id) ON DELETE SET NULL,
    planned_duration_seconds INTEGER NOT NULL DEFAULT 1800,
    actual_duration_seconds INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    paused_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_study_sessions_user ON public.calendar_event_study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_event_study_sessions_event ON public.calendar_event_study_sessions(event_id);

ALTER TABLE public.calendar_event_study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own event study sessions" ON public.calendar_event_study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own event study sessions" ON public.calendar_event_study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own event study sessions" ON public.calendar_event_study_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own event study sessions" ON public.calendar_event_study_sessions FOR DELETE USING (auth.uid() = user_id);

-- 5. Calendar Sync State Table (Google Calendar / External 2-way sync)
CREATE TABLE IF NOT EXISTS public.calendar_sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'google',
    sync_token TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_sync_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_state_user ON public.calendar_sync_state(user_id);
ALTER TABLE public.calendar_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar sync state" ON public.calendar_sync_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calendar sync state" ON public.calendar_sync_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendar sync state" ON public.calendar_sync_state FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendar sync state" ON public.calendar_sync_state FOR DELETE USING (auth.uid() = user_id);
