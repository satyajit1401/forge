-- Waitlist and Analytics System
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- STEP 1: Modify user_profiles table
-- ============================================

-- Add new columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS user_number INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();

-- Create sequence for user_number
CREATE SEQUENCE IF NOT EXISTS user_number_seq START WITH 1;

-- ============================================
-- STEP 2: Create system_settings table for global config
-- ============================================

CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  max_allowed_users INTEGER NOT NULL DEFAULT 100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1) -- Ensure only one row exists
);

-- Insert default settings
INSERT INTO system_settings (id, max_allowed_users)
VALUES (1, 100)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read system settings" ON system_settings
  FOR SELECT USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update system settings" ON system_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND account_type = 'admin'
    )
  );

-- ============================================
-- STEP 3: Function to get next user number
-- ============================================

CREATE OR REPLACE FUNCTION get_next_user_number()
RETURNS INTEGER AS $$
BEGIN
  RETURN nextval('user_number_seq');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: Function to auto-assign user number on signup
-- ============================================

CREATE OR REPLACE FUNCTION assign_user_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_number IS NULL THEN
    NEW.user_number := get_next_user_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS auto_assign_user_number ON user_profiles;
CREATE TRIGGER auto_assign_user_number
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_number();

-- ============================================
-- STEP 5: Assign user numbers to existing users
-- ============================================

-- Assign numbers to existing users (ordered by created_at)
DO $$
DECLARE
  user_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR user_record IN
    SELECT id FROM user_profiles
    WHERE user_number IS NULL
    ORDER BY created_at ASC
  LOOP
    UPDATE user_profiles
    SET user_number = counter
    WHERE id = user_record.id;
    counter := counter + 1;
  END LOOP;

  -- Set sequence to continue from last assigned number
  PERFORM setval('user_number_seq', counter, false);
END $$;

-- ============================================
-- STEP 6: Function to check user access
-- ============================================

CREATE OR REPLACE FUNCTION check_user_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_num INTEGER;
  max_users INTEGER;
BEGIN
  -- Get user's number
  SELECT user_number INTO user_num
  FROM user_profiles
  WHERE user_id = user_uuid;

  -- Get max allowed users
  SELECT max_allowed_users INTO max_users
  FROM system_settings
  WHERE id = 1;

  -- Return true if user_number <= max_allowed_users
  RETURN (user_num IS NOT NULL AND user_num <= max_users);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 7: Analytics functions
-- ============================================

-- Get total users count
CREATE OR REPLACE FUNCTION get_total_users()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM user_profiles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get total food logs count
CREATE OR REPLACE FUNCTION get_total_food_logs()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM food_entries);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get total coach calls count
CREATE OR REPLACE FUNCTION get_total_coach_calls()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM api_usage_log WHERE action_type = 'coach_conversation');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get daily active users for last N days
CREATE OR REPLACE FUNCTION get_daily_active_users(days_back INTEGER DEFAULT 30)
RETURNS TABLE(date DATE, user_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('day', last_active)::DATE as date,
    COUNT(DISTINCT user_id) as user_count
  FROM user_profiles
  WHERE last_active >= CURRENT_DATE - days_back
  GROUP BY date_trunc('day', last_active)
  ORDER BY date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get daily food logs for last N days
CREATE OR REPLACE FUNCTION get_daily_food_logs(days_back INTEGER DEFAULT 30)
RETURNS TABLE(date DATE, log_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    entry_date::DATE as date,
    COUNT(*) as log_count
  FROM food_entries
  WHERE entry_date >= CURRENT_DATE - days_back
  GROUP BY entry_date
  ORDER BY entry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get daily coach calls for last N days
CREATE OR REPLACE FUNCTION get_daily_coach_calls(days_back INTEGER DEFAULT 30)
RETURNS TABLE(date DATE, call_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('day', timestamp)::DATE as date,
    COUNT(*) as call_count
  FROM api_usage_log
  WHERE action_type = 'coach_conversation'
    AND timestamp >= CURRENT_DATE - days_back
  GROUP BY date_trunc('day', timestamp)
  ORDER BY date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user metrics table
CREATE OR REPLACE FUNCTION get_user_metrics()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  user_number INTEGER,
  account_type TEXT,
  food_logs_count BIGINT,
  coach_calls_count BIGINT,
  total_activity BIGINT,
  last_active TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.user_id,
    au.email,
    up.user_number,
    up.account_type::TEXT,
    COALESCE(fe.food_count, 0) as food_logs_count,
    COALESCE(cc.coach_count, 0) as coach_calls_count,
    COALESCE(fe.food_count, 0) + COALESCE(cc.coach_count, 0) as total_activity,
    up.last_active
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.user_id = au.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as food_count
    FROM food_entries
    GROUP BY user_id
  ) fe ON up.user_id = fe.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as coach_count
    FROM api_usage_log
    WHERE action_type = 'coach_conversation'
    GROUP BY user_id
  ) cc ON up.user_id = cc.user_id
  ORDER BY total_activity DESC, up.user_number ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 8: Function to update user tier (admin only)
-- ============================================

CREATE OR REPLACE FUNCTION admin_update_user_tier(
  target_user_id UUID,
  new_tier account_type
)
RETURNS VOID AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND account_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update user tiers';
  END IF;

  -- Update the user's tier
  UPDATE user_profiles
  SET account_type = new_tier
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 9: Function to update last_active
-- ============================================

CREATE OR REPLACE FUNCTION update_last_active(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET last_active = NOW()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 10: Trigger to update last_active on food log
-- ============================================

CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET last_active = NOW()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on food entries
DROP TRIGGER IF EXISTS update_last_active_on_food_entry ON food_entries;
CREATE TRIGGER update_last_active_on_food_entry
  AFTER INSERT ON food_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_active();

-- Trigger on api usage (for coach calls)
DROP TRIGGER IF EXISTS update_last_active_on_api_usage ON api_usage_log;
CREATE TRIGGER update_last_active_on_api_usage
  AFTER INSERT ON api_usage_log
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_active();

-- ============================================
-- STEP 11: Function to get max allowed users
-- ============================================

CREATE OR REPLACE FUNCTION get_max_allowed_users()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT max_allowed_users FROM system_settings WHERE id = 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMPLETE!
-- ============================================

SELECT 'Waitlist and analytics system installed successfully!' as status;
