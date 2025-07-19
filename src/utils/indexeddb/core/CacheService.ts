import { log } from '@/utils/logger';
/**
 * Generic Cache Service
 * 
 * Handles all caching operations for IndexedDB stores
 * Provides a unified interface for cache management
 */

import { ICacheService, CacheEntry, CacheOptions, CacheStats } from '../types';
import { indexedDBManager } from './IndexedDBManager';

// Default TTL values for different cache types
export const DEFAULT_TTL = {
  SPACE_MEMBERS: 2 * 60 * 1000,     // 2 minutes
  USER_PROFILES: 5 * 60 * 1000,     // 5 minutes  
  USER_CONVERSATIONS: 5 * 60 * 1000, // 5 minutes
  SPACES: 10 * 60 * 1000,           // 10 minutes
  POSTS: 5 * 60 * 1000,             // 5 minutes
  CATEGORIES: 30 * 60 * 1000        // 30 minutes
};

/**
 * Generic Cache Service Implementation
 * 
 * Provides caching operations for any data type with TTL support
 */
export class CacheService<T = any> implements ICacheService<T> {
  private storeName: string;
  private defaultTTL: number;

  constructor(storeName: string, defaultTTL: number = DEFAULT_TTL.SPACE_MEMBERS) {
    this.storeName = storeName;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get data from cache
   */
  async get(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const db = indexedDBManager.getDatabase();
      if (!db) {
        log.warn('Utils', `[CacheService:${this.storeName}] Database not available`);
        return null;
      }

      const cacheEntry = await this.getCacheEntry(key);
      
      if (!cacheEntry) {
        return null;
      }

      // Check if cache entry is expired (unless skipCache is true)
      if (!options.skipCache && this.isCacheExpired(cacheEntry)) {
        log.debug('Utils', `[CacheService:${this.storeName}] Cache entry expired for key: ${key}`);
        
        // Clean up expired entry
        await this.invalidate(key);
        return null;
      }

      log.debug('Utils', `[CacheService:${this.storeName}] Cache hit for key: ${key}`);
      return cacheEntry.data;

    } catch (error) {
      log.error('Utils', `[CacheService:${this.storeName}] Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    try {
      const db = indexedDBManager.getDatabase();
      if (!db) {
        log.warn('Utils', `[CacheService:${this.storeName}] Database not available for caching`);
        return;
      }

      const ttl = options.ttl || this.defaultTTL;
      
      const cacheEntry: CacheEntry<T> = {
        key,
        data,
        timestamp: Date.now(),
        ttl,
        metadata: options.metadata
      };

      await this.setCacheEntry(cacheEntry);
      
      log.debug('Utils', `[CacheService:${this.storeName}] Cached data for key: ${key} (TTL: ${ttl}ms)`);

    } catch (error) {
      log.error('Utils', `[CacheService:${this.storeName}] Error setting cache for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate (remove) cache entry
   */
  async invalidate(key: string): Promise<void> {
    try {
      const db = indexedDBManager.getDatabase();
      if (!db) {
        return;
      }

      await this.deleteCacheEntry(key);
      
      log.debug('Utils', `[CacheService:${this.storeName}] Invalidated cache for key: ${key}`);

    } catch (error) {
      log.error('Utils', `[CacheService:${this.storeName}] Error invalidating cache for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all cache entries for this store
   */
  async clear(): Promise<void> {
    try {
      const db = indexedDBManager.getDatabase();
      if (!db) {
        return;
      }

      await this.clearStore();
      
      log.debug('Utils', `[CacheService:${this.storeName}] Cleared all cache entries`);

    } catch (error) {
      log.error('Utils', `[CacheService:${this.storeName}] Error clearing cache:`, error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const db = indexedDBManager.getDatabase();
      if (!db) {
        return this.getEmptyStats();
      }

      const entries = await this.getAllCacheEntries();
      
      if (entries.length === 0) {
        return this.getEmptyStats();
      }

      const now = Date.now();
      const validEntries = entries.filter(entry => !this.isCacheExpired(entry));
      const expiredEntries = entries.filter(entry => this.isCacheExpired(entry));
      
      const totalSize = entries.reduce((size, entry) => {
        return size + JSON.stringify(entry).length;
      }, 0);

      const ages = validEntries.map(entry => now - entry.timestamp);
      const averageAge = ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;
      
      const oldestEntry = validEntries.length > 0 ? Math.min(...validEntries.map(e => e.timestamp)) : 0;
      const newestEntry = validEntries.length > 0 ? Math.max(...validEntries.map(e => e.timestamp)) : 0;

      // Calculate hit rate (would need to track requests vs hits)
      const hitRate = validEntries.length / (validEntries.length + expiredEntries.length);
      const missRate = 1 - hitRate;

      return {
        totalEntries: entries.length,
        totalSize,
        hitRate,
        missRate,
        averageAge,
        oldestEntry,
        newestEntry
      };

    } catch (error) {
      log.error('Utils', `[CacheService:${this.storeName}] Error getting cache stats:`, error);
      return this.getEmptyStats();
    }
  }

  /**
   * Get cache entries by metadata criteria
   */
  async getByMetadata(field: string, value: any): Promise<CacheEntry<T>[]> {
    try {
      const db = indexedDBManager.getDatabase();
      if (!db) {
        return [];
      }

      const entries = await this.getAllCacheEntries();
      
      return entries.filter(entry => {
        const metadata = entry.metadata || {};
        return metadata[field] === value && !this.isCacheExpired(entry);
      });

    } catch (error) {
      log.error('Utils', `[CacheService:${this.storeName}] Error getting entries by metadata:`, error);
      return [];
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanupExpired(): Promise<number> {
    try {
      const db = indexedDBManager.getDatabase();
      if (!db) {
        return 0;
      }

      const entries = await this.getAllCacheEntries();
      const expiredEntries = entries.filter(entry => this.isCacheExpired(entry));
      
      for (const entry of expiredEntries) {
        await this.deleteCacheEntry(entry.key);
      }

      if (expiredEntries.length > 0) {
        log.debug('Utils', `[CacheService:${this.storeName}] Cleaned up ${expiredEntries.length} expired entries`);
      }

      return expiredEntries.length;

    } catch (error) {
      log.error('Utils', `[CacheService:${this.storeName}] Error cleaning up expired entries:`, error);
      return 0;
    }
  }

  // Private helper methods

  /**
   * Get a cache entry from IndexedDB
   */
  private async getCacheEntry(key: string): Promise<CacheEntry<T> | null> {
    const db = indexedDBManager.getDatabase();
    if (!db) return null;

    return new Promise((resolve) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        log.error('Utils', `[CacheService:${this.storeName}] Error getting cache entry:`, request.error);
        resolve(null);
      };
    });
  }

  /**
   * Set a cache entry in IndexedDB
   */
  private async setCacheEntry(entry: CacheEntry<T>): Promise<void> {
    const db = indexedDBManager.getDatabase();
    if (!db) throw new Error('Database not available');

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a cache entry from IndexedDB
   */
  private async deleteCacheEntry(key: string): Promise<void> {
    const db = indexedDBManager.getDatabase();
    if (!db) return;

    return new Promise((resolve) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        log.error('Utils', `[CacheService:${this.storeName}] Error deleting cache entry:`, request.error);
        resolve();
      };
    });
  }

  /**
   * Clear the entire store
   */
  private async clearStore(): Promise<void> {
    const db = indexedDBManager.getDatabase();
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all cache entries
   */
  private async getAllCacheEntries(): Promise<CacheEntry<T>[]> {
    const db = indexedDBManager.getDatabase();
    if (!db) return [];

    return new Promise((resolve) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        log.error('Utils', `[CacheService:${this.storeName}] Error getting all entries:`, request.error);
        resolve([]);
      };
    });
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Get empty stats object
   */
  private getEmptyStats(): CacheStats {
    return {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      averageAge: 0,
      oldestEntry: 0,
      newestEntry: 0
    };
  }
}

// Factory function to create cache services for different stores
export const createCacheService = <T>(storeName: string, ttl?: number): CacheService<T> => {
  return new CacheService<T>(storeName, ttl);
};

// Pre-configured cache services for common use cases
export const spaceMembersCacheService = createCacheService('space_members_cache', DEFAULT_TTL.SPACE_MEMBERS);
export const userProfilesCacheService = createCacheService('user_profiles_cache', DEFAULT_TTL.USER_PROFILES);
export const userConversationsCacheService = createCacheService('user_conversations_cache', DEFAULT_TTL.USER_CONVERSATIONS);
export const spacesCacheService = createCacheService('spaces_cache', DEFAULT_TTL.SPACES);
export const postsCacheService = createCacheService('posts_cache', DEFAULT_TTL.POSTS);
export const categoriesCacheService = createCacheService('categories_cache', DEFAULT_TTL.CATEGORIES); 