-- Migration: Add full Rank Math field support to posts and generated_articles tables
-- Created: 2026-02-08
-- Purpose: Extend existing tables with ALL Rank Math metadata fields
--
-- HOW TO RUN: Copy this entire SQL and execute in Supabase SQL Editor
-- (https://supabase.com/dashboard -> SQL Editor -> New query -> Paste -> Run)

-- =====================================================================
-- PART 1: Extend posts table with missing Rank Math fields
-- =====================================================================

ALTER TABLE posts ADD COLUMN IF NOT EXISTS additional_keywords TEXT[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS robots_meta TEXT DEFAULT 'index,follow';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS og_title TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS og_description TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS og_image_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS twitter_title TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS twitter_description TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS twitter_image_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS twitter_card_type TEXT DEFAULT 'summary_large_image';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS readability_score INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_ai_score INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS internal_links_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS external_links_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS images_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS images_alt_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS primary_category_id INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS schema_article_type TEXT DEFAULT 'Article';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS schema_config JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_seo_analysis_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_score_history JSONB DEFAULT '[]'::jsonb;

-- =====================================================================
-- PART 2: Extend generated_articles table with same Rank Math fields
-- =====================================================================

ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS seo_score INTEGER;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS additional_keywords TEXT[] DEFAULT '{}';
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS robots_meta TEXT DEFAULT 'index,follow';
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS og_title TEXT;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS og_description TEXT;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS og_image_url TEXT;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS twitter_title TEXT;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS twitter_description TEXT;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS twitter_image_url TEXT;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS twitter_card_type TEXT DEFAULT 'summary_large_image';
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS readability_score INTEGER;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS content_ai_score INTEGER;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS internal_links_count INTEGER DEFAULT 0;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS external_links_count INTEGER DEFAULT 0;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS images_count INTEGER DEFAULT 0;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS images_alt_count INTEGER DEFAULT 0;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS primary_category_id INTEGER;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS schema_article_type TEXT DEFAULT 'Article';
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS schema_config JSONB;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS preliminary_seo_score INTEGER;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;

-- =====================================================================
-- PART 3: Create indexes for performance optimization
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_posts_seo_score ON posts(seo_score) WHERE seo_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_readability_score ON posts(readability_score) WHERE readability_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_generated_articles_status ON generated_articles(status);
CREATE INDEX IF NOT EXISTS idx_generated_articles_preliminary_score ON generated_articles(preliminary_seo_score) WHERE preliminary_seo_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generated_articles_last_analyzed ON generated_articles(last_analyzed_at DESC NULLS LAST);
