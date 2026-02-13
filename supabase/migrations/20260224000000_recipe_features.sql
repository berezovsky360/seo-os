-- Recipe Versioning: store snapshots before each edit
CREATE TABLE IF NOT EXISTS recipe_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  version_number INT NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  label TEXT
);

CREATE INDEX IF NOT EXISTS idx_recipe_versions_recipe ON recipe_versions(recipe_id, version_number DESC);

ALTER TABLE recipe_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own recipe versions" ON recipe_versions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Recipe Archiving: soft-delete column
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
