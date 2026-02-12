-- =====================================================================
-- USER PROFILES: Role-based access control + user metadata
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
  display_name TEXT,
  avatar_emoji TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile (display_name, avatar_emoji — NOT role)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role full access (for admin routes + trigger)
CREATE POLICY "Service role full access on user_profiles"
  ON user_profiles FOR ALL
  TO service_role
  USING (true);

-- =====================================================================
-- TRIGGER: Auto-create profile when a new user signs up
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    'user'
  );
  RETURN NEW;
END;
$$;

-- Drop if exists to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- BACKFILL: Create profiles for any existing users
-- =====================================================================

INSERT INTO user_profiles (user_id, display_name, role)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'first_name', split_part(email, '@', 1)),
  'user'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================================
-- SEED: Set super_admin for the primary account
-- =====================================================================

DO $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'berezovsky360@gmail.com';
  IF target_user_id IS NOT NULL THEN
    UPDATE public.user_profiles
    SET role = 'super_admin', display_name = COALESCE(display_name, 'Admin')
    WHERE user_id = target_user_id;
  END IF;
END;
$$;
