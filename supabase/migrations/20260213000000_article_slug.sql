-- Add slug column to generated_articles
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE INDEX IF NOT EXISTS idx_generated_articles_slug ON generated_articles(slug) WHERE slug IS NOT NULL;
