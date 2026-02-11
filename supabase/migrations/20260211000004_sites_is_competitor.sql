-- Add is_competitor flag to sites table
ALTER TABLE sites ADD COLUMN is_competitor BOOLEAN DEFAULT false;
