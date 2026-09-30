-- 20230930000000_plugins_and_connectors.sql
-- Create tables for Connectors (Obsidian, GitHub, Google Calendar, Notion), Plugins, and Token Usage Ledger

-- Table: user_connectors
CREATE TABLE IF NOT EXISTS public.user_connectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connector_type TEXT NOT NULL CHECK (connector_type IN ('obsidian', 'github', 'google_calendar', 'notion', 'local_fs')),
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'syncing', 'error')),
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uniq_user_connector UNIQUE (user_id, connector_type)
);

CREATE INDEX IF NOT EXISTS idx_user_connectors_user ON public.user_connectors(user_id);

ALTER TABLE public.user_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own connectors"
    ON public.user_connectors
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS handle_updated_at_user_connectors ON public.user_connectors;
CREATE TRIGGER handle_updated_at_user_connectors
    BEFORE UPDATE ON public.user_connectors
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Table: user_plugins
CREATE TABLE IF NOT EXISTS public.user_plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plugin_id TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uniq_user_plugin UNIQUE (user_id, plugin_id)
);

CREATE INDEX IF NOT EXISTS idx_user_plugins_user ON public.user_plugins(user_id);

ALTER TABLE public.user_plugins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plugins"
    ON public.user_plugins
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS handle_updated_at_user_plugins ON public.user_plugins;
CREATE TRIGGER handle_updated_at_user_plugins
    BEFORE UPDATE ON public.user_plugins
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Table: token_usage_ledger (Tracks API Key cost and usage per provider)
CREATE TABLE IF NOT EXISTS public.token_usage_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai', 'google', 'ollama', 'local')),
    model TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    feature_context TEXT DEFAULT 'ai_assistant',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_usage_user ON public.token_usage_ledger(user_id, created_at DESC);

ALTER TABLE public.token_usage_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view and insert own token usage"
    ON public.token_usage_ledger
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
