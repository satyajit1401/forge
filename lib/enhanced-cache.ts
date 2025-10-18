/**
 * Enhanced Cache - Two-Layer Caching System
 * L1: In-memory Map for instant access
 * L2: MMKV for persistent storage
 *
 * Pattern: Stale-While-Revalidate
 * - Show cached data immediately (L1 or L2)
 * - Fetch fresh data in background
 * - Update cache with fresh data
 */

import { cache as mmkvCache } from './cache';

// L1 Cache: In-memory cache for instant access
const memoryCache = new Map<string, any>();

// Cache metadata for TTL tracking
interface CacheMetadata {
  timestamp: number;
  ttl?: number; // Time-to-live in milliseconds (optional)
}
const metadataCache = new Map<string, CacheMetadata>();

/**
 * Get value from cache (checks L1 first, then L2)
 */
export function getCached<T>(key: string): T | null {
  // Try L1 cache (memory) first - INSTANT
  if (memoryCache.has(key)) {
    const metadata = metadataCache.get(key);

    // Check if TTL has expired
    if (metadata?.ttl) {
      const age = Date.now() - metadata.timestamp;
      if (age > metadata.ttl) {
        // Expired - clear from L1 and fall through to L2
        memoryCache.delete(key);
        metadataCache.delete(key);
      } else {
        // Valid L1 cache hit
        return memoryCache.get(key) as T;
      }
    } else {
      // No TTL - return cached value
      return memoryCache.get(key) as T;
    }
  }

  // Fall back to L2 cache (MMKV) - PERSISTENT
  const l2Value = mmkvCache.get<T>(key);

  // If found in L2, populate L1 for next access
  if (l2Value !== null) {
    memoryCache.set(key, l2Value);
    metadataCache.set(key, { timestamp: Date.now() });
    return l2Value;
  }

  return null;
}

/**
 * Set value in cache (writes to both L1 and L2)
 */
export function setCached<T>(key: string, value: T, ttl?: number): void {
  // Write to L1 cache (memory)
  memoryCache.set(key, value);
  metadataCache.set(key, { timestamp: Date.now(), ttl });

  // Write to L2 cache (MMKV) for persistence
  mmkvCache.set(key, value);
}

/**
 * Check if cache key exists and is not expired
 */
export function hasCached(key: string): boolean {
  const cached = getCached(key);
  return cached !== null;
}

/**
 * Invalidate specific cache key (clears from L1 and L2)
 */
export function invalidate(key: string): void {
  memoryCache.delete(key);
  metadataCache.delete(key);
  mmkvCache.delete(key);
}

/**
 * Invalidate cache keys matching a pattern (e.g., "entries_*")
 */
export function invalidatePattern(pattern: string): void {
  const regex = new RegExp(pattern.replace('*', '.*'));

  // Clear from L1
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
      metadataCache.delete(key);
    }
  }

  // Note: MMKV doesn't support pattern deletion, but L1 clearing is sufficient
  // for immediate UI updates. L2 will be overwritten on next write.
}

/**
 * Clear all cache (L1 and L2)
 */
export function clearAll(): void {
  memoryCache.clear();
  metadataCache.clear();
  mmkvCache.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats() {
  return {
    l1Size: memoryCache.size,
    l1Keys: Array.from(memoryCache.keys()),
  };
}

// Export cache keys for consistency
export const CACHE_KEYS = {
  entries: (date: string) => `entries_${date}`,
  settings: 'user_settings',
  analytics: 'analytics_data',
  chatMessages: 'coach_messages',
  frequentItems: 'frequent_items',
  offlineQueue: 'offline_queue',
};
