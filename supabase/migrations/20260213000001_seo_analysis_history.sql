-- SEO Analysis History table
CREATE TABLE seo_analysis_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID,
    post_id UUID,
    score INTEGER NOT NULL,
    results JSONB NOT NULL DEFAULT '{}',
    analyzed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_seo_analysis_article ON seo_analysis_history(article_id) WHERE article_id IS NOT NULL;
CREATE INDEX idx_seo_analysis_post ON seo_analysis_history(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_seo_analysis_date ON seo_analysis_history(analyzed_at DESC);

ALTER TABLE seo_analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access analysis" ON seo_analysis_history
    FOR ALL TO service_role USING (true);
