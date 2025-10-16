/**
 * Settings Screen - User Settings Configuration
 * ABSTRACTION: Uses db.settings and db.rateLimit APIs, never calls Supabase directly
 */

import React, { useState, useEffect } from 'react';
import { Link, useRouter } from 'expo-router';
import { db } from '@/lib/database';
import type { UserSettings, RateLimitStatus } from '@/types';

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [maxAllowedUsers, setMaxAllowedUsers] = useState(100);
  const [totalActiveUsers, setTotalActiveUsers] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedSettings, limitStatus] = await Promise.all([
          db.settings.get(),
          db.rateLimit.getStatus(),
        ]);

        setSettings(loadedSettings);
        setRateLimitStatus(limitStatus);

        // Check if user is admin and load admin-specific data
        if (limitStatus.account_type === 'admin') {
          setIsAdmin(true);
          const [maxUsers, totalUsers] = await Promise.all([
            db.admin.getMaxAllowedUsers(),
            db.admin.getTotalActiveUsers(),
          ]);
          setMaxAllowedUsers(maxUsers);
          setTotalActiveUsers(totalUsers);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    try {
      // Save user settings
      await db.settings.update({
        target_calories: settings.target_calories,
        maintenance_calories: settings.maintenance_calories,
        target_protein: settings.target_protein,
      });

      // Save admin settings if user is admin
      if (isAdmin) {
        await db.admin.updateMaxAllowedUsers(maxAllowedUsers);
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Helper function to calculate time until reset
  const getTimeUntilReset = () => {
    if (!rateLimitStatus?.resets_at) return '';

    const now = new Date();
    const resetTime = new Date(rateLimitStatus.resets_at);
    const diffMs = resetTime.getTime() - now.getTime();

    if (diffMs <= 0) return 'Resetting now...';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading || !settings || !rateLimitStatus) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 lg:px-8 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Rate Limit Status */}
          {rateLimitStatus && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Account Tier</span>
                <span
                  className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    rateLimitStatus.account_type === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : rateLimitStatus.account_type === 'pro'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-200 text-gray-700'
                  } uppercase`}
                >
                  {rateLimitStatus.account_type}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">API Calls Today</span>
                  <span className="text-sm font-bold text-gray-900">
                    {rateLimitStatus.calls_used} / {rateLimitStatus.calls_limit}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-black h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        (rateLimitStatus.calls_used / rateLimitStatus.calls_limit) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">
                    {rateLimitStatus.calls_limit - rateLimitStatus.calls_used} calls remaining
                  </span>
                  <span className="text-gray-500">Resets in {getTimeUntilReset()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Settings Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Target Calories</label>
              <div className="relative">
                <input
                  type="number"
                  value={settings.target_calories}
                  onChange={(e) =>
                    setSettings({ ...settings, target_calories: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 font-medium text-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  cal/day
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Your daily calorie intake goal</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Maintenance Calories
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={settings.maintenance_calories}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenance_calories: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 font-medium text-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  cal/day
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Calories to maintain your current weight</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Target Protein</label>
              <div className="relative">
                <input
                  type="number"
                  value={settings.target_protein}
                  onChange={(e) =>
                    setSettings({ ...settings, target_protein: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 font-medium text-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  g/day
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Your daily protein goal in grams</p>
            </div>

            {/* Admin Settings - User Access Control */}
            {isAdmin && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <div className="mb-3">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                    Admin Controls
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    User Access Limit
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={maxAllowedUsers}
                      onChange={(e) => setMaxAllowedUsers(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 font-medium text-sm"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      users
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    <span className="font-semibold">{totalActiveUsers}</span> of{' '}
                    <span className="font-semibold">{maxAllowedUsers}</span> users have access
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-black hover:bg-gray-800 text-white py-2.5 px-4 rounded-lg transition-all font-medium text-sm"
            >
              {saved ? '✓ Saved!' : 'Save'}
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2.5 px-4 rounded-lg transition-all font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
