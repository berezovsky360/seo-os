-- Add display_order column for drag-n-drop reordering of site tiles and competitor rows
ALTER TABLE sites ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Initialize display_order from creation order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM sites
)
UPDATE sites SET display_order = ordered.rn
FROM ordered WHERE sites.id = ordered.id;

-- Index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_sites_display_order ON sites(display_order);
