-- Lead Factory: forms, magnets, leads, downloads

CREATE TABLE lead_magnets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  landing_site_id UUID REFERENCES landing_sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT DEFAULT 'pdf',
  description TEXT,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lead_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  landing_site_id UUID REFERENCES landing_sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  form_type TEXT DEFAULT 'inline',
  fields JSONB NOT NULL DEFAULT '[{"name":"email","type":"email","required":true}]',
  magnet_id UUID REFERENCES lead_magnets(id) ON DELETE SET NULL,
  success_message TEXT DEFAULT 'Thank you!',
  redirect_url TEXT,
  popup_config JSONB,
  button_text TEXT DEFAULT 'Download',
  is_active BOOLEAN DEFAULT true,
  submission_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  landing_site_id UUID REFERENCES landing_sites(id) ON DELETE CASCADE,
  form_id UUID REFERENCES lead_forms(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  custom_fields JSONB,
  source_url TEXT,
  source_page_id UUID,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  status TEXT DEFAULT 'new',
  pipeline_stage TEXT DEFAULT 'new',
  lead_score INTEGER DEFAULT 0,
  magnet_delivered BOOLEAN DEFAULT false,
  session_id TEXT,
  ip_country TEXT,
  device_type TEXT,
  last_seen_at TIMESTAMPTZ,
  total_page_views INTEGER DEFAULT 0,
  total_downloads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lead_downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  magnet_id UUID REFERENCES lead_magnets(id) ON DELETE CASCADE NOT NULL,
  source_article TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE lead_magnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own magnets" ON lead_magnets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own forms" ON lead_forms FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own leads" ON leads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own downloads" ON lead_downloads FOR ALL
  USING (lead_id IN (SELECT id FROM leads WHERE user_id = auth.uid()));

CREATE POLICY "Service can insert leads" ON leads FOR INSERT WITH CHECK (true);

CREATE INDEX idx_leads_site ON leads(landing_site_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_form ON leads(form_id);
CREATE INDEX idx_downloads_lead ON lead_downloads(lead_id);
