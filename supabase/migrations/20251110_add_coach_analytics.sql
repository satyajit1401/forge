/**
 * Coach Analytics Migration
 * Creates function to get detailed nutrition tracking data for all users
 * SECURITY: Admin-only access
 */

-- ============================================
-- FUNCTION: get_coach_analytics
-- Returns comprehensive nutrition data for all users
-- ============================================

CREATE OR REPLACE FUNCTION get_coach_analytics()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  target_calories INTEGER,
  target_protein INTEGER,
  maintenance_calories INTEGER,
  -- Daily totals for last 7 days (D1 = Monday of current week)
  d1_calories INTEGER,
  d1_protein NUMERIC,
  d2_calories INTEGER,
  d2_protein NUMERIC,
  d3_calories INTEGER,
  d3_protein NUMERIC,
  d4_calories INTEGER,
  d4_protein NUMERIC,
  d5_calories INTEGER,
  d5_protein NUMERIC,
  d6_calories INTEGER,
  d6_protein NUMERIC,
  d7_calories INTEGER,
  d7_protein NUMERIC,
  -- Calculated averages and deficits
  avg_calories INTEGER,
  avg_protein INTEGER,
  daily_deficit INTEGER,
  weekly_deficit INTEGER,
  days_logged INTEGER
) AS $$
DECLARE
  week_start DATE;
  today DATE;
BEGIN
  -- Verify admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Calculate current week start (Monday)
  today := CURRENT_DATE;
  week_start := DATE_TRUNC('week', today) + INTERVAL '1 day';  -- Monday

  RETURN QUERY
  WITH user_settings AS (
    SELECT
      up.user_id,
      au.email,
      COALESCE(us.target_calories, 2000) as target_calories,
      COALESCE(us.target_protein, 150) as target_protein,
      COALESCE(us.maintenance_calories, 2000) as maintenance_calories
    FROM user_profiles up
    LEFT JOIN auth.users au ON up.user_id = au.id
    LEFT JOIN user_settings us ON up.user_id = us.user_id
  ),
  daily_totals AS (
    SELECT
      fe.user_id,
      fe.entry_date,
      SUM(fe.calories) as total_calories,
      SUM(fe.protein) as total_protein
    FROM food_entries fe
    WHERE fe.entry_date >= week_start
      AND fe.entry_date < week_start + INTERVAL '7 days'
    GROUP BY fe.user_id, fe.entry_date
  )
  SELECT
    us.user_id,
    us.email,
    us.target_calories,
    us.target_protein,
    us.maintenance_calories,
    -- Day 1 (Monday)
    COALESCE((SELECT total_calories FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start), 0)::INTEGER as d1_calories,
    COALESCE((SELECT total_protein FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start), 0) as d1_protein,
    -- Day 2 (Tuesday)
    COALESCE((SELECT total_calories FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start + INTERVAL '1 day'), 0)::INTEGER as d2_calories,
    COALESCE((SELECT total_protein FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start + INTERVAL '1 day'), 0) as d2_protein,
    -- Day 3 (Wednesday)
    COALESCE((SELECT total_calories FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start + INTERVAL '2 days'), 0)::INTEGER as d3_calories,
    COALESCE((SELECT total_protein FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start + INTERVAL '2 days'), 0) as d3_protein,
    -- Day 4 (Thursday)
    COALESCE((SELECT total_calories FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start + INTERVAL '3 days'), 0)::INTEGER as d4_calories,
    COALESCE((SELECT total_protein FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start + INTERVAL '3 days'), 0) as d4_protein,
    -- Day 5 (Friday)
    COALESCE((SELECT total_calories FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start + INTERVAL '4 days'), 0)::INTEGER as d5_calories,
    COALESCE((SELECT total_protein FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start + INTERVAL '4 days'), 0) as d5_protein,
    -- Day 6 (Saturday)
    COALESCE((SELECT total_calories FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start + INTERVAL '5 days'), 0)::INTEGER as d6_calories,
    COALESCE((SELECT total_protein FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start + INTERVAL '5 days'), 0) as d6_protein,
    -- Day 7 (Sunday)
    COALESCE((SELECT total_calories FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start + INTERVAL '6 days'), 0)::INTEGER as d7_calories,
    COALESCE((SELECT total_protein FROM daily_totals dt
              WHERE dt.user_id = us.user_id
              AND dt.entry_date = week_start + INTERVAL '6 days'), 0) as d7_protein,
    -- Calculate averages (excluding today and days with no food)
    (SELECT COALESCE(ROUND(AVG(total_calories)), 0)::INTEGER
     FROM daily_totals dt
     WHERE dt.user_id = us.user_id
       AND dt.entry_date < today
       AND dt.total_calories > 0) as avg_calories,
    (SELECT COALESCE(ROUND(AVG(total_protein)), 0)::INTEGER
     FROM daily_totals dt
     WHERE dt.user_id = us.user_id
       AND dt.entry_date < today
       AND dt.total_calories > 0) as avg_protein,
    -- Daily deficit/surplus (avg_calories - maintenance)
    (SELECT COALESCE(ROUND(AVG(total_calories)), 0)::INTEGER - us.maintenance_calories
     FROM daily_totals dt
     WHERE dt.user_id = us.user_id
       AND dt.entry_date < today
       AND dt.total_calories > 0) as daily_deficit,
    -- Weekly deficit/surplus (daily_deficit * days_counted)
    ((SELECT COALESCE(ROUND(AVG(total_calories)), 0)::INTEGER - us.maintenance_calories
      FROM daily_totals dt
      WHERE dt.user_id = us.user_id
        AND dt.entry_date < today
        AND dt.total_calories > 0) *
     (SELECT COUNT(*)
      FROM daily_totals dt
      WHERE dt.user_id = us.user_id
        AND dt.entry_date < today
        AND dt.total_calories > 0)::INTEGER) as weekly_deficit,
    -- Days logged (with food)
    (SELECT COUNT(*)::INTEGER
     FROM daily_totals dt
     WHERE dt.user_id = us.user_id
       AND dt.total_calories > 0) as days_logged
  FROM user_settings us
  ORDER BY us.email ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_coach_analytics() TO authenticated;

-- ============================================
-- SUCCESS
-- ============================================

SELECT '✅ Coach analytics function created successfully!' as status;
