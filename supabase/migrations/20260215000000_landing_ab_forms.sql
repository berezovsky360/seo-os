-- Landing Engine Upgrade: Form Embedding, A/B Testing, Edge Customization
-- Run this in Supabase SQL Editor

-- ========================
-- 1. Form Embedding on Pages
-- ========================

ALTER TABLE landing_pages ADD COLUMN form_ids UUID[] DEFAULT '{}';
ALTER TABLE landing_pages ADD COLUMN form_positions JSONB DEFAULT '[]';

-- ========================
-- 2. A/B Testing — Page Variants
-- ========================

CREATE TABLE landing_page_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE NOT NULL,
  variant_key TEXT NOT NULL,
  content TEXT,
  title TEXT,
  seo_title TEXT,
  seo_description TEXT,
  weight INTEGER DEFAULT 50,
  is_control BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(landing_page_id, variant_key)
);

ALTER TABLE landing_page_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own variants" ON landing_page_variants
  FOR ALL USING (
    landing_page_id IN (
      SELECT lp.id FROM landing_pages lp
      JOIN landing_sites ls ON ls.id = lp.landing_site_id
      WHERE ls.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access variants" ON landing_page_variants
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_variants_page ON landing_page_variants(landing_page_id);

-- ========================
-- 3. A/B Testing — Experiments
-- ========================

CREATE TABLE landing_experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  landing_site_id UUID REFERENCES landing_sites(id) ON DELETE CASCADE NOT NULL,
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  goal_type TEXT DEFAULT 'form_submit',
  goal_selector TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner_variant_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE landing_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own experiments" ON landing_experiments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access experiments" ON landing_experiments
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_experiments_site ON landing_experiments(landing_site_id);
CREATE INDEX idx_experiments_page ON landing_experiments(landing_page_id);
CREATE INDEX idx_experiments_status ON landing_experiments(status);

-- ========================
-- 4. Edge Customization Rules
-- ========================

ALTER TABLE landing_sites ADD COLUMN edge_rules JSONB DEFAULT '[]';
