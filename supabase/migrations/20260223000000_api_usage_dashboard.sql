-- API Usage Dashboard: extend ai_usage_log with service column + create usage_budgets table

-- 1. Add service column to ai_usage_log for multi-service tracking
ALTER TABLE ai_usage_log ADD COLUMN IF NOT EXISTS service TEXT DEFAULT 'gemini';

-- Backfill existing rows
UPDATE ai_usage_log SET service = 'gemini' WHERE service IS NULL;

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_service_date
  ON ai_usage_log(user_id, service, created_at DESC);

-- 2. Budget limits per service per user
CREATE TABLE IF NOT EXISTS usage_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service TEXT NOT NULL,
  monthly_limit DECIMAL(10,2) NOT NULL,
  alert_at_80 BOOLEAN DEFAULT true,
  alert_at_100 BOOLEAN DEFAULT true,
  block_at_limit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, service)
);

CREATE INDEX idx_usage_budgets_user ON usage_budgets(user_id);

ALTER TABLE usage_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets"
  ON usage_budgets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own budgets"
  ON usage_budgets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own budgets"
  ON usage_budgets FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own budgets"
  ON usage_budgets FOR DELETE
  USING (user_id = auth.uid());
