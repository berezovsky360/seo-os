-- Conversion Lab: pipeline stages, interactions, notes

CREATE TABLE lead_pipeline_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false
);

CREATE TABLE lead_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  page_url TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lead_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE lead_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own stages" ON lead_pipeline_stages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own interactions" ON lead_interactions FOR ALL
  USING (lead_id IN (SELECT id FROM leads WHERE user_id = auth.uid()));
CREATE POLICY "Service insert interactions" ON lead_interactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users own notes" ON lead_notes FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_interactions_lead ON lead_interactions(lead_id);
CREATE INDEX idx_interactions_type ON lead_interactions(event_type);
CREATE INDEX idx_notes_lead ON lead_notes(lead_id);
CREATE INDEX idx_stages_user ON lead_pipeline_stages(user_id);
