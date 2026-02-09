-- SEO OS Row Level Security Policies
-- Users can only access their own data

-- Enable RLS on all tables
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_articles ENABLE ROW LEVEL SECURITY;

-- SITES policies
-- Users can view and manage only their own sites
CREATE POLICY "Users can view own sites"
  ON sites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sites"
  ON sites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sites"
  ON sites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sites"
  ON sites FOR DELETE
  USING (auth.uid() = user_id);

-- POSTS policies
-- Users can access posts from their sites
CREATE POLICY "Users can view posts from own sites"
  ON posts FOR SELECT
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert posts to own sites"
  ON posts FOR INSERT
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can update posts from own sites"
  ON posts FOR UPDATE
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete posts from own sites"
  ON posts FOR DELETE
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

-- KEYWORDS policies
CREATE POLICY "Users can view keywords from own sites"
  ON keywords FOR SELECT
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert keywords to own sites"
  ON keywords FOR INSERT
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can update keywords from own sites"
  ON keywords FOR UPDATE
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete keywords from own sites"
  ON keywords FOR DELETE
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

-- DAILY_STATS policies
CREATE POLICY "Users can view stats from own sites"
  ON daily_stats FOR SELECT
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert stats to own sites"
  ON daily_stats FOR INSERT
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can update stats from own sites"
  ON daily_stats FOR UPDATE
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete stats from own sites"
  ON daily_stats FOR DELETE
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

-- GENERATED_ARTICLES policies
CREATE POLICY "Users can view articles from own sites"
  ON generated_articles FOR SELECT
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert articles to own sites"
  ON generated_articles FOR INSERT
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can update articles from own sites"
  ON generated_articles FOR UPDATE
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete articles from own sites"
  ON generated_articles FOR DELETE
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));
