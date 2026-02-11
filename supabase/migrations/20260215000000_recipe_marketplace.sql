-- Recipe Marketplace: shared templates, install counts, module stats

-- Shared recipe templates
CREATE TABLE recipe_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT 'SEO OS Team',
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    icon TEXT DEFAULT 'Zap',
    trigger_event TEXT NOT NULL,
    trigger_conditions JSONB DEFAULT '{}',
    actions JSONB NOT NULL,
    graph_layout JSONB,
    required_modules TEXT[] DEFAULT '{}',
    install_count INTEGER DEFAULT 0,
    is_official BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recipe_templates_slug ON recipe_templates(slug);
CREATE INDEX idx_recipe_templates_category ON recipe_templates(category);
CREATE INDEX idx_recipe_templates_installs ON recipe_templates(install_count DESC);

ALTER TABLE recipe_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public templates readable by all" ON recipe_templates
    FOR SELECT USING (is_public = true);
CREATE POLICY "Authors manage own templates" ON recipe_templates
    FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update own templates" ON recipe_templates
    FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors delete own templates" ON recipe_templates
    FOR DELETE USING (auth.uid() = author_id);
-- Service role can update install_count (bypasses RLS)

-- Module install count tracking
CREATE TABLE module_install_stats (
    module_id TEXT PRIMARY KEY,
    install_count INTEGER DEFAULT 0,
    last_installed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE module_install_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Module stats are public" ON module_install_stats
    FOR SELECT USING (true);

-- Seed module stats
INSERT INTO module_install_stats (module_id, install_count) VALUES
    ('rank-pulse', 0), ('gemini-architect', 0), ('rankmath-bridge', 0),
    ('gsc-insights', 0), ('nana-banana', 0), ('recipes', 0),
    ('personas', 0), ('llm-tracker', 0), ('keyword-research', 0),
    ('keyword-magic', 0), ('docs', 0), ('ai-writer', 0),
    ('cron', 0), ('content-engine', 0)
ON CONFLICT DO NOTHING;

-- Auto-increment module installs on enable
CREATE OR REPLACE FUNCTION increment_module_installs()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.enabled = true AND (OLD IS NULL OR OLD.enabled = false) THEN
        INSERT INTO module_install_stats (module_id, install_count, last_installed_at)
        VALUES (NEW.module_id, 1, now())
        ON CONFLICT (module_id) DO UPDATE
        SET install_count = module_install_stats.install_count + 1,
            last_installed_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_module_enabled
    AFTER INSERT OR UPDATE ON modules_config
    FOR EACH ROW EXECUTE FUNCTION increment_module_installs();

-- RPC to increment template install count (called from API with service role)
CREATE OR REPLACE FUNCTION increment_template_installs(template_slug TEXT)
RETURNS void AS $$
BEGIN
    UPDATE recipe_templates
    SET install_count = install_count + 1,
        updated_at = now()
    WHERE slug = template_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed 5 official recipe templates
INSERT INTO recipe_templates (slug, name, description, category, tags, icon, trigger_event, trigger_conditions, actions, required_modules, is_official, featured) VALUES
(
    'ai-news-engine-full-article',
    'AI News Engine — Full Article',
    'End-to-end content pipeline: polls RSS feeds, scores for SEO + viral potential, extracts & fact-checks data, generates a 2000+ word article with zero-click snippet, FAQ, glossary, and publishes to WordPress with a cover image.',
    'content',
    ARRAY['ai', 'content', 'rss', 'automation', 'news'],
    'Newspaper',
    'cron.job_executed',
    '{}',
    '[
        {"module": "content-engine", "action": "poll_all_feeds", "params": {}},
        {"module": "content-engine", "action": "score_batch", "params": {"limit": 20}},
        {"module": "content-engine", "action": "extract_facts", "params": {"limit": 10}},
        {"module": "content-engine", "action": "fact_check", "params": {}},
        {"module": "content-engine", "action": "generate_all_sections", "params": {"preset": "full-article"}},
        {"module": "content-engine", "action": "assemble_article", "params": {}},
        {"module": "nana-banana", "action": "run_pipeline", "params": {}},
        {"module": "content-engine", "action": "publish_to_wp", "params": {}}
    ]'::jsonb,
    ARRAY['content-engine', 'nana-banana', 'cron'],
    true,
    true
),
(
    'ai-news-engine-quick-post',
    'AI News Engine — Quick News Post',
    'Fast news pipeline: polls feeds, scores, extracts facts, generates a 500-800 word news post, and publishes to WordPress as draft.',
    'content',
    ARRAY['ai', 'content', 'rss', 'news', 'quick'],
    'Zap',
    'cron.job_executed',
    '{}',
    '[
        {"module": "content-engine", "action": "poll_all_feeds", "params": {}},
        {"module": "content-engine", "action": "score_batch", "params": {"limit": 10}},
        {"module": "content-engine", "action": "extract_facts", "params": {"limit": 5}},
        {"module": "content-engine", "action": "generate_all_sections", "params": {"preset": "news-post"}},
        {"module": "content-engine", "action": "assemble_article", "params": {}},
        {"module": "content-engine", "action": "publish_to_wp", "params": {}}
    ]'::jsonb,
    ARRAY['content-engine', 'cron'],
    true,
    true
),
(
    'low-ctr-rescue',
    'Low CTR Rescue',
    'When a page is TOP-3 but CTR < 2%, analyze title and generate alternatives.',
    'seo',
    ARRAY['seo', 'ctr', 'title', 'optimization'],
    'TrendingDown',
    'gsc.low_ctr_found',
    '{"max_ctr": 2, "max_position": 3}',
    '[
        {"module": "gemini-architect", "action": "analyze_title", "params": {}},
        {"module": "gemini-architect", "action": "generate_titles", "params": {"count": 3}},
        {"module": "rankmath-bridge", "action": "create_draft", "params": {"status": "draft"}}
    ]'::jsonb,
    ARRAY['gemini-architect', 'rankmath-bridge', 'gsc-insights'],
    true,
    true
),
(
    'smart-position-rescue',
    'Smart Position Rescue',
    'When a keyword drops from TOP-5, analyze content, find gaps, and generate an optimized rewrite.',
    'seo',
    ARRAY['seo', 'rank', 'position', 'rescue'],
    'Shield',
    'rank.position_dropped',
    '{"min_drop": 5}',
    '[
        {"module": "gemini-architect", "action": "analyze_content", "params": {}},
        {"module": "gemini-architect", "action": "find_semantic_gaps", "params": {}},
        {"module": "gemini-architect", "action": "generate_rewrite", "params": {"tone": "authoritative"}}
    ]'::jsonb,
    ARRAY['gemini-architect', 'rank-pulse'],
    true,
    true
),
(
    'new-keyword-alert',
    'New Keyword Alert',
    'When GSC discovers new keywords, check their positions and take a SERP snapshot.',
    'monitoring',
    ARRAY['seo', 'keyword', 'alert', 'gsc'],
    'Bell',
    'gsc.keyword_discovered',
    '{}',
    '[
        {"module": "rank-pulse", "action": "check_positions", "params": {}},
        {"module": "rank-pulse", "action": "snapshot_serp", "params": {}}
    ]'::jsonb,
    ARRAY['rank-pulse', 'gsc-insights'],
    true,
    false
);
