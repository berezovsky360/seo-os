-- Cron Jobs table for time-based recipe triggers
CREATE TABLE IF NOT EXISTS cron_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    last_run_status TEXT DEFAULT 'never',
    last_run_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cron_jobs_user_id ON cron_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_enabled_next_run ON cron_jobs(enabled, next_run_at) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_cron_jobs_recipe_id ON cron_jobs(recipe_id);

-- RLS
ALTER TABLE cron_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_cron_jobs" ON cron_jobs
    FOR ALL USING (true) WITH CHECK (true);
