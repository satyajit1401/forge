# Database Setup Guide

This guide explains how to set up your Supabase database to fix the analytics and feedback API errors.

## Problem

The app is failing because certain Supabase RPC (Remote Procedure Call) functions don't exist in your database yet. These functions are required for:
- Analytics dashboard
- Waitlist system
- Admin controls
- User feedback
- Rate limiting

## Solution

Run the following SQL files in your Supabase SQL Editor **in this exact order**:

### Required SQL Files (Run in Order)

Navigate to your Supabase project → SQL Editor, then run these files:

#### 1. Base Schema (if not already run)
From your old tracker, you may have already run:
- `supabase-schema.sql` - Base tables (food_entries, user_settings)
- `supabase-auth-migration.sql` - Auth setup
- `supabase-tier-and-rate-limit.sql` - Rate limiting system

#### 2. Additional Features (run these if not already done)
- `coach-rate-limits.sql` - Coach conversation limits
- `user-feedback-schema.sql` - **REQUIRED** - User feedback table and functions
- `waitlist-and-analytics-schema.sql` - **REQUIRED** - Waitlist system and analytics

#### 3. Missing Functions (NEW - MUST RUN)
- `supabase-missing-functions.sql` - **NEW FILE** - Missing RPC functions

This file adds:
- `get_user_position_info()` - For waitlist screen
- `get_total_active_users()` - For admin controls
- `update_max_allowed_users()` - For admin settings
- `get_analytics_summary()` - For analytics dashboard
- `get_daily_metrics()` - For analytics charts
- `update_user_tier()` - For changing user tiers

#### 4. Fixes (run if you encounter issues)
- `comprehensive-analytics-fix.sql` - Fixes analytics permissions
- `fix-signup-errors.sql` - Fixes user signup issues

## Step-by-Step Instructions

### Option 1: Quick Setup (if starting fresh)

1. Open Supabase SQL Editor
2. Run these files in order:
   ```
   1. waitlist-and-analytics-schema.sql
   2. user-feedback-schema.sql
   3. supabase-missing-functions.sql
   4. comprehensive-analytics-fix.sql
   ```

### Option 2: Add Missing Functions Only (if you have existing data)

If you already have the base tables and just need the missing functions:

1. Open Supabase SQL Editor
2. Run: `supabase-missing-functions.sql`
3. Run: `comprehensive-analytics-fix.sql` (optional, for permission fixes)

## How to Run SQL Files

1. Go to your Supabase project: https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of the SQL file
6. Paste into the editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. Check for success message or errors

## Verification

After running the SQL files, verify they work:

```sql
-- Test analytics summary
SELECT * FROM get_analytics_summary();

-- Test user position (replace with your user UUID)
SELECT get_user_position_info('your-user-uuid-here');

-- Test daily metrics
SELECT get_daily_metrics(7);

-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_feedback', 'system_settings', 'user_profiles');
```

## Common Issues

### Issue 1: "function does not exist"
**Solution**: Run `supabase-missing-functions.sql`

### Issue 2: "table user_feedback does not exist"
**Solution**: Run `user-feedback-schema.sql`

### Issue 3: "table system_settings does not exist"
**Solution**: Run `waitlist-and-analytics-schema.sql`

### Issue 4: "permission denied"
**Solution**: Run `comprehensive-analytics-fix.sql` to fix permissions

### Issue 5: "Could not find the public.get_user_metrics function"
**Solution**: Run `waitlist-and-analytics-schema.sql` and `comprehensive-analytics-fix.sql`

## After Setup

Once all SQL is run successfully:

1. Restart your Expo app (Cmd/Ctrl + C, then `npx expo start`)
2. Refresh the browser (localhost:8081)
3. Analytics and feedback APIs should now work!

## Files Overview

- ✅ `supabase-missing-functions.sql` - **NEW FILE** created for new tracker
- ✅ `waitlist-and-analytics-schema.sql` - From old tracker (already exists)
- ✅ `user-feedback-schema.sql` - From old tracker (already exists)
- ✅ `comprehensive-analytics-fix.sql` - From old tracker (already exists)

## Need Help?

If you still see errors after running all SQL:
1. Check the browser console (F12) for specific error messages
2. Check Supabase logs (Logs section in Supabase dashboard)
3. Verify you're logged in with an admin account (account_type = 'admin')

---

**Status**: Ready to run! Start with `supabase-missing-functions.sql`
