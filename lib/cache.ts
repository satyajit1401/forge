/**
 * Cache Layer for Native - MMKV implementation
 * ABSTRACTION: All local storage operations go through here
 */

import { MMKV } from 'react-native-mmkv';

// Initialize MMKV storage
const storage = new MMKV();

export const cache = {
  /**
   * Get a value from cache
   */
  get: <T>(key: string): T | null => {
    try {
      const value = storage.getString(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key "${key}":`, error);
      return null;
    }
  },

  /**
   * Set a value in cache
   */
  set: <T>(key: string, value: T): void => {
    try {
      storage.set(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache set error for key "${key}":`, error);
    }
  },

  /**
   * Delete a value from cache
   */
  delete: (key: string): void => {
    try {
      storage.delete(key);
    } catch (error) {
      console.error(`Cache delete error for key "${key}":`, error);
    }
  },

  /**
   * Clear all cache
   */
  clear: (): void => {
    try {
      storage.clearAll();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  },

  /**
   * Check if key exists
   */
  has: (key: string): boolean => {
    return storage.contains(key);
  },

  /**
   * Get all keys
   */
  getAllKeys: (): string[] => {
    return storage.getAllKeys();
  },
};

// Cache key helpers
export const CACHE_KEYS = {
  entries: (date: string) => `entries_${date}`,
  settings: 'user_settings',
  chatMessages: 'coach_messages',
  offlineQueue: 'offline_queue',
  frequentItems: 'frequent_items',
};
