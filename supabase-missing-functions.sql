-- Missing Supabase Functions for New Tracker
-- Run this SQL in your Supabase SQL Editor to add missing RPC functions
-- These are required for analytics, waitlist, and admin features

-- ============================================
-- FUNCTION: get_user_position_info
-- Returns user's waitlist position and access status
-- ============================================

CREATE OR REPLACE FUNCTION get_user_position_info(user_uuid UUID)
RETURNS JSONB AS $$
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

  -- Return as JSON object
  RETURN jsonb_build_object(
    'rank', user_num,
    'totalUsers', total_count,
    'maxAllowed', max_users,
    'hasAccess', (user_num IS NOT NULL AND user_num <= max_users)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: get_total_active_users
-- Returns count of all user profiles (users with access)
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

  -- Return count of users who have access (user_number <= max_allowed)
  RETURN (
    SELECT COUNT(*)
    FROM user_profiles
    WHERE user_number IS NOT NULL
      AND user_number <= max_users
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: update_max_allowed_users
-- Updates the max allowed users setting (admin only)
-- Alternative to direct table update
-- ============================================

CREATE OR REPLACE FUNCTION update_max_allowed_users(max_users INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND account_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update max allowed users';
  END IF;

  -- Update the setting
  UPDATE system_settings
  SET max_allowed_users = max_users,
      updated_at = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: get_analytics_summary
-- Returns summary analytics (alternative to calling 3 separate functions)
-- ============================================

CREATE OR REPLACE FUNCTION get_analytics_summary()
RETURNS TABLE(
  total_users INTEGER,
  total_food_logs INTEGER,
  total_coach_calls INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM user_profiles),
    (SELECT COUNT(*)::INTEGER FROM food_entries),
    (SELECT COUNT(*)::INTEGER FROM api_usage_log WHERE action_type = 'coach_conversation');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: get_daily_metrics
-- Returns all daily metrics in one call (optimization)
-- Returns JSONB with arrays matching the TypeScript interface
-- ============================================

CREATE OR REPLACE FUNCTION get_daily_metrics(days_back INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
  dau_data JSONB;
  dfl_data JSONB;
  dcc_data JSONB;
BEGIN
  -- Get daily active users
  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', date::TEXT, 'user_count', user_count)), '[]'::jsonb)
  INTO dau_data
  FROM (
    SELECT
      date_trunc('day', last_active)::DATE as date,
      COUNT(DISTINCT user_id)::INTEGER as user_count
    FROM user_profiles
    WHERE last_active >= CURRENT_DATE - days_back
    GROUP BY date_trunc('day', last_active)
    ORDER BY date ASC
  ) dau;

  -- Get daily food logs
  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', date::TEXT, 'log_count', log_count)), '[]'::jsonb)
  INTO dfl_data
  FROM (
    SELECT
      entry_date::DATE as date,
      COUNT(*)::INTEGER as log_count
    FROM food_entries
    WHERE entry_date >= CURRENT_DATE - days_back
    GROUP BY entry_date
    ORDER BY entry_date ASC
  ) dfl;

  -- Get daily coach calls
  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', date::TEXT, 'call_count', call_count)), '[]'::jsonb)
  INTO dcc_data
  FROM (
    SELECT
      date_trunc('day', timestamp)::DATE as date,
      COUNT(*)::INTEGER as call_count
    FROM api_usage_log
    WHERE action_type = 'coach_conversation'
      AND timestamp >= CURRENT_DATE - days_back
    GROUP BY date_trunc('day', timestamp)
    ORDER BY date ASC
  ) dcc;

  -- Return as single JSON object
  RETURN jsonb_build_object(
    'dailyActiveUsers', dau_data,
    'dailyFoodLogs', dfl_data,
    'dailyCoachCalls', dcc_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: update_user_tier
-- Alternative name for admin_update_user_tier (consistency)
-- ============================================

CREATE OR REPLACE FUNCTION update_user_tier(
  user_uuid UUID,
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
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Grant execute permissions
-- ============================================

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================
-- Test the functions
-- ============================================

SELECT 'Testing get_analytics_summary...' as test;
SELECT * FROM get_analytics_summary();

SELECT 'Testing get_total_active_users...' as test;
SELECT get_total_active_users() as result;

SELECT '✅ All missing functions created successfully!' as status;
