-- Add geolocation columns to active_sessions
ALTER TABLE active_sessions ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE active_sessions ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE active_sessions ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Add geolocation columns to login_history
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS country_code TEXT;
