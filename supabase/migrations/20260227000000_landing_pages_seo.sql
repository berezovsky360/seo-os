-- Landing Pages SEO columns: robots meta, schema type
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS robots_meta TEXT DEFAULT 'index, follow';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS schema_type TEXT DEFAULT 'Article';

-- Landing Sites: robots.txt and sitemap configuration
ALTER TABLE landing_sites ADD COLUMN IF NOT EXISTS robots_config JSONB DEFAULT '{"user_agent":"*","allow":["/"],"disallow":[]}';
ALTER TABLE landing_sites ADD COLUMN IF NOT EXISTS sitemap_config JSONB DEFAULT '{"include_drafts":false}';
