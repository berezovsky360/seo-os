-- ============================================================
-- Any Chat: unified messaging for notifications & human-in-the-loop
-- ============================================================

-- 1. Chat channels (connected platforms)
CREATE TABLE IF NOT EXISTS chat_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  platform_chat_id TEXT NOT NULL DEFAULT '',
  bot_token TEXT,
  channel_name TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_user ON chat_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_platform ON chat_channels(platform, platform_chat_id);

-- updated_at trigger
CREATE TRIGGER update_chat_channels_updated_at
  BEFORE UPDATE ON chat_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. Chat messages (sent & received)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE NOT NULL,
  direction TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  platform_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, created_at DESC);

-- 3. Notification rules (which events go to which channel)
CREATE TABLE IF NOT EXISTS chat_notification_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE NOT NULL,
  event_pattern TEXT NOT NULL,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  template TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_rules_user ON chat_notification_rules(user_id);

-- 4. RLS
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notification_rules ENABLE ROW LEVEL SECURITY;

-- chat_channels policies
CREATE POLICY "Users can view own channels" ON chat_channels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own channels" ON chat_channels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own channels" ON chat_channels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own channels" ON chat_channels FOR DELETE USING (auth.uid() = user_id);

-- chat_messages policies
CREATE POLICY "Users can view own messages" ON chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- chat_notification_rules policies
CREATE POLICY "Users can view own rules" ON chat_notification_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rules" ON chat_notification_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rules" ON chat_notification_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rules" ON chat_notification_rules FOR DELETE USING (auth.uid() = user_id);
