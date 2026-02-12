-- Content Lots: Swipe-based content review decisions
-- Tracks user swipe actions (left=reject, right=approve, up=super like)

CREATE TABLE IF NOT EXISTS swipe_decisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES content_items(id) ON DELETE CASCADE NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('left', 'right', 'up')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE swipe_decisions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'swipe_decisions' AND policyname = 'Users manage own swipe decisions') THEN
    CREATE POLICY "Users manage own swipe decisions" ON swipe_decisions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_swipe_decisions_user ON swipe_decisions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_swipe_decisions_item ON swipe_decisions(item_id);
