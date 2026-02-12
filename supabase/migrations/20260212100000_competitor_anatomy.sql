-- =====================================================================
-- COMPETITOR ANATOMY: On-Page SEO analysis via DataForSEO On-Page API
-- =====================================================================

-- 1. CRAWL TASKS: Track crawl jobs
CREATE TABLE onpage_crawls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
  target_domain TEXT NOT NULL,
  task_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','crawling','completed','failed')),
  max_crawl_pages INTEGER DEFAULT 100,
  crawl_options JSONB DEFAULT '{}',
  pages_crawled INTEGER DEFAULT 0,
  pages_total INTEGER,
  crawl_progress INTEGER DEFAULT 0 CHECK (crawl_progress >= 0 AND crawl_progress <= 100),
  estimated_cost DECIMAL(10,4),
  actual_cost DECIMAL(10,4),
  summary JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_oc_user ON onpage_crawls(user_id);
CREATE INDEX idx_oc_domain ON onpage_crawls(target_domain);
CREATE INDEX idx_oc_status ON onpage_crawls(status);
CREATE INDEX idx_oc_task ON onpage_crawls(task_id);

-- 2. CRAWL PAGES: Per-page SEO data
CREATE TABLE onpage_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_id UUID REFERENCES onpage_crawls(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER,
  resource_type TEXT,
  media_type TEXT,
  size INTEGER,
  encoded_size INTEGER,
  total_transfer_size INTEGER,
  fetch_time DECIMAL(8,4),
  onpage_score DECIMAL(5,2),
  meta_title TEXT,
  meta_title_length INTEGER,
  meta_description TEXT,
  meta_description_length INTEGER,
  meta_keywords TEXT,
  canonical TEXT,
  content_word_count INTEGER,
  content_charset TEXT,
  h1_count INTEGER DEFAULT 0,
  h2_count INTEGER DEFAULT 0,
  h3_count INTEGER DEFAULT 0,
  h1_text TEXT[],
  internal_links_count INTEGER DEFAULT 0,
  external_links_count INTEGER DEFAULT 0,
  broken_links_count INTEGER DEFAULT 0,
  images_count INTEGER DEFAULT 0,
  images_without_alt INTEGER DEFAULT 0,
  images_size INTEGER DEFAULT 0,
  time_to_interactive DECIMAL(8,4),
  dom_complete DECIMAL(8,4),
  largest_contentful_paint DECIMAL(8,4),
  cumulative_layout_shift DECIMAL(8,4),
  is_indexable BOOLEAN DEFAULT true,
  no_index BOOLEAN DEFAULT false,
  no_follow BOOLEAN DEFAULT false,
  checks JSONB,
  page_timing JSONB,
  last_modified TIMESTAMPTZ,
  crawled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crawl_id, url)
);

CREATE INDEX idx_op_crawl ON onpage_pages(crawl_id);
CREATE INDEX idx_op_score ON onpage_pages(crawl_id, onpage_score);
CREATE INDEX idx_op_status ON onpage_pages(crawl_id, status_code);
CREATE INDEX idx_op_word_count ON onpage_pages(crawl_id, content_word_count);

-- 3. DUPLICATE CONTENT: Pairs of pages with similar content
CREATE TABLE onpage_duplicates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_id UUID REFERENCES onpage_crawls(id) ON DELETE CASCADE NOT NULL,
  duplicate_type TEXT NOT NULL CHECK (duplicate_type IN ('title','description','content')),
  url_1 TEXT NOT NULL,
  url_2 TEXT NOT NULL,
  similarity DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_od_crawl ON onpage_duplicates(crawl_id);

-- 4. REDIRECT CHAINS
CREATE TABLE onpage_redirects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_id UUID REFERENCES onpage_crawls(id) ON DELETE CASCADE NOT NULL,
  from_url TEXT NOT NULL,
  to_url TEXT NOT NULL,
  redirect_code INTEGER,
  chain_length INTEGER DEFAULT 1,
  is_redirect_loop BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_or_crawl ON onpage_redirects(crawl_id);

-- 5. INSTANT AUDITS: Quick single-page audit results
CREATE TABLE onpage_instant_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  onpage_score DECIMAL(5,2),
  meta_title TEXT,
  meta_description TEXT,
  content_word_count INTEGER,
  h1_count INTEGER,
  internal_links INTEGER,
  external_links INTEGER,
  images_count INTEGER,
  images_without_alt INTEGER,
  status_code INTEGER,
  is_indexable BOOLEAN,
  checks JSONB,
  page_timing JSONB,
  raw_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_oia_user ON onpage_instant_audits(user_id);
CREATE INDEX idx_oia_url ON onpage_instant_audits(url);

-- 6. ROW LEVEL SECURITY
ALTER TABLE onpage_crawls ENABLE ROW LEVEL SECURITY;
ALTER TABLE onpage_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE onpage_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onpage_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE onpage_instant_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crawls_own" ON onpage_crawls
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "pages_via_crawl" ON onpage_pages
  FOR ALL USING (crawl_id IN (SELECT id FROM onpage_crawls WHERE user_id = auth.uid()));

CREATE POLICY "duplicates_via_crawl" ON onpage_duplicates
  FOR ALL USING (crawl_id IN (SELECT id FROM onpage_crawls WHERE user_id = auth.uid()));

CREATE POLICY "redirects_via_crawl" ON onpage_redirects
  FOR ALL USING (crawl_id IN (SELECT id FROM onpage_crawls WHERE user_id = auth.uid()));

CREATE POLICY "instant_audits_own" ON onpage_instant_audits
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- IMPORTANT: After running this migration, enable Realtime on onpage_crawls table
-- Supabase Dashboard -> Database -> Replication -> add onpage_crawls
