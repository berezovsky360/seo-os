-- Add graph layout storage to recipes table for visual editor
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS graph_layout JSONB;

COMMENT ON COLUMN recipes.graph_layout IS 'React Flow node positions, edges, and viewport state for the visual editor';
