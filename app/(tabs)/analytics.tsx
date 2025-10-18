/**
 * Analytics Screen - Admin Dashboard
 * Shows system-wide metrics and user management
 * ABSTRACTION: Uses db.analytics APIs, never calls Supabase directly
 */

import React, { useState, useEffect } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { db } from '@/lib/database';
import { getCached, setCached, CACHE_KEYS } from '@/lib/enhanced-cache';
import type { AnalyticsSummary, DailyMetrics, UserMetric } from '@/types';

// Cache TTL: 5 minutes (analytics don't need to be real-time)
const ANALYTICS_CACHE_TTL = 5 * 60 * 1000;

export default function AnalyticsScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.min(windowWidth - 96, 800);

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTier, setUpdatingTier] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async (forceRefresh = false) => {
    try {
      // PHASE 1: Load from cache - INSTANT (skip if force refresh)
      if (!forceRefresh) {
        const cachedData = getCached<{
          summary: AnalyticsSummary;
          metrics: DailyMetrics;
          users: UserMetric[];
        }>(CACHE_KEYS.analytics);

        if (cachedData) {
          // Show cached data immediately (no loading spinner!)
          setSummary(cachedData.summary);
          setDailyMetrics(cachedData.metrics);
          setUserMetrics(cachedData.users);
          setLoading(false);
        } else {
          // No cache - show loading spinner
          setLoading(true);
        }
      } else {
        setLoading(true);
      }

      // PHASE 2: Fetch fresh data (revalidate in background)
      const [summaryData, metricsData, usersData] = await Promise.all([
        db.analytics.getSummary(),
        db.analytics.getDailyMetrics(30),
        db.analytics.getUserMetrics(),
      ]);

      // Update cache with 5-minute TTL
      setCached(
        CACHE_KEYS.analytics,
        {
          summary: summaryData,
          metrics: metricsData,
          users: usersData,
        },
        ANALYTICS_CACHE_TTL
      );

      // Update UI silently (data already showing if cached)
      setSummary(summaryData);
      setDailyMetrics(metricsData);
      setUserMetrics(usersData);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTierChange = async (userId: string, newTier: 'basic' | 'pro' | 'admin') => {
    setUpdatingTier(userId);
    try {
      await db.analytics.updateUserTier(userId, newTier);

      // Reload analytics and update cache
      await loadAnalytics(true); // Force refresh to clear cache
    } catch (err) {
      console.error('Error updating tier:', err);
    } finally {
      setUpdatingTier(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'pro':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading || !summary || !dailyMetrics) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 p-12">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-gray-900" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-900 font-medium">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 p-3 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Admin Analytics</h1>
            <p className="text-xs text-gray-500 mt-1">System-wide metrics and user management</p>
          </div>
          <button
            onClick={() => loadAnalytics(true)}
            className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition-all"
          >
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Total Users */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">👥</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalUsers}</p>
              </div>
            </div>
          </div>

          {/* Total Food Logs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Food Logs</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalFoodLogs}</p>
              </div>
            </div>
          </div>

          {/* Total Coach Calls */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">💬</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Coach Calls</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalCoachCalls}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="space-y-4">
          {/* Daily Active Users */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Daily Active Users (Last 30 Days)</h3>
            <View style={{ alignItems: 'center' }}>
              <LineChart
                data={dailyMetrics.dailyActiveUsers.map(item => ({
                  value: item.user_count,
                  label: formatDate(item.date)
                }))}
                width={chartWidth}
                height={200}
                color="#3b82f6"
                thickness={2}
                startFillColor="rgba(59, 130, 246, 0.3)"
                endFillColor="rgba(59, 130, 246, 0.01)"
                startOpacity={0.9}
                endOpacity={0.2}
                spacing={30}
                noOfSections={5}
                yAxisColor="#E5E7EB"
                xAxisColor="#E5E7EB"
                yAxisTextStyle={{ color: '#6B7280', fontSize: 12 }}
                xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 10, width: 70, textAlign: 'center' }}
                hideRules
                isAnimated
                animationDuration={300}
              />
            </View>
          </div>

          {/* Daily Food Logs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Daily Food Logs (Last 30 Days)</h3>
            <View style={{ alignItems: 'center' }}>
              <LineChart
                data={dailyMetrics.dailyFoodLogs.map(item => ({
                  value: item.log_count,
                  label: formatDate(item.date)
                }))}
                width={chartWidth}
                height={200}
                color="#10b981"
                thickness={2}
                startFillColor="rgba(16, 185, 129, 0.3)"
                endFillColor="rgba(16, 185, 129, 0.01)"
                startOpacity={0.9}
                endOpacity={0.2}
                spacing={30}
                noOfSections={5}
                yAxisColor="#E5E7EB"
                xAxisColor="#E5E7EB"
                yAxisTextStyle={{ color: '#6B7280', fontSize: 12 }}
                xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 10, width: 70, textAlign: 'center' }}
                hideRules
                isAnimated
                animationDuration={300}
              />
            </View>
          </div>

          {/* Daily Coach Calls */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Daily Coach Calls (Last 30 Days)</h3>
            <View style={{ alignItems: 'center' }}>
              <LineChart
                data={dailyMetrics.dailyCoachCalls.map(item => ({
                  value: item.call_count,
                  label: formatDate(item.date)
                }))}
                width={chartWidth}
                height={200}
                color="#8b5cf6"
                thickness={2}
                startFillColor="rgba(139, 92, 246, 0.3)"
                endFillColor="rgba(139, 92, 246, 0.01)"
                startOpacity={0.9}
                endOpacity={0.2}
                spacing={30}
                noOfSections={5}
                yAxisColor="#E5E7EB"
                xAxisColor="#E5E7EB"
                yAxisTextStyle={{ color: '#6B7280', fontSize: 12 }}
                xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 10, width: 70, textAlign: 'center' }}
                hideRules
                isAnimated
                animationDuration={300}
              />
            </View>
          </div>
        </div>

        {/* User Metrics Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-900">User Activity</h2>
            <p className="text-xs text-gray-500 mt-0.5">Sorted by total activity</p>
          </div>

          {userMetrics.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-gray-500">No users yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tier</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Food Logs</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Coach Calls</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {userMetrics.map((user) => (
                    <tr key={user.user_id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">#{user.user_rank}</td>
                      <td className="px-6 py-4">
                        <select
                          value={user.account_type}
                          onChange={(e) => handleTierChange(user.user_id, e.target.value as 'basic' | 'pro' | 'admin')}
                          disabled={updatingTier === user.user_id}
                          className={`px-2.5 py-1.5 border rounded-lg text-xs font-semibold uppercase cursor-pointer hover:opacity-80 transition-all ${getTierColor(user.account_type)} ${updatingTier === user.user_id ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          <option value="basic">Basic</option>
                          <option value="pro">Pro</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{user.food_logs_count}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{user.coach_calls_count}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(user.last_active)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
