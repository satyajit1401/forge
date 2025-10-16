-- Add Missing get_user_position_info Function
-- This is the ONLY function missing from your database
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_user_position_info(user_uuid UUID)
RETURNS TABLE(
  rank INTEGER,
  total_users INTEGER,
  max_allowed INTEGER,
  has_access BOOLEAN
) AS $$
DECLARE
  user_num INTEGER;
  max_users INTEGER;
  total_count INTEGER;
BEGIN
  -- Get user's number
  SELECT user_number INTO user_num
  FROM user_profiles
  WHERE user_id = user_uuid;

  -- Get max allowed users
  SELECT max_allowed_users INTO max_users
  FROM system_settings
  WHERE id = 1;

  -- Get total user count
  SELECT COUNT(*) INTO total_count
  FROM user_profiles;

  -- Return as table row
  RETURN QUERY
  SELECT
    user_num as rank,
    total_count::INTEGER as total_users,
    max_users::INTEGER as max_allowed,
    (user_num IS NOT NULL AND user_num <= max_users) as has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_user_position_info(UUID) TO authenticated;

-- ============================================
-- FUNCTION: get_total_active_users
-- Get count of users who have access (user_number <= max_allowed)
-- ============================================

CREATE OR REPLACE FUNCTION get_total_active_users()
RETURNS INTEGER AS $$
DECLARE
  max_users INTEGER;
BEGIN
  -- Get max allowed users from settings
  SELECT max_allowed_users INTO max_users
  FROM system_settings
  WHERE id = 1;

  -- Return count of users who have access
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM user_profiles
    WHERE user_number IS NOT NULL
      AND user_number <= max_users
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_total_active_users() TO authenticated;

-- Test it
SELECT '✅ Functions created successfully!' as status;
SELECT 'Testing get_total_active_users:' as test, get_total_active_users() as result;
