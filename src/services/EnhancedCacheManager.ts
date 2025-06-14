/**
 * 🚀 Enhanced Cache Manager
 * 
 * Unified cache interface that coordinates with LoadingStateManager
 * for smart caching, invalidation, and background sync
 */

import { CacheSource, UserType } from '@/managers/LoadingStateManager';

// Cache entry structure
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  source: string;
  userType?: UserType;
  tags: string[];
}

// Cache configuration
interface CacheConfig {
  defaultTTL: number;
  maxEntries: number;
  enablePersistence: boolean;
  enablePredictive: boolean;
}

// Predictive cache entry for preloading
interface PredictiveCacheEntry {
  key: string;
  probability: number;
  lastAccessed: number;
  accessCount: number;
}

class EnhancedCacheManager {
  private static instance: EnhancedCacheManager;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private predictiveEntries: Map<string, PredictiveCacheEntry> = new Map();
  
  private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxEntries: 1000,
    enablePersistence: true,
    enablePredictive: true
  };

  private constructor() {
    this.initializeCleanup();
    this.initializeDebugTools();
  }

  static getInstance(): EnhancedCacheManager {
    if (!EnhancedCacheManager.instance) {
      EnhancedCacheManager.instance = new EnhancedCacheManager();
    }
    return EnhancedCacheManager.instance;
  }

  /**
   * 🚀 SMART GET - Try cache sources in priority order
   */
  get<T>(key: string, fallbackFn?: () => Promise<T>): CacheEntry<T> | null {
    // 1. Try memory cache first (fastest)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValidEntry(memoryEntry)) {
      this.updateAccessStats(key);
      // Memory cache hit
      return memoryEntry as CacheEntry<T>;
    }

    // 2. Try localStorage (persistent)
    if (this.config.enablePersistence) {
      const persistentEntry = this.getFromLocalStorage<T>(key);
      if (persistentEntry && this.isValidEntry(persistentEntry)) {
        // Promote to memory cache
        this.memoryCache.set(key, persistentEntry);
        this.updateAccessStats(key);
        // Persistent cache hit
        return persistentEntry;
      }
    }

    // 3. Check if we should predictively cache this
    if (this.config.enablePredictive && fallbackFn) {
      this.scheduleBackgroundLoad(key, fallbackFn);
    }

          // Cache miss
    return null;
  }

  /**
   * 💾 SMART SET - Store with appropriate TTL and tags
   */
  set<T>(key: string, data: T, options: {
    ttl?: number;
    tags?: string[];
    source?: string;
    userType?: UserType;
    persist?: boolean;
  } = {}): void {
    const {
      ttl = this.config.defaultTTL,
      tags = [],
      source = 'manual',
      userType,
      persist = this.config.enablePersistence
    } = options;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      source,
      userType,
      tags: [...tags, 'enhanced-cache']
    };

    // Store in memory
    this.memoryCache.set(key, entry);

    // Store in localStorage if enabled
    if (persist) {
      this.setInLocalStorage(key, entry);
    }

    // Update predictive stats
    this.updateAccessStats(key);

    // Enforce cache size limits
    this.enforceMemoryLimits();

    console.log(`💾 [CacheManager] Cached: ${key} (TTL: ${ttl}ms, Source: ${source})`);
  }

  /**
   * 🧹 SMART INVALIDATION - Remove by key, tags, or user type
   */
  invalidate(criteria: {
    key?: string;
    tags?: string[];
    userType?: UserType;
    olderThan?: number;
  }): number {
    let invalidatedCount = 0;
    const { key, tags, userType, olderThan } = criteria;

    if (key) {
      // Single key invalidation
      if (this.memoryCache.delete(key)) invalidatedCount++;
      if (this.config.enablePersistence) {
        localStorage.removeItem(key);
      }
    } else {
      // Bulk invalidation
      const toDelete: string[] = [];
      
      for (const [cacheKey, entry] of this.memoryCache) {
        let shouldDelete = false;

        if (tags && tags.some(tag => entry.tags.includes(tag))) {
          shouldDelete = true;
        }

        if (userType && entry.userType === userType) {
          shouldDelete = true;
        }

        if (olderThan && (Date.now() - entry.timestamp) > olderThan) {
          shouldDelete = true;
        }

        if (shouldDelete) {
          toDelete.push(cacheKey);
        }
      }

      // Delete identified entries
      for (const keyToDelete of toDelete) {
        this.memoryCache.delete(keyToDelete);
        if (this.config.enablePersistence) {
          localStorage.removeItem(keyToDelete);
        }
        invalidatedCount++;
      }
    }

    console.log(`🧹 [CacheManager] Invalidated ${invalidatedCount} entries`);
    return invalidatedCount;
  }

  /**
   * 🔮 PREDICTIVE CACHE - Preload likely-needed data
   */
  predictiveCache(userId: string, userType: UserType): void {
    if (!this.config.enablePredictive) return;

    console.log(`🔮 [CacheManager] Starting predictive caching for ${userType}`);

    switch (userType) {
      case UserType.SPACE_OWNER:
        this.preloadOwnerData(userId);
        break;
      case UserType.MEMBER_ONLY:
        this.preloadMemberData(userId);
        break;
      case UserType.OWNER_AND_MEMBER:
        this.preloadOwnerData(userId);
        this.preloadMemberData(userId);
        break;
      case UserType.NO_SPACES:
        this.preloadDiscoverData();
        break;
    }
  }

  /**
   * 📊 CACHE STATS - Get cache performance metrics
   */
  getCacheStats(): {
    memoryEntries: number;
    persistentEntries: number;
    predictiveEntries: number;
    hitRate: number;
    mostAccessed: string[];
  } {
    const persistentEntries = this.config.enablePersistence ? 
      Object.keys(localStorage).filter(key => key.startsWith('enhanced-cache-')).length : 0;

    // Calculate hit rate from predictive data
    const totalAccess = Array.from(this.predictiveEntries.values()).reduce((sum, entry) => sum + entry.accessCount, 0);
    const hitRate = totalAccess > 0 ? 
      Array.from(this.predictiveEntries.values()).filter(entry => entry.accessCount > 1).length / this.predictiveEntries.size : 0;

    // Most accessed entries
    const mostAccessed = Array.from(this.predictiveEntries.entries())
      .sort(([, a], [, b]) => b.accessCount - a.accessCount)
      .slice(0, 5)
      .map(([key]) => key);

    return {
      memoryEntries: this.memoryCache.size,
      persistentEntries,
      predictiveEntries: this.predictiveEntries.size,
      hitRate,
      mostAccessed
    };
  }

  /**
   * 🔧 CACHE UTILITIES
   */

  // Check if user owns a specific space (instant ownership check)
  checkOwnership(userId: string, subdomain: string): boolean {
    const ownershipKey = `user_owns_space_${subdomain}`;
    const entry = this.get(ownershipKey);
    return entry?.data === 'true' || entry?.data === true;
  }

  // Check if user is member of a specific space  
  checkMembership(userId: string, subdomain: string): boolean {
    const membershipKey = `user_member_${subdomain}_${userId}`;
    const entry = this.get(membershipKey);
    // Add type safety for membership check
    return entry?.data && typeof entry.data === 'object' && 'isMember' in entry.data 
      ? (entry.data as { isMember: boolean }).isMember === true 
      : false;
  }

  // Get last active space for instant redirect
  getLastActiveSpace(userId: string): any {
    const entry = this.get('lastActiveSpace');
    if (entry && this.isValidEntry(entry)) {
      return entry.data;
    }
    return null;
  }

  // Cache space data with smart tags
  cacheSpaceData(spaceData: any, userId: string, userType: UserType): void {
    const tags = ['space-data', `user-${userId}`, `type-${userType}`];
    if (spaceData.owner_id === userId) {
      tags.push('owned-space');
    }

    this.set(`space-${spaceData.subdomain}`, spaceData, {
      tags,
      userType,
      source: 'space-api',
      ttl: 10 * 60 * 1000 // 10 minutes for space data
    });

    // Also cache quick access flags
    this.set(`user_owns_space_${spaceData.subdomain}`, spaceData.owner_id === userId, {
      tags: ['ownership-flag', `user-${userId}`],
      ttl: 30 * 60 * 1000 // 30 minutes for ownership
    });
  }

  // =================== PRIVATE METHODS ===================

  private isValidEntry(entry: CacheEntry): boolean {
    return (Date.now() - entry.timestamp) < entry.ttl;
  }

  private getFromLocalStorage<T>(key: string): CacheEntry<T> | null {
    try {
      const item = localStorage.getItem(`enhanced-cache-${key}`);
      if (!item) return null;
      
      const entry = JSON.parse(item) as CacheEntry<T>;
      return this.isValidEntry(entry) ? entry : null;
    } catch {
      return null;
    }
  }

  private setInLocalStorage<T>(key: string, entry: CacheEntry<T>): void {
    try {
      localStorage.setItem(`enhanced-cache-${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to persist cache entry:', error);
    }
  }

  private updateAccessStats(key: string): void {
    const existing = this.predictiveEntries.get(key);
    if (existing) {
      existing.accessCount++;
      existing.lastAccessed = Date.now();
    } else {
      this.predictiveEntries.set(key, {
        key,
        probability: 0.5,
        lastAccessed: Date.now(),
        accessCount: 1
      });
    }
  }

  private scheduleBackgroundLoad<T>(key: string, loadFn: () => Promise<T>): void {
    // Background loading to prepare for next access
    setTimeout(async () => {
      try {
        const data = await loadFn();
        this.set(key, data, { source: 'background-load' });
      } catch (error) {
        console.warn('Background cache load failed:', error);
      }
    }, 100); // Small delay to not block main thread
  }

  private enforceMemoryLimits(): void {
    if (this.memoryCache.size <= this.config.maxEntries) return;

    // Remove oldest entries
    const entries = Array.from(this.memoryCache.entries());
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const toRemove = entries.slice(0, entries.length - this.config.maxEntries);
    for (const [key] of toRemove) {
      this.memoryCache.delete(key);
    }

    console.log(`🧹 [CacheManager] Enforced memory limits, removed ${toRemove.length} entries`);
  }

  private preloadOwnerData(userId: string): void {
    // Preload commonly accessed owner data
    const commonKeys = [
      'lastActiveSpace',
      `user-spaces-${userId}`,
      `user-permissions-${userId}`
    ];
    
    for (const key of commonKeys) {
      if (!this.memoryCache.has(key)) {
        // Mark for background loading
        this.updateAccessStats(key);
      }
    }
  }

  private preloadMemberData(userId: string): void {
    // Preload commonly accessed member data
    const commonKeys = [
      'lastJoinedSpace',
      `user-memberships-${userId}`,
      `recent-spaces-${userId}`
    ];
    
    for (const key of commonKeys) {
      if (!this.memoryCache.has(key)) {
        this.updateAccessStats(key);
      }
    }
  }

  private preloadDiscoverData(): void {
    // Preload discover page data for users with no spaces
    const discoverKeys = [
      'featured-spaces',
      'popular-spaces',
      'recent-spaces'
    ];
    
    for (const key of discoverKeys) {
      if (!this.memoryCache.has(key)) {
        this.updateAccessStats(key);
      }
    }
  }

  private initializeCleanup(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, entry] of this.memoryCache) {
        if (!this.isValidEntry(entry)) {
          this.memoryCache.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 [CacheManager] Cleaned up ${cleanedCount} expired entries`);
      }
    }, 5 * 60 * 1000);
  }

  private initializeDebugTools(): void {
    if (process.env.NODE_ENV === 'development') {
      (window as any).enhancedCacheManager = this;
      (window as any).debugCache = () => {
        const stats = this.getCacheStats();
        console.log('🚀 Enhanced Cache Manager Debug:', {
          stats,
          memoryKeys: Array.from(this.memoryCache.keys()),
          predictiveEntries: Array.from(this.predictiveEntries.entries())
        });
      };
    }
  }
}

// Export singleton instance
export const enhancedCacheManager = EnhancedCacheManager.getInstance();

// Export types
export type { CacheEntry, CacheConfig, PredictiveCacheEntry }; 