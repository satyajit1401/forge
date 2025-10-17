/**
 * Migration: Add Food Thread Tracking
 * Adds columns to user_profiles to track OpenAI thread IDs for weekly food logging memory
 */

-- Add columns for food tracking thread management
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS food_thread_id TEXT,
ADD COLUMN IF NOT EXISTS food_thread_week_start DATE;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.food_thread_id IS 'OpenAI thread ID for current week food tracking conversations';
COMMENT ON COLUMN user_profiles.food_thread_week_start IS 'Start date of the week for the current food thread (resets weekly on Monday)';

-- Index for faster lookups when checking thread validity
CREATE INDEX IF NOT EXISTS idx_user_profiles_food_thread
ON user_profiles(user_id, food_thread_week_start);
