-- Content Lots: Swipe-based content review decisions
-- Tracks user swipe actions (left=reject, right=approve, up=super like)

CREATE TABLE swipe_decisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES content_items(id) ON DELETE CASCADE NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('left', 'right', 'up')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE swipe_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own swipe decisions"
    ON swipe_decisions FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX idx_swipe_decisions_user ON swipe_decisions(user_id, created_at DESC);
CREATE INDEX idx_swipe_decisions_item ON swipe_decisions(item_id);
