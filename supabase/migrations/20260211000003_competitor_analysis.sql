-- =====================================================================
-- COMPETITOR ANALYSIS: Track and compare competitor domains
-- =====================================================================

-- 1. COMPETITORS: Domains to monitor per site
CREATE TABLE competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  name TEXT,
  last_synced_at TIMESTAMPTZ,
  ranked_keywords_count INTEGER DEFAULT 0,
  organic_traffic_estimate INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, domain)
);

CREATE INDEX idx_competitors_site ON competitors(site_id);
CREATE INDEX idx_competitors_user ON competitors(user_id);

-- 2. COMPETITOR_KEYWORDS: Keywords a competitor ranks for
CREATE TABLE competitor_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE NOT NULL,
  keyword TEXT NOT NULL,
  search_volume INTEGER,
  position INTEGER,
  url TEXT,
  keyword_difficulty INTEGER,
  cpc DECIMAL(8,2),
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competitor_id, keyword)
);

CREATE INDEX idx_ck_competitor ON competitor_keywords(competitor_id);
CREATE INDEX idx_ck_keyword ON competitor_keywords(keyword);
CREATE INDEX idx_ck_position ON competitor_keywords(competitor_id, position);

-- RLS
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own competitors" ON competitors
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users see own competitor keywords" ON competitor_keywords
  FOR ALL USING (
    competitor_id IN (SELECT id FROM competitors WHERE user_id = auth.uid())
  )
  WITH CHECK (
    competitor_id IN (SELECT id FROM competitors WHERE user_id = auth.uid())
  );
