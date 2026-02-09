-- =====================================================================
-- Add cover style reference fields to sites table
-- Used by Nana Banana module for consistent image generation style
-- =====================================================================

ALTER TABLE sites ADD COLUMN IF NOT EXISTS cover_style_prompt TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS cover_reference_url TEXT;
