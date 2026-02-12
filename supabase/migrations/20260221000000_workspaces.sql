-- ============================================================
-- Workspaces: organize sites into groups within a single user account
-- ============================================================

-- 1. Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🏢',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);

-- updated_at trigger (reuses existing function from initial_schema)
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspaces"
  ON workspaces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspaces"
  ON workspaces FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspaces"
  ON workspaces FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Add workspace_id to sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sites_workspace ON sites(workspace_id);

-- 4. Extend handle_new_user() trigger to also create default workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user profile (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    INSERT INTO public.user_profiles (user_id, display_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
      'user'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Create default workspace
  INSERT INTO public.workspaces (user_id, name, emoji, is_default)
  VALUES (NEW.id, 'My Workspace', '🏢', true);

  RETURN NEW;
END;
$$;

-- 5. Backfill: create default workspace for existing users who don't have one
INSERT INTO workspaces (user_id, name, emoji, is_default)
SELECT u.id, 'My Workspace', '🏢', true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w WHERE w.user_id = u.id
);

-- 6. Assign existing sites to their owner's default workspace
UPDATE sites
SET workspace_id = (
  SELECT w.id FROM workspaces w
  WHERE w.user_id = sites.user_id AND w.is_default = true
  LIMIT 1
)
WHERE workspace_id IS NULL;
