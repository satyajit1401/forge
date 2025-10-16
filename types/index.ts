// Type Definitions for Food Tracker

export interface FoodEntry {
  id: string;
  entry_date: string;
  name: string;
  calories: number;
  protein: number;
  image_data?: string;
  description?: string;
  created_at: string;
  user_id: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  target_calories: number;
  maintenance_calories: number;
  target_protein: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface RateLimitStatus {
  calls_used: number;
  calls_limit: number;
  coach_calls_used: number;
  coach_calls_limit: number;
  resets_at: string;
  account_type: 'basic' | 'pro' | 'admin';
}

export interface CoachContext {
  recentLogs: { [date: string]: FoodEntry[] };
  targetCalories: number;
  targetProtein: number;
  maintenanceCalories: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WeeklyStats {
  dailyData: DayData[];
  averages: {
    calories: number;
    protein: number;
  };
  deficit: {
    daily: number;
    weekly: number;
  };
  daysLogged: number;
}

export interface DayData {
  date: string;
  calories: number;
  protein: number;
  entries: FoodEntry[];
}

export interface FrequentItem extends Omit<FoodEntry, 'id' | 'entry_date' | 'created_at' | 'user_id'> {
  count: number;
}

export type AccountType = 'basic' | 'pro' | 'admin';

export interface UserPositionInfo {
  rank: number;
  totalUsers: number;
  maxAllowed: number;
  hasAccess: boolean;
}

export interface AnalyticsSummary {
  totalUsers: number;
  totalFoodLogs: number;
  totalCoachCalls: number;
}

export interface DailyMetrics {
  dailyActiveUsers: Array<{ date: string; user_count: number }>;
  dailyFoodLogs: Array<{ date: string; log_count: number }>;
  dailyCoachCalls: Array<{ date: string; call_count: number }>;
}

export interface UserMetric {
  user_id: string;
  email: string;
  user_rank: number;
  account_type: AccountType;
  food_logs_count: number;
  coach_calls_count: number;
  last_active: string | null;
}
