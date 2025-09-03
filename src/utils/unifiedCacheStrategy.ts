import { log } from '@/utils/logger';

/**
 * 🚀 Unified Cache Strategy - Standardized caching across the application
 * 
 * Features:
 * - Consistent TTL values across all services
 * - Unified cache invalidation patterns
 * - Smart cache warming and preloading
 * - Cache compression and optimization
 * - Performance monitoring and analytics
 */

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  compression: boolean;
  preload: boolean;
  invalidationStrategy: 'immediate' | 'lazy' | 'scheduled';
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  compressed?: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  compressions: number;
  totalSize: number;
  averageAccessTime: number;
}

export interface CacheInvalidationRule {
  pattern: string;
  strategy: 'immediate' | 'lazy' | 'scheduled';
  delay?: number;
}

class UnifiedCacheStrategy {
  private static instance: UnifiedCacheStrategy;
  private cache = new Map<string, CacheEntry>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    compressions: 0,
    totalSize: 0,
    averageAccessTime: 0
  };

  // Standardized TTL values
  public static readonly TTL = {
    // User data (relatively stable)
    USER_PROFILE: 15 * 60 * 1000,        // 15 minutes
    USER_SPACES: 10 * 60 * 1000,         // 10 minutes
    USER_PREFERENCES: 30 * 60 * 1000,    // 30 minutes

    // Space data (moderately stable)
    SPACE_DETAILS: 10 * 60 * 1000,       // 10 minutes
    SPACE_MEMBERS: 5 * 60 * 1000,        // 5 minutes
    SPACE_CATEGORIES: 10 * 60 * 1000,    // 10 minutes
    SPACE_SETTINGS: 15 * 60 * 1000,      // 15 minutes

    // Content data (frequently changing)
    POSTS: 2 * 60 * 1000,                // 2 minutes
    COMMENTS: 3 * 60 * 1000,             // 3 minutes
    COURSES: 5 * 60 * 1000,              // 5 minutes
    LESSONS: 5 * 60 * 1000,              // 5 minutes

    // Real-time data (very dynamic)
    PRESENCE: 30 * 1000,                 // 30 seconds
    NOTIFICATIONS: 1 * 60 * 1000,        // 1 minute
    CHAT_MESSAGES: 1 * 60 * 1000,        // 1 minute

    // Static data (very stable)
    BADGES: 60 * 60 * 1000,              // 1 hour
    SYSTEM_CONFIG: 30 * 60 * 1000,       // 30 minutes
  } as const;

  // Cache invalidation patterns
  private invalidationRules: CacheInvalidationRule[] = [
    // User-related invalidations
    { pattern: 'user:*', strategy: 'immediate' },
    { pattern: 'user_profile:*', strategy: 'immediate' },
    { pattern: 'user_spaces:*', strategy: 'immediate' },

    // Space-related invalidations
    { pattern: 'space:*', strategy: 'lazy', delay: 5000 },
    { pattern: 'space_members:*', strategy: 'immediate' },
    { pattern: 'space_categories:*', strategy: 'lazy', delay: 2000 },

    // Content-related invalidations
    { pattern: 'posts:*', strategy: 'lazy', delay: 1000 },
    { pattern: 'comments:*', strategy: 'lazy', delay: 1000 },
    { pattern: 'courses:*', strategy: 'lazy', delay: 3000 },

    // Real-time invalidations
    { pattern: 'presence:*', strategy: 'immediate' },
    { pattern: 'notifications:*', strategy: 'immediate' },
    { pattern: 'chat:*', strategy: 'immediate' },
  ];

  private config: CacheConfig = {
    ttl: UnifiedCacheStrategy.TTL.POSTS,
    maxSize: 1000,
    compression: true,
    preload: true,
    invalidationStrategy: 'lazy'
  };

  constructor() {
    this.setupPeriodicCleanup();
  }

  static getInstance(): UnifiedCacheStrategy {
    if (!UnifiedCacheStrategy.instance) {
      UnifiedCacheStrategy.instance = new UnifiedCacheStrategy();
    }
    return UnifiedCacheStrategy.instance;
  }

  /**
   * 🎯 SET CACHE ENTRY
   */
  set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      tags?: string[];
      compress?: boolean;
    } = {}
  ): void {
    const {
      ttl = this.config.ttl,
      tags = [],
      compress = this.config.compression
    } = options;

    const startTime = Date.now();

    // Compress data if enabled and beneficial
    let processedData = data;
    let compressed = false;
    
    if (compress && this.shouldCompress(data)) {
      processedData = this.compress(data);
      compressed = true;
      this.metrics.compressions++;
    }

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      tags,
      compressed
    };

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.delete(key);
    }

    this.cache.set(key, entry);
    this.metrics.sets++;
    this.metrics.totalSize += this.calculateSize(entry);

    const duration = Date.now() - startTime;
    this.updateAverageAccessTime(duration);

    log.debug('Utils', `💾 [UnifiedCache] Set: ${key}, size: ${this.calculateSize(entry)}B, compressed: ${compressed}`);

    // Check cache size limits
    this.enforceSizeLimits();
  }

  /**
   * 🎯 GET CACHE ENTRY
   */
  get<T>(key: string): T | null {
    const startTime = Date.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.metrics.deletes++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Decompress if needed
    let data = entry.data;
    if (entry.compressed) {
      data = this.decompress(entry.data);
    }

    this.metrics.hits++;
    
    const duration = Date.now() - startTime;
    this.updateAverageAccessTime(duration);

    return data as T;
  }

  /**
   * 🗑️ DELETE CACHE ENTRY
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.metrics.deletes++;
      this.metrics.totalSize -= this.calculateSize(entry);
      return true;
    }
    return false;
  }

  /**
   * 🔄 INVALIDATE BY PATTERN
   */
  invalidatePattern(pattern: string, strategy?: 'immediate' | 'lazy' | 'scheduled'): void {
    const rule = this.invalidationRules.find(r => r.pattern === pattern);
    const invalidationStrategy = strategy || rule?.strategy || this.config.invalidationStrategy;

    const keysToInvalidate = Array.from(this.cache.keys()).filter(key => 
      this.matchesPattern(key, pattern)
    );

    if (invalidationStrategy === 'immediate') {
      keysToInvalidate.forEach(key => this.delete(key));
      log.debug('Utils', `🔄 [UnifiedCache] Immediate invalidation: ${pattern}, keys: ${keysToInvalidate.length}`);
    } else if (invalidationStrategy === 'lazy') {
      const delay = rule?.delay || 1000;
      setTimeout(() => {
        keysToInvalidate.forEach(key => this.delete(key));
        log.debug('Utils', `🔄 [UnifiedCache] Lazy invalidation: ${pattern}, keys: ${keysToInvalidate.length}`);
      }, delay);
    } else if (invalidationStrategy === 'scheduled') {
      // Schedule for next cleanup cycle
      this.scheduleInvalidation(keysToInvalidate);
    }
  }

  /**
   * 🏷️ INVALIDATE BY TAGS
   */
  invalidateByTags(tags: string[]): void {
    const keysToInvalidate: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        keysToInvalidate.push(key);
      }
    }

    keysToInvalidate.forEach(key => this.delete(key));
    log.debug('Utils', `🏷️ [UnifiedCache] Tag invalidation: ${tags.join(', ')}, keys: ${keysToInvalidate.length}`);
  }

  /**
   * 🔥 WARM CACHE
   */
  async warmCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
      priority?: 'high' | 'normal' | 'low';
    } = {}
  ): Promise<T> {
    const { ttl, tags, priority = 'normal' } = options;

    // Check if already cached
    const cached = this.get<T>(key);
    if (cached) {
      return cached;
    }

    try {
      const data = await fetchFn();
      this.set(key, data, { ttl, tags });
      return data;
    } catch (error) {
      log.error('Utils', `🔥 [UnifiedCache] Cache warming failed: ${key}`, error);
      throw error;
    }
  }

  /**
   * 📊 GET METRICS
   */
  getMetrics(): CacheMetrics & {
    hitRate: number;
    cacheSize: number;
    averageEntrySize: number;
  } {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;
    const cacheSize = this.cache.size;
    const averageEntrySize = cacheSize > 0 ? this.metrics.totalSize / cacheSize : 0;

    return {
      ...this.metrics,
      hitRate,
      cacheSize,
      averageEntrySize
    };
  }

  /**
   * 🧹 CLEAR ALL CACHE
   */
  clear(): void {
    this.cache.clear();
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      compressions: 0,
      totalSize: 0,
      averageAccessTime: 0
    };
    log.debug('Utils', '🧹 [UnifiedCache] Cleared all cache');
  }

  /**
   * 🔧 HELPER METHODS
   */
  private shouldCompress(data: any): boolean {
    const serialized = JSON.stringify(data);
    return serialized.length > 1024; // Compress if larger than 1KB
  }

  private compress(data: any): any {
    // Simple compression using JSON stringify/parse
    // In production, you might want to use a proper compression library
    return JSON.stringify(data);
  }

  private decompress(data: any): any {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  private calculateSize(entry: CacheEntry): number {
    return JSON.stringify(entry).length;
  }

  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  private updateAverageAccessTime(duration: number): void {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    this.metrics.averageAccessTime = 
      (this.metrics.averageAccessTime * (totalRequests - 1) + duration) / totalRequests;
  }

  private enforceSizeLimits(): void {
    if (this.cache.size > this.config.maxSize) {
      // Remove least recently used entries
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      
      const toRemove = entries.slice(0, this.cache.size - this.config.maxSize);
      toRemove.forEach(([key]) => this.delete(key));
      
      log.debug('Utils', `📏 [UnifiedCache] Enforced size limit, removed ${toRemove.length} entries`);
    }
  }

  private setupPeriodicCleanup(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];
      
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          expiredKeys.push(key);
        }
      }
      
      expiredKeys.forEach(key => this.delete(key));
      
      if (expiredKeys.length > 0) {
        log.debug('Utils', `🧹 [UnifiedCache] Cleaned up ${expiredKeys.length} expired entries`);
      }
    }, 5 * 60 * 1000);
  }

  private scheduleInvalidation(keys: string[]): void {
    // Schedule invalidation for next cleanup cycle
    setTimeout(() => {
      keys.forEach(key => this.delete(key));
    }, 1000);
  }
}

// Export singleton instance
export const unifiedCache = UnifiedCacheStrategy.getInstance();

// Export class for testing
export { UnifiedCacheStrategy };

// Export types
export type { CacheConfig, CacheEntry, CacheMetrics, CacheInvalidationRule };
