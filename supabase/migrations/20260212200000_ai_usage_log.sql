-- AI Usage Log: tracks token counts and costs for every AI Writer request
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost DECIMAL(10,6),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_usage_log_user_id ON ai_usage_log(user_id);
CREATE INDEX idx_ai_usage_log_created_at ON ai_usage_log(created_at);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs"
  ON ai_usage_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert usage logs"
  ON ai_usage_log FOR INSERT
  WITH CHECK (true);
