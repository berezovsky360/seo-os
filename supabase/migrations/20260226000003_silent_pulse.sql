-- Silent Pulse: edge analytics tables

CREATE TABLE pulse_page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_site_id UUID REFERENCES landing_sites(id) ON DELETE CASCADE NOT NULL,
  page_path TEXT NOT NULL,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  avg_duration_seconds INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  UNIQUE(landing_site_id, page_path, date)
);

CREATE TABLE pulse_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_site_id UUID REFERENCES landing_sites(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  page_views INTEGER DEFAULT 0,
  country TEXT,
  device TEXT,
  referrer TEXT,
  UNIQUE(landing_site_id, session_id)
);

CREATE TABLE pulse_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_site_id UUID REFERENCES landing_sites(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  page_path TEXT,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE pulse_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own pulse views" ON pulse_page_views FOR SELECT
  USING (landing_site_id IN (SELECT id FROM landing_sites WHERE user_id = auth.uid()));
CREATE POLICY "Service insert pulse views" ON pulse_page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update pulse views" ON pulse_page_views FOR UPDATE WITH CHECK (true);

CREATE POLICY "Users read own sessions" ON pulse_sessions FOR SELECT
  USING (landing_site_id IN (SELECT id FROM landing_sites WHERE user_id = auth.uid()));
CREATE POLICY "Service manage sessions" ON pulse_sessions FOR ALL WITH CHECK (true);

CREATE POLICY "Users read own events" ON pulse_events FOR SELECT
  USING (landing_site_id IN (SELECT id FROM landing_sites WHERE user_id = auth.uid()));
CREATE POLICY "Service insert events" ON pulse_events FOR INSERT WITH CHECK (true);

CREATE INDEX idx_pulse_sessions_site ON pulse_sessions(landing_site_id);
CREATE INDEX idx_pulse_events_session ON pulse_events(session_id);
CREATE INDEX idx_pulse_views_date ON pulse_page_views(landing_site_id, date);
