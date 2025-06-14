import { useCallback, useRef } from 'react';

/**
 * Cache configuration options
 */
interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache entries
  compression?: boolean; // Enable compression for large objects
}

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  compressed?: boolean;
  size?: number;
}

/**
 * Smart caching hook with LRU eviction and optional compression
 * Provides intelligent data caching with automatic cleanup
 */
export function useSmartCache<T>(options: CacheOptions) {
  const cache = useRef(new Map<string, CacheEntry<T>>());
  const accessOrder = useRef<string[]>([]);
  
  /**
   * Update access order for LRU tracking
   */
  const updateAccessOrder = useCallback((key: string) => {
    const existingIndex = accessOrder.current.indexOf(key);
    if (existingIndex > -1) {
      accessOrder.current.splice(existingIndex, 1);
    }
    accessOrder.current.push(key);
  }, []);
  
  /**
   * Evict least recently used entries when cache is full
   */
  const evictLRU = useCallback(() => {
    if (accessOrder.current.length === 0) return;
    
    const lruKey = accessOrder.current.shift();
    if (lruKey && cache.current.has(lruKey)) {
      cache.current.delete(lruKey);
      console.log(`[SmartCache] Evicted LRU entry: ${lruKey}`);
    }
  }, []);
  
  /**
   * Estimate object size in bytes (rough approximation)
   */
  const estimateSize = useCallback((data: T): number => {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 1000; // Default estimate if serialization fails
    }
  }, []);
  
  /**
   * Compress data if it's larger than threshold
   */
  const maybeCompress = useCallback((data: T): { data: T; compressed: boolean; size: number } => {
    const size = estimateSize(data);
    let compressed = false;
    let finalData = data;
    
    // Simple compression strategy - could be enhanced with actual compression libraries
    if (options.compression && size > 10000) {
      try {
        // For now, just mark as compressed - actual compression can be added later
        compressed = true;
        console.log(`[SmartCache] Large object detected (${size} bytes), marked for compression`);
      } catch (error) {
        console.warn('[SmartCache] Compression failed:', error);
      }
    }
    
    return { data: finalData, compressed, size };
  }, [options.compression, estimateSize]);
  
  /**
   * Set cache entry with LRU management
   */
  const set = useCallback((key: string, data: T) => {
    const now = Date.now();
    
    // Evict entries if cache is full
    while (cache.current.size >= options.maxSize) {
      evictLRU();
    }
    
    // Process data (compression, size estimation)
    const { data: finalData, compressed, size } = maybeCompress(data);
    
    // Store the entry
    cache.current.set(key, {
      data: finalData,
      timestamp: now,
      compressed,
      size
    });
    
    // Update access order
    updateAccessOrder(key);
    
    console.log(`[SmartCache] Cached entry: ${key} (${size} bytes, compressed: ${compressed})`);
  }, [options.maxSize, evictLRU, maybeCompress, updateAccessOrder]);
  
  /**
   * Get cache entry with TTL and access order tracking
   */
  const get = useCallback((key: string): T | null => {
    const entry = cache.current.get(key);
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    
    // Check if entry is expired
    if (age > options.ttl) {
      cache.current.delete(key);
      const orderIndex = accessOrder.current.indexOf(key);
      if (orderIndex > -1) {
        accessOrder.current.splice(orderIndex, 1);
      }
      console.log(`[SmartCache] Expired entry removed: ${key} (age: ${age}ms)`);
      return null;
    }
    
    // Update access order
    updateAccessOrder(key);
    
    console.log(`[SmartCache] Cache hit: ${key} (age: ${age}ms)`);
    return entry.data;
  }, [options.ttl, updateAccessOrder]);
  
  /**
   * Check if key exists and is valid
   */
  const has = useCallback((key: string): boolean => {
    const entry = cache.current.get(key);
    if (!entry) return false;
    
    const age = Date.now() - entry.timestamp;
    return age <= options.ttl;
  }, [options.ttl]);
  
  /**
   * Clear specific key or entire cache
   */
  const clear = useCallback((key?: string) => {
    if (key) {
      cache.current.delete(key);
      const orderIndex = accessOrder.current.indexOf(key);
      if (orderIndex > -1) {
        accessOrder.current.splice(orderIndex, 1);
      }
      console.log(`[SmartCache] Cleared entry: ${key}`);
    } else {
      cache.current.clear();
      accessOrder.current = [];
      console.log('[SmartCache] Cleared entire cache');
    }
  }, []);
  
  /**
   * Get cache statistics
   */
  const getStats = useCallback(() => {
    const entries = Array.from(cache.current.entries());
    const totalSize = entries.reduce((sum, [, entry]) => sum + (entry.size || 0), 0);
    const compressedCount = entries.filter(([, entry]) => entry.compressed).length;
    
    return {
      size: cache.current.size,
      maxSize: options.maxSize,
      totalBytes: totalSize,
      compressedEntries: compressedCount,
      oldestEntry: accessOrder.current[0] || null,
      newestEntry: accessOrder.current[accessOrder.current.length - 1] || null
    };
  }, [options.maxSize]);
  
  return {
    set,
    get,
    has,
    clear,
    getStats
  };
}

/**
 * Pre-configured cache instances for common use cases
 */

// Space data cache - longer TTL, smaller size
export const useSpaceCache = () => useSmartCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 50,
  compression: true
});

// User data cache - medium TTL, medium size
export const useUserCache = () => useSmartCache({
  ttl: 3 * 60 * 1000, // 3 minutes  
  maxSize: 100,
  compression: false
});

// Posts cache - shorter TTL, larger size
export const usePostsCache = () => useSmartCache({
  ttl: 2 * 60 * 1000, // 2 minutes
  maxSize: 200,
  compression: true
}); 