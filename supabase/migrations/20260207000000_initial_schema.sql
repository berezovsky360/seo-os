-- SEO OS Initial Schema Migration
-- 5 tables: sites, posts, keywords, daily_stats, generated_articles

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SITES - WordPress sites
CREATE TABLE sites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Site info
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  favicon TEXT,
  theme TEXT DEFAULT 'hyper-blue',

  -- WordPress credentials (will be encrypted in production)
  wp_username TEXT,
  wp_app_password TEXT,

  -- Google integrations
  gsc_property TEXT,           -- "https://example.com/"
  ga_property_id TEXT,          -- "properties/123456789"

  -- Settings
  tone_of_voice TEXT DEFAULT '',
  language TEXT DEFAULT 'ru',
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. POSTS - WordPress posts with Rank Math data
CREATE TABLE posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,

  -- WordPress data
  wp_post_id INTEGER,
  title TEXT NOT NULL,
  slug TEXT,
  url TEXT,
  status TEXT DEFAULT 'draft',  -- draft, publish, pending, private
  content TEXT,

  -- Rank Math SEO data
  seo_score INTEGER,            -- 0-100
  focus_keyword TEXT,
  seo_title TEXT,
  seo_description TEXT,
  is_indexable BOOLEAN DEFAULT true,
  schema_type TEXT,
  word_count INTEGER,

  -- Timestamps
  published_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(site_id, wp_post_id)
);

-- 3. KEYWORDS - Keyword position tracking
CREATE TABLE keywords (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,

  -- Keyword data
  keyword TEXT NOT NULL,
  language TEXT DEFAULT 'ru',
  location_code INTEGER DEFAULT 2643,  -- DataForSEO location (Russia)

  -- Position tracking
  current_position INTEGER,
  previous_position INTEGER,

  -- SEO metrics
  search_volume INTEGER,
  keyword_difficulty INTEGER,

  -- Timestamps
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(site_id, keyword, language, location_code)
);

-- 4. DAILY_STATS - Traffic metrics (GSC + GA4)
CREATE TABLE daily_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Google Search Console metrics
  gsc_clicks INTEGER DEFAULT 0,
  gsc_impressions INTEGER DEFAULT 0,
  gsc_ctr DECIMAL(5,2) DEFAULT 0,
  gsc_position DECIMAL(5,2) DEFAULT 0,

  -- Google Analytics 4 metrics
  ga_sessions INTEGER DEFAULT 0,
  ga_users INTEGER DEFAULT 0,
  ga_pageviews INTEGER DEFAULT 0,
  ga_bounce_rate DECIMAL(5,2) DEFAULT 0,
  ga_avg_session_duration DECIMAL(8,2) DEFAULT 0,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(site_id, date)
);

-- 5. GENERATED_ARTICLES - AI-generated content before publishing
CREATE TABLE generated_articles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,

  -- Article data
  keyword TEXT NOT NULL,
  title TEXT,
  seo_title TEXT,
  seo_description TEXT,
  content TEXT,
  word_count INTEGER,

  -- Status tracking
  status TEXT DEFAULT 'draft',  -- draft, reviewed, published
  wp_post_id INTEGER,           -- Filled after publishing to WP

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX idx_sites_user_id ON sites(user_id);
CREATE INDEX idx_sites_url ON sites(url);

CREATE INDEX idx_posts_site_id ON posts(site_id);
CREATE INDEX idx_posts_wp_post_id ON posts(wp_post_id);
CREATE INDEX idx_posts_status ON posts(status);

CREATE INDEX idx_keywords_site_id ON keywords(site_id);
CREATE INDEX idx_keywords_keyword ON keywords(keyword);
CREATE INDEX idx_keywords_position ON keywords(current_position);

CREATE INDEX idx_daily_stats_site_id ON daily_stats(site_id);
CREATE INDEX idx_daily_stats_date ON daily_stats(date);

CREATE INDEX idx_generated_articles_site_id ON generated_articles(site_id);
CREATE INDEX idx_generated_articles_status ON generated_articles(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to sites table
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
