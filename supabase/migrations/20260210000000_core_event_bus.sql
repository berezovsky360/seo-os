-- =====================================================================
-- CORE EVENT BUS: Module System + Event-Driven Architecture
-- =====================================================================

-- 1. EVENTS_LOG: The central message bus — all module communication goes through here
CREATE TABLE events_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Event identification
  event_type TEXT NOT NULL,
  source_module TEXT NOT NULL,

  -- Event data
  payload JSONB NOT NULL DEFAULT '{}',

  -- Context
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),

  -- Processing state
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_by TEXT[] DEFAULT '{}',
  result JSONB,
  error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_events_user_type ON events_log(user_id, event_type);
CREATE INDEX idx_events_status ON events_log(status) WHERE status = 'pending';
CREATE INDEX idx_events_site ON events_log(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_events_created ON events_log(created_at DESC);
CREATE INDEX idx_events_user_created ON events_log(user_id, created_at DESC);

-- 2. API_KEYS: Encrypted third-party API key storage
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_type TEXT NOT NULL,
  label TEXT,
  encrypted_value TEXT NOT NULL,
  is_valid BOOLEAN DEFAULT false,
  last_validated_at TIMESTAMPTZ,
  validation_error TEXT,
  usage_count INTEGER DEFAULT 0,
  balance DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key_type)
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_type ON api_keys(user_id, key_type);

-- 3. MODULES_CONFIG: Per-user module enable/disable state + settings
CREATE TABLE modules_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module_id)
);

CREATE INDEX idx_modules_config_user ON modules_config(user_id);
CREATE INDEX idx_modules_config_enabled ON modules_config(user_id, enabled) WHERE enabled = true;

-- 4. RECIPES: Automation chains (trigger → conditions → actions)
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  trigger_event TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '{}',
  actions JSONB NOT NULL,
  site_ids UUID[],
  times_triggered INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recipes_user ON recipes(user_id);
CREATE INDEX idx_recipes_trigger ON recipes(trigger_event) WHERE enabled = true;

-- 5. USER_PREFERENCES: Onboarding state + UI settings
CREATE TABLE user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  setup_completed BOOLEAN DEFAULT false,
  setup_step INTEGER DEFAULT 0,
  default_view TEXT DEFAULT 'dashboard',
  language TEXT DEFAULT 'en',
  notification_channels JSONB DEFAULT '{"email": true, "telegram": false}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own events" ON events_log
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own api keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own modules" ON modules_config
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own recipes" ON recipes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- TRIGGERS (updated_at)
-- =====================================================================

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_config_updated_at
  BEFORE UPDATE ON modules_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- ENABLE REALTIME for events_log (for Supabase Realtime subscriptions)
-- =====================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE events_log;
