-- =====================================================================
-- Multi-image style references for Nana Banana
-- Replaces single cover_reference_url with JSONB array cover_reference_urls
-- =====================================================================

-- Add JSONB array column for up to 10 style reference image URLs
ALTER TABLE sites ADD COLUMN IF NOT EXISTS cover_reference_urls JSONB DEFAULT '[]';

-- Migrate existing single reference to array (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'cover_reference_url'
  ) THEN
    UPDATE sites
    SET cover_reference_urls = jsonb_build_array(cover_reference_url)
    WHERE cover_reference_url IS NOT NULL AND cover_reference_url != '';

    ALTER TABLE sites DROP COLUMN cover_reference_url;
  END IF;
END $$;
