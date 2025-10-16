/**
 * Enable Row Level Security (RLS) Policies
 * SECURITY: Ensures users can only access their own data
 * IMPORTANT: RLS must be enabled on all tables before policies take effect
 */

-- ============================================
-- ENABLE RLS ON ALL USER TABLES
-- ============================================
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FOOD ENTRIES POLICIES
-- Users can only CRUD their own food entries
-- ============================================

-- SELECT: Users can only read their own entries
CREATE POLICY "Users can view their own food entries"
ON food_entries
FOR SELECT
USING (user_id = auth.uid());

-- INSERT: Users can only insert entries for themselves
CREATE POLICY "Users can create their own food entries"
ON food_entries
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own entries
CREATE POLICY "Users can update their own food entries"
ON food_entries
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own entries
CREATE POLICY "Users can delete their own food entries"
ON food_entries
FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- USER SETTINGS POLICIES
-- Users can only CRUD their own settings
-- ============================================

-- SELECT: Users can only read their own settings
CREATE POLICY "Users can view their own settings"
ON user_settings
FOR SELECT
USING (user_id = auth.uid());

-- INSERT: Users can only insert their own settings
CREATE POLICY "Users can create their own settings"
ON user_settings
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own settings
CREATE POLICY "Users can update their own settings"
ON user_settings
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own settings
CREATE POLICY "Users can delete their own settings"
ON user_settings
FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- USER PROFILES POLICIES
-- Users can read their own profile
-- Admins can read all profiles
-- ============================================

-- SELECT: Users can view their own profile, admins can view all
CREATE POLICY "Users can view their own profile"
ON user_profiles
FOR SELECT
USING (
  user_id = auth.uid()
  OR
  (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND account_type = 'admin'
    )
  )
);

-- INSERT: Users can only insert their own profile
CREATE POLICY "Users can create their own profile"
ON user_profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update their own profile"
ON user_profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own profile
CREATE POLICY "Users can delete their own profile"
ON user_profiles
FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- API USAGE LOG POLICIES
-- Users can only read their own usage logs
-- Admins can read all logs (for analytics)
-- ============================================

-- SELECT: Users can view their own logs, admins can view all
CREATE POLICY "Users can view their own API usage logs"
ON api_usage_log
FOR SELECT
USING (
  user_id = auth.uid()
  OR
  (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND account_type = 'admin'
    )
  )
);

-- INSERT: Only the application can insert logs (via service role)
-- No user-level INSERT policy - logs are created server-side only

-- UPDATE: No UPDATE allowed - logs are immutable
-- No UPDATE policy defined

-- DELETE: No DELETE allowed - logs are immutable
-- No DELETE policy defined

-- ============================================
-- GRANT PERMISSIONS
-- Ensure authenticated users have table access
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON food_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO authenticated;
GRANT SELECT ON api_usage_log TO authenticated;
