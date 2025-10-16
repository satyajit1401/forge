# API Fixes Summary

## Issues Found and Fixed

### 1. ✅ Missing Supabase RPC Functions
**Problem**: Analytics and feedback APIs were failing because the database was missing several RPC functions.

**Solution**: Created `supabase-missing-functions.sql` with all missing functions:
- `get_user_position_info(user_uuid)` - Returns waitlist position and access status
- `get_total_active_users()` - Counts users with access
- `update_max_allowed_users(max_users)` - Updates access limit (admin only)
- `get_analytics_summary()` - Returns total users, food logs, and coach calls
- `get_daily_metrics(days_back)` - Returns daily activity charts data
- `update_user_tier(user_uuid, new_tier)` - Changes user account tier (admin only)

### 2. ✅ Incorrect Feedback Table Name
**Problem**: Code was referencing `feedback` table, but Supabase has `user_feedback` table.

**Solution**: Updated `lib/database.ts` to use correct table name:
- Changed all `feedback` table references to `user_feedback`
- Fixed in 3 methods: `submit()`, `getHistory()`, `getTodayCount()`

### 3. ✅ Incorrect Return Type Handling
**Problem**: Database methods were expecting wrong return types from RPC functions.

**Solution**: Updated `lib/database.ts`:
- Fixed `getUserPosition()` to handle JSONB return type
- Fixed `getDailyMetrics()` to handle JSONB return type
- Added proper type casting with `as UserPositionInfo` and `as DailyMetrics`

## Files Modified

### New Files Created:
1. `supabase-missing-functions.sql` - Missing RPC function definitions
2. `DATABASE_SETUP.md` - Step-by-step setup guide
3. `API_FIXES.md` - This file

### Files Modified:
1. `lib/database.ts`:
   - Fixed `feedback` → `user_feedback` table name (lines 249, 268, 287)
   - Fixed `getUserPosition()` return type handling (line 233)
   - Fixed `getDailyMetrics()` return type handling (line 322)

### Files Copied from Old Tracker:
1. `waitlist-and-analytics-schema.sql` - Waitlist and analytics setup
2. `user-feedback-schema.sql` - Feedback table and functions
3. `comprehensive-analytics-fix.sql` - Permission fixes

## What You Need to Do

### Step 1: Run SQL in Supabase
Open your Supabase SQL Editor and run these files **in order**:

```
1. waitlist-and-analytics-schema.sql (if not already run)
2. user-feedback-schema.sql (if not already run)
3. supabase-missing-functions.sql ⭐ REQUIRED - NEW FILE
4. comprehensive-analytics-fix.sql (optional, for permissions)
```

See `DATABASE_SETUP.md` for detailed instructions.

### Step 2: Restart the App
After running the SQL:
1. Stop the Expo server (Cmd/Ctrl + C)
2. Run `npx expo start` again
3. Refresh browser (localhost:8081)

### Step 3: Test Features
Try these features to verify everything works:
- ✅ Analytics dashboard (admin only)
- ✅ Feedback submission
- ✅ Waitlist screen (if you don't have access)
- ✅ Admin controls in Settings

## Expected Behavior After Fixes

### Analytics Screen
- Should show summary stats (total users, food logs, coach calls)
- Should show charts for daily active users, food logs, and coach calls
- Should show user table with ability to change tiers

### Feedback Screen
- Should be able to submit feedback (3 per day limit)
- Should show feedback history

### Waitlist Screen
- Should show your position in line
- Should show "X of Y users have access"

### Settings Screen (Admin)
- Should show "Admin Controls" section
- Should be able to update max allowed users

## Technical Details

### Function Signatures

```sql
-- Returns JSONB object
CREATE FUNCTION get_user_position_info(user_uuid UUID) RETURNS JSONB;

-- Returns integer
CREATE FUNCTION get_total_active_users() RETURNS INTEGER;

-- Updates setting (admin only)
CREATE FUNCTION update_max_allowed_users(max_users INTEGER) RETURNS VOID;

-- Returns single row table
CREATE FUNCTION get_analytics_summary() RETURNS TABLE(
  total_users INTEGER,
  total_food_logs INTEGER,
  total_coach_calls INTEGER
);

-- Returns JSONB object with arrays
CREATE FUNCTION get_daily_metrics(days_back INTEGER) RETURNS JSONB;

-- Updates user tier (admin only)
CREATE FUNCTION update_user_tier(user_uuid UUID, new_tier account_type) RETURNS VOID;
```

### TypeScript Type Mappings

```typescript
interface UserPositionInfo {
  rank: number;
  totalUsers: number;
  maxAllowed: number;
  hasAccess: boolean;
}

interface AnalyticsSummary {
  totalUsers: number;
  totalFoodLogs: number;
  totalCoachCalls: number;
}

interface DailyMetrics {
  dailyActiveUsers: Array<{ date: string; user_count: number }>;
  dailyFoodLogs: Array<{ date: string; log_count: number }>;
  dailyCoachCalls: Array<{ date: string; call_count: number }>;
}
```

## Debugging Tips

If you still see errors:

1. **Check Browser Console** (F12):
   ```
   Look for red errors mentioning:
   - "function does not exist"
   - "table does not exist"
   - "permission denied"
   ```

2. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs
   - Look for failed RPC calls

3. **Verify SQL Ran Successfully**:
   ```sql
   -- Check if functions exist
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name LIKE '%user%';
   ```

4. **Check Your User Type**:
   ```sql
   -- Make sure you're an admin
   SELECT account_type FROM user_profiles
   WHERE user_id = auth.uid();
   ```

## Status

- ✅ Code fixes applied
- ⏳ SQL migration pending (user needs to run)
- ⏳ Testing pending (after SQL runs)

---

**Next Action**: Follow instructions in `DATABASE_SETUP.md` to run the SQL files.
