-- Ghost Popups: behavior-triggered popup overlays

CREATE TABLE ghost_popups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  landing_site_id UUID REFERENCES landing_sites(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  trigger_rules JSONB NOT NULL DEFAULT '{}',
  popup_html TEXT NOT NULL,
  popup_css TEXT,
  is_active BOOLEAN DEFAULT false,
  impressions INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ghost_popups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own popups" ON ghost_popups FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_popups_site ON ghost_popups(landing_site_id);
