/**
 * Add Admin Checks to Analytics Functions
 * SECURITY: Ensures only admins can access system-wide analytics
 *
 * All analytics functions are SECURITY DEFINER (bypass RLS), so we need
 * to verify admin status inside each function to prevent unauthorized access.
 */

-- ============================================
-- HELPER: Create reusable admin check function
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND account_type = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECURE: get_total_users with admin check
-- ============================================

CREATE OR REPLACE FUNCTION get_total_users()
RETURNS INTEGER AS $$
BEGIN
  -- Verify admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN (SELECT COUNT(*) FROM user_profiles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECURE: get_total_food_logs with admin check
-- ============================================

CREATE OR REPLACE FUNCTION get_total_food_logs()
RETURNS INTEGER AS $$
BEGIN
  -- Verify admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN (SELECT COUNT(*) FROM food_entries);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECURE: get_total_coach_calls with admin check
-- ============================================

CREATE OR REPLACE FUNCTION get_total_coach_calls()
RETURNS INTEGER AS $$
BEGIN
  -- Verify admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN (SELECT COUNT(*) FROM api_usage_log WHERE action_type = 'coach_conversation');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECURE: get_daily_active_users with admin check
-- ============================================

CREATE OR REPLACE FUNCTION get_daily_active_users(days_back INTEGER DEFAULT 30)
RETURNS TABLE(date DATE, user_count BIGINT) AS $$
BEGIN
  -- Verify admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

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

-- ============================================
-- SECURE: get_daily_food_logs with admin check
-- ============================================

CREATE OR REPLACE FUNCTION get_daily_food_logs(days_back INTEGER DEFAULT 30)
RETURNS TABLE(date DATE, log_count BIGINT) AS $$
BEGIN
  -- Verify admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

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

-- ============================================
-- SECURE: get_daily_coach_calls with admin check
-- ============================================

CREATE OR REPLACE FUNCTION get_daily_coach_calls(days_back INTEGER DEFAULT 30)
RETURNS TABLE(date DATE, call_count BIGINT) AS $$
BEGIN
  -- Verify admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

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

-- ============================================
-- SECURE: get_user_metrics with admin check
-- ============================================

CREATE OR REPLACE FUNCTION get_user_metrics()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  user_rank INTEGER,
  account_type TEXT,
  food_logs_count BIGINT,
  coach_calls_count BIGINT,
  total_activity BIGINT,
  last_active TIMESTAMPTZ
) AS $$
BEGIN
  -- Verify admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    up.user_id,
    au.email,
    up.user_number as user_rank,
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
-- GRANT PERMISSIONS
-- Authenticated users can call these functions, but
-- admin check inside will enforce access control
-- ============================================

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_food_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_coach_calls() TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_active_users(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_food_logs(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_coach_calls(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_metrics() TO authenticated;
