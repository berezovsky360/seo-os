-- =====================================================================
-- RANK PULSE + GSC INSIGHTS: Position History & Query-Level GSC Data
-- =====================================================================

-- 1. KEYWORD_POSITION_HISTORY: Daily position snapshots for trend charts
-- The existing `keywords` table only has current/previous — insufficient for 30-day charts.
CREATE TABLE keyword_position_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE NOT NULL,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  position INTEGER,              -- NULL means not found in top 100
  checked_at DATE DEFAULT CURRENT_DATE,
  UNIQUE(keyword_id, checked_at) -- One record per keyword per day
);

CREATE INDEX idx_kph_keyword ON keyword_position_history(keyword_id);
CREATE INDEX idx_kph_site_date ON keyword_position_history(site_id, checked_at DESC);
CREATE INDEX idx_kph_keyword_date ON keyword_position_history(keyword_id, checked_at DESC);

-- 2. GSC_QUERY_DATA: Per-query-per-page Google Search Console data
-- The existing `daily_stats` table is site-level aggregates only.
CREATE TABLE gsc_query_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  query TEXT NOT NULL,
  page TEXT,                       -- URL of the page
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,     -- 0.0345 = 3.45%
  position DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, date, query, page)
);

CREATE INDEX idx_gqd_site_date ON gsc_query_data(site_id, date DESC);
CREATE INDEX idx_gqd_site_query ON gsc_query_data(site_id, query);
CREATE INDEX idx_gqd_site_page ON gsc_query_data(site_id, page) WHERE page IS NOT NULL;
CREATE INDEX idx_gqd_impressions ON gsc_query_data(site_id, impressions DESC);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE keyword_position_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_query_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own keyword history" ON keyword_position_history
  FOR ALL USING (
    site_id IN (SELECT id FROM sites WHERE user_id = auth.uid())
  )
  WITH CHECK (
    site_id IN (SELECT id FROM sites WHERE user_id = auth.uid())
  );

CREATE POLICY "Users see own GSC data" ON gsc_query_data
  FOR ALL USING (
    site_id IN (SELECT id FROM sites WHERE user_id = auth.uid())
  )
  WITH CHECK (
    site_id IN (SELECT id FROM sites WHERE user_id = auth.uid())
  );
