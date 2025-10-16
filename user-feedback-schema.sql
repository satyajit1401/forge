-- User Feedback Schema
-- Run this SQL in your Supabase SQL Editor to add feedback functionality

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('feature_request', 'general_suggestion', 'bug_report', 'positive_feedback')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - users can only view their own feedback
CREATE POLICY "Users can view their own feedback" ON user_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" ON user_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to check daily feedback limit (max 3 per day)
CREATE OR REPLACE FUNCTION check_feedback_rate_limit(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  feedback_count INTEGER;
BEGIN
  -- Count feedback submissions from today
  SELECT COUNT(*)
  INTO feedback_count
  FROM user_feedback
  WHERE user_id = user_uuid
    AND created_at >= CURRENT_DATE;

  -- Return true if under limit, false if at or over limit
  RETURN feedback_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get feedback count for today
CREATE OR REPLACE FUNCTION get_feedback_count_today(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  feedback_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO feedback_count
  FROM user_feedback
  WHERE user_id = user_uuid
    AND created_at >= CURRENT_DATE;

  RETURN feedback_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
