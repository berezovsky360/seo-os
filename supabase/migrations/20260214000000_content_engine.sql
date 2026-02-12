-- Content Engine: RSS feeds, ingested items, clusters, pipeline runs

-- Enable pgvector for embeddings (safe to call multiple times)
CREATE EXTENSION IF NOT EXISTS vector;

-- RSS feed sources
CREATE TABLE IF NOT EXISTS content_feeds (
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_feeds' AND policyname = 'Users can manage own feeds') THEN
    CREATE POLICY "Users can manage own feeds" ON content_feeds FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Ingested content items
CREATE TABLE IF NOT EXISTS content_items (
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
    image_url TEXT,
    embedding VECTOR(768),
    status TEXT DEFAULT 'ingested',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(feed_id, guid)
);

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_items' AND policyname = 'Users can manage own items') THEN
    CREATE POLICY "Users can manage own items" ON content_items FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_items_user_status ON content_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_content_items_feed_guid ON content_items(feed_id, guid);
CREATE INDEX IF NOT EXISTS idx_content_items_cluster ON content_items(cluster_id);
CREATE INDEX IF NOT EXISTS idx_content_items_score ON content_items(combined_score DESC NULLS LAST);

-- Semantic clusters
CREATE TABLE IF NOT EXISTS content_clusters (
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_clusters' AND policyname = 'Users can manage own clusters') THEN
    CREATE POLICY "Users can manage own clusters" ON content_clusters FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- FK from items to clusters (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_content_items_cluster') THEN
    ALTER TABLE content_items ADD CONSTRAINT fk_content_items_cluster
      FOREIGN KEY (cluster_id) REFERENCES content_clusters(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Pipeline execution log
CREATE TABLE IF NOT EXISTS content_pipeline_runs (
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
    scheduled_publish_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE content_pipeline_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_pipeline_runs' AND policyname = 'Users can manage own pipeline runs') THEN
    CREATE POLICY "Users can manage own pipeline runs" ON content_pipeline_runs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_user_status ON content_pipeline_runs(user_id, status);

-- Idempotent column additions for existing tables
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE content_pipeline_runs ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;
