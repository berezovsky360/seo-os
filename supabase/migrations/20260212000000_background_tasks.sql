-- Background Tasks table for tracking long-running operations
CREATE TABLE background_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result JSONB,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE background_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_tasks" ON background_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_bt_user_status ON background_tasks(user_id, status);
CREATE INDEX idx_bt_user_created ON background_tasks(user_id, created_at DESC);

-- IMPORTANT: After running this migration in Supabase SQL Editor,
-- enable Realtime on this table:
-- Supabase Dashboard -> Database -> Replication -> add background_tasks
