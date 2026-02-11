-- Content Engine: RSS feeds, ingested items, clusters, pipeline runs

-- RSS feed sources
CREATE TABLE content_feeds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    feed_url TEXT NOT NULL,
    feed_type TEXT DEFAULT 'rss',
    enabled BOOLEAN DEFAULT true,
    poll_interval_minutes INTEGER DEFAULT 60,
    last_polled_at TIMESTAMPTZ,
    last_item_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own feeds" ON content_feeds
    FOR ALL USING (auth.uid() = user_id);

-- Ingested content items
CREATE TABLE content_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    feed_id UUID REFERENCES content_feeds(id) ON DELETE CASCADE NOT NULL,
    guid TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    content TEXT,
    published_at TIMESTAMPTZ,
    seo_score REAL,
    viral_score REAL,
    combined_score REAL,
    score_reasoning TEXT,
    extracted_facts JSONB DEFAULT '[]',
    extracted_keywords JSONB DEFAULT '[]',
    fact_check_results JSONB,
    cluster_id UUID,
    embedding VECTOR(768),
    status TEXT DEFAULT 'ingested',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(feed_id, guid)
);

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own items" ON content_items
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_content_items_user_status ON content_items(user_id, status);
CREATE INDEX idx_content_items_feed_guid ON content_items(feed_id, guid);
CREATE INDEX idx_content_items_cluster ON content_items(cluster_id);
CREATE INDEX idx_content_items_score ON content_items(combined_score DESC NULLS LAST);

-- Semantic clusters
CREATE TABLE content_clusters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    label TEXT NOT NULL,
    summary TEXT,
    item_count INTEGER DEFAULT 0,
    avg_score REAL,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own clusters" ON content_clusters
    FOR ALL USING (auth.uid() = user_id);

-- FK from items to clusters
ALTER TABLE content_items ADD CONSTRAINT fk_content_items_cluster
    FOREIGN KEY (cluster_id) REFERENCES content_clusters(id) ON DELETE SET NULL;

-- Pipeline execution log
CREATE TABLE content_pipeline_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    preset TEXT NOT NULL,
    source_item_ids UUID[] DEFAULT '{}',
    cluster_id UUID REFERENCES content_clusters(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    sections JSONB DEFAULT '{}',
    assembled_html TEXT,
    generated_article_id UUID,
    wp_post_id INTEGER,
    title TEXT,
    focus_keyword TEXT,
    seo_title TEXT,
    seo_description TEXT,
    word_count INTEGER,
    error TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE content_pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own pipeline runs" ON content_pipeline_runs
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_pipeline_runs_user_status ON content_pipeline_runs(user_id, status);
