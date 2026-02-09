-- Article Versions table for backup & restore
-- Supports both generated_articles and posts (WP-synced) via polymorphic references

CREATE TABLE article_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Source reference (polymorphic - one of these will be set)
  article_id UUID,          -- References generated_articles.id
  post_id UUID,             -- References posts.id
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,

  -- Version metadata
  version_number INTEGER NOT NULL,
  version_label TEXT,        -- Optional: "Before publish", "Manual backup", "Auto-backup"
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Full snapshot of article state at this point in time
  snapshot JSONB NOT NULL,

  -- Quick-access fields for list display (extracted from snapshot)
  title TEXT,
  word_count INTEGER,
  seo_score INTEGER
);

-- Indexes for fast lookups
CREATE INDEX idx_versions_article ON article_versions(article_id) WHERE article_id IS NOT NULL;
CREATE INDEX idx_versions_post ON article_versions(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_versions_created ON article_versions(created_at DESC);

-- Row Level Security
ALTER TABLE article_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own versions" ON article_versions
  FOR ALL USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

-- Service role bypass for API routes
CREATE POLICY "Service role full access" ON article_versions
  FOR ALL USING (true) WITH CHECK (true);
