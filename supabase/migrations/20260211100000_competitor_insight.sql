-- =====================================================================
-- COMPETITOR INSIGHT: Deep competitive analysis extensions
-- =====================================================================

-- 1. Extend competitors table with domain-level metrics
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS domain_rank INTEGER;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS organic_etv INTEGER;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS organic_keywords_total INTEGER;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS keywords_top3 INTEGER DEFAULT 0;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS keywords_top10 INTEGER DEFAULT 0;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS keywords_top100 INTEGER DEFAULT 0;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS referring_domains INTEGER;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS backlinks_count INTEGER;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS location_code INTEGER DEFAULT 2643;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS language_code TEXT DEFAULT 'ru';

-- 2. Historical snapshots for tracking competitor metrics over time
CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE NOT NULL,
  domain_rank INTEGER,
  organic_etv INTEGER,
  organic_keywords_total INTEGER,
  keywords_top3 INTEGER,
  keywords_top10 INTEGER,
  keywords_top100 INTEGER,
  referring_domains INTEGER,
  backlinks_count INTEGER,
  snapshot_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competitor_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_cs_competitor ON competitor_snapshots(competitor_id);
CREATE INDEX IF NOT EXISTS idx_cs_date ON competitor_snapshots(snapshot_date);

-- 3. Top pages per competitor (sorted by estimated traffic)
CREATE TABLE IF NOT EXISTS competitor_top_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE NOT NULL,
  page_url TEXT NOT NULL,
  etv INTEGER DEFAULT 0,
  keywords_count INTEGER DEFAULT 0,
  top3_count INTEGER DEFAULT 0,
  top10_count INTEGER DEFAULT 0,
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competitor_id, page_url)
);

CREATE INDEX IF NOT EXISTS idx_ctp_competitor ON competitor_top_pages(competitor_id);

-- 4. Auto-discovered competitors from DataForSEO
CREATE TABLE IF NOT EXISTS competitor_discoveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  discovered_domain TEXT NOT NULL,
  intersections INTEGER DEFAULT 0,
  organic_etv INTEGER DEFAULT 0,
  organic_keywords INTEGER DEFAULT 0,
  avg_position DECIMAL(5,1),
  discovered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, discovered_domain)
);

CREATE INDEX IF NOT EXISTS idx_cd_site ON competitor_discoveries(site_id);

-- 5. RLS policies
ALTER TABLE competitor_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_top_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_discoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots_via_competitor" ON competitor_snapshots
  FOR ALL USING (competitor_id IN (SELECT id FROM competitors WHERE user_id = auth.uid()));

CREATE POLICY "top_pages_via_competitor" ON competitor_top_pages
  FOR ALL USING (competitor_id IN (SELECT id FROM competitors WHERE user_id = auth.uid()));

CREATE POLICY "discoveries_own" ON competitor_discoveries
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
