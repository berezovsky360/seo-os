-- Funnel Builder — Visual funnel constructor
-- Links landing pages → forms → email → conversions

-- Funnels table
CREATE TABLE IF NOT EXISTS funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  graph JSONB NOT NULL DEFAULT '{}',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Funnel step analytics
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  visitor_id TEXT,
  lead_id UUID REFERENCES leads(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_funnel ON funnel_events(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_node ON funnel_events(funnel_id, node_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_type ON funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_funnels_user ON funnels(user_id);
CREATE INDEX IF NOT EXISTS idx_funnels_site ON funnels(site_id);

ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
