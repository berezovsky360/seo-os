-- Redirect Management for SEO OS
-- Manages 301/302/307 redirects per site, 404 monitoring, auto-redirect on slug change

-- ═══════════════════════════════════════════════════════════
-- 1. Redirects Table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE redirects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
    source_path TEXT NOT NULL,
    target_url TEXT NOT NULL,
    type TEXT DEFAULT '301' CHECK (type IN ('301', '302', '307')),
    is_regex BOOLEAN DEFAULT false,
    hits INTEGER DEFAULT 0,
    last_hit_at TIMESTAMPTZ,
    auto_generated BOOLEAN DEFAULT false,
    note TEXT,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(site_id, source_path)
);

ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own redirects"
    ON redirects FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX idx_redirects_site_enabled ON redirects(site_id, enabled);
CREATE INDEX idx_redirects_site_source ON redirects(site_id, source_path);
CREATE INDEX idx_redirects_user ON redirects(user_id);
CREATE INDEX idx_redirects_hits ON redirects(site_id, hits DESC);

-- ═══════════════════════════════════════════════════════════
-- 2. 404 Error Log Table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE redirect_404_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
    path TEXT NOT NULL,
    referer TEXT,
    user_agent TEXT,
    hits INTEGER DEFAULT 1,
    first_seen TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    resolved BOOLEAN DEFAULT false,
    UNIQUE(site_id, path)
);

ALTER TABLE redirect_404_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own 404 logs"
    ON redirect_404_log FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX idx_404_log_site ON redirect_404_log(site_id);
CREATE INDEX idx_404_log_site_hits ON redirect_404_log(site_id, hits DESC);
CREATE INDEX idx_404_log_site_resolved ON redirect_404_log(site_id, resolved);

-- ═══════════════════════════════════════════════════════════
-- 3. RPC: Increment redirect hit counter (called from WP plugin)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_redirect_hits(redirect_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE redirects
    SET hits = hits + 1, last_hit_at = now()
    WHERE id = redirect_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- 4. RPC: Upsert 404 log entry (increment hits if exists)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION upsert_404_log(
    p_user_id UUID,
    p_site_id UUID,
    p_path TEXT,
    p_referer TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO redirect_404_log (user_id, site_id, path, referer, user_agent)
    VALUES (p_user_id, p_site_id, p_path, p_referer, p_user_agent)
    ON CONFLICT (site_id, path)
    DO UPDATE SET
        hits = redirect_404_log.hits + 1,
        last_seen = now(),
        referer = COALESCE(EXCLUDED.referer, redirect_404_log.referer),
        user_agent = COALESCE(EXCLUDED.user_agent, redirect_404_log.user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
