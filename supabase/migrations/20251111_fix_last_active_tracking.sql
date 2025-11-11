-- Fix DAU tracking and restore last_active to use created_at timestamps
-- DAU should count when users actually logged food, not the entry date

-- ============================================
-- STEP 1: Fix DAU function to use created_at
-- ============================================

-- DAU counts users who performed the action of logging food on that day
CREATE OR REPLACE FUNCTION get_daily_active_users(days_back INTEGER DEFAULT 30)
RETURNS TABLE(date DATE, user_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('day', fe.created_at)::DATE as date,
    COUNT(DISTINCT fe.user_id) as user_count
  FROM food_entries fe
  WHERE fe.created_at >= CURRENT_DATE - days_back
  GROUP BY date_trunc('day', fe.created_at)
  ORDER BY date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 2: Ensure trigger uses NOW() for real timestamps
-- ============================================

-- Trigger should use NOW() to capture actual timestamp when food was logged
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET last_active = NOW()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: Backfill last_active with actual created_at timestamps
-- ============================================

-- Update each user's last_active to their most recent food log timestamp
UPDATE user_profiles up
SET last_active = (
  SELECT fe.created_at
  FROM food_entries fe
  WHERE fe.user_id = up.user_id
  ORDER BY fe.created_at DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM food_entries fe WHERE fe.user_id = up.user_id
);

-- ============================================
-- COMPLETE!
-- ============================================

SELECT 'Fixed DAU tracking and restored last_active timestamps' as status;
