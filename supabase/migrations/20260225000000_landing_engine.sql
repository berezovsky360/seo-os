-- Landing Engine tables: templates, sites, pages
-- Lightweight static site builder for 100/100 PageSpeed blogs

-- Templates
CREATE TABLE IF NOT EXISTS landing_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  manifest JSONB NOT NULL DEFAULT '{}',
  layouts JSONB NOT NULL DEFAULT '{}',
  partials JSONB NOT NULL DEFAULT '{}',
  critical_css TEXT NOT NULL DEFAULT '',
  theme_css TEXT,
  is_builtin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sites on the landing engine
CREATE TABLE IF NOT EXISTS landing_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  template_id UUID REFERENCES landing_templates(id) NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Site',
  domain TEXT,
  subdomain TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  nav_links JSONB DEFAULT '[]',
  footer_html TEXT,
  analytics_id TEXT,
  is_published BOOLEAN DEFAULT false,
  last_built_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pages / articles on a landing site
CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_site_id UUID REFERENCES landing_sites(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL,
  page_type TEXT DEFAULT 'post',
  title TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  content TEXT,
  og_image TEXT,
  category TEXT,
  tags TEXT[],
  author_name TEXT,
  word_count INTEGER,
  reading_time INTEGER,
  featured_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  modified_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  rendered_html TEXT,
  UNIQUE(landing_site_id, slug)
);

-- RLS
ALTER TABLE landing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read templates" ON landing_templates
  FOR SELECT USING (true);

CREATE POLICY "Users manage own landing sites" ON landing_sites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own landing pages" ON landing_pages
  FOR ALL USING (
    landing_site_id IN (SELECT id FROM landing_sites WHERE user_id = auth.uid())
  )
  WITH CHECK (
    landing_site_id IN (SELECT id FROM landing_sites WHERE user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_landing_sites_user ON landing_sites(user_id);
CREATE INDEX idx_landing_pages_site ON landing_pages(landing_site_id);
CREATE INDEX idx_landing_pages_slug ON landing_pages(landing_site_id, slug);
