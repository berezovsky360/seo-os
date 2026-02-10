-- Add platform column to sites table
ALTER TABLE sites ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'wordpress';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS platform_credentials JSONB DEFAULT '{}';

-- Index for platform filtering
CREATE INDEX IF NOT EXISTS idx_sites_platform ON sites(platform);
