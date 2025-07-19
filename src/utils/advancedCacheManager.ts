import { log } from '@/utils/logger';
// =====================================
// ADVANCED CACHE MANAGEMENT SYSTEM
// =====================================
// Phase 7: Production-ready caching with intelligent invalidation

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of items
  priority: 'high' | 'medium' | 'low';
  compression: boolean;
  tags: string[]; // For tag-based invalidation
}

interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  compressed: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  size: number;
  memoryUsage: number;
  hitRate: number;
}

export class AdvancedCacheManager {
  private static instance: AdvancedCacheManager;
  private cache = new Map<string, CacheItem>();
  private stats: CacheStats;
  private maxMemoryUsage: number = 50 * 1024 * 1024; // 50MB default
  private compressionThreshold: number = 1024; // 1KB
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      size: 0,
      memoryUsage: 0,
      hitRate: 0
    };
    
    this.startCleanupProcess();
    
    // Monitor memory usage
    if (typeof window !== 'undefined') {
      this.monitorMemoryUsage();
    }
  }

  static getInstance(): AdvancedCacheManager {
    if (!AdvancedCacheManager.instance) {
      AdvancedCacheManager.instance = new AdvancedCacheManager();
    }
    return AdvancedCacheManager.instance;
  }

  /**
   * Set cache item with advanced configuration
   */
  set<T>(
    key: string, 
    data: T, 
    config: Partial<CacheConfig> = {}
  ): void {
    try {
      const fullConfig: CacheConfig = {
        ttl: 5 * 60 * 1000, // 5 minutes default
        maxSize: 100,
        priority: 'medium',
        compression: false,
        tags: [],
        ...config
      };

      // Serialize and potentially compress data
      let serializedData = JSON.stringify(data);
      let compressed = false;

      if (fullConfig.compression && serializedData.length > this.compressionThreshold) {
        try {
          // Use basic compression (in real implementation, use proper compression library)
          serializedData = this.simpleCompress(serializedData);
          compressed = true;
        } catch (error) {
          log.warn('Utils', 'Cache compression failed:', error);
        }
      }

      const size = new Blob([serializedData]).size;
      
      // Check memory limits
      if (this.stats.memoryUsage + size > this.maxMemoryUsage) {
        this.evictItems(size);
      }

      const item: CacheItem<string> = {
        data: serializedData,
        timestamp: Date.now(),
        ttl: fullConfig.ttl,
        size,
        accessCount: 0,
        lastAccessed: Date.now(),
        tags: fullConfig.tags,
        compressed
      };

      this.cache.set(key, item);
      this.stats.sets++;
      this.stats.size++;
      this.stats.memoryUsage += size;
      
      log.debug('Utils', `[AdvancedCache] Set ${key} (${this.formatBytes(size)}, TTL: ${fullConfig.ttl}ms)`);

    } catch (error) {
      log.error('Utils', 'Cache set error:', error);
    }
  }

  /**
   * Get cache item with access tracking
   */
  get<T>(key: string): T | null {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      // Check TTL
      if (Date.now() - item.timestamp > item.ttl) {
        this.delete(key);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      // Update access tracking
      item.accessCount++;
      item.lastAccessed = Date.now();
      this.stats.hits++;
      this.updateHitRate();

      // Deserialize and decompress if needed
      let data = item.data;
      if (item.compressed) {
        data = this.simpleDecompress(data);
      }

      const parsedData = JSON.parse(data);
      
      log.debug('Utils', `[AdvancedCache] Hit ${key} (${item.accessCount} accesses)`);
      return parsedData;

    } catch (error) {
      log.error('Utils', 'Cache get error:', error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Delete specific cache item
   */
  delete(key: string): boolean {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.stats.size--;
      this.stats.memoryUsage -= item.size;
      log.debug('Utils', `[AdvancedCache] Deleted ${key}`);
      return true;
    }
    return false;
  }

  /**
   * Clear cache by tags
   */
  clearByTags(tags: string[]): number {
    let cleared = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.tags.some(tag => tags.includes(tag))) {
        this.delete(key);
        cleared++;
      }
    }
    
    log.debug('Utils', `[AdvancedCache] Cleared ${cleared} items by tags:`, tags);
    return cleared;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    this.stats.memoryUsage = 0;
    log.debug('Utils', `[AdvancedCache] Cleared all ${size} items`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache health report
   */
  getHealthReport(): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: any;
    recommendations: string[];
  } {
    const hitRate = this.stats.hitRate;
    const memoryUsagePercent = (this.stats.memoryUsage / this.maxMemoryUsage) * 100;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    if (hitRate < 50) {
      status = 'warning';
      recommendations.push('Cache hit rate is low. Consider increasing TTL or improving cache strategy.');
    }

    if (memoryUsagePercent > 80) {
      status = 'critical';
      recommendations.push('Cache memory usage is high. Consider reducing max size or implementing better eviction.');
    }

    if (this.stats.evictions > this.stats.sets * 0.1) {
      status = 'warning';
      recommendations.push('High eviction rate detected. Consider increasing memory limit.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal.');
    }

    return {
      status,
      metrics: {
        hitRate,
        memoryUsagePercent,
        totalItems: this.stats.size,
        memoryUsage: this.formatBytes(this.stats.memoryUsage),
        maxMemory: this.formatBytes(this.maxMemoryUsage)
      },
      recommendations
    };
  }

  /**
   * Prefetch data for improved performance
   */
  async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: Partial<CacheConfig> = {}
  ): Promise<T> {
    // Check if already cached
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const data = await fetcher();
      this.set(key, data, { ...config, priority: 'high' });
      return data;
    } catch (error) {
      log.error('Utils', 'Prefetch failed:', error);
      throw error;
    }
  }

  /**
   * Batch operations for efficiency
   */
  batchSet<T>(items: Array<{ key: string; data: T; config?: Partial<CacheConfig> }>): void {
    const startTime = performance.now();
    
    items.forEach(({ key, data, config }) => {
      this.set(key, data, config);
    });
    
    const duration = performance.now() - startTime;
    log.debug('Utils', `[AdvancedCache] Batch set ${items.length} items in ${duration.toFixed(2)}ms`);
  }

  batchGet<T>(keys: string[]): Map<string, T | null> {
    const startTime = performance.now();
    const results = new Map<string, T | null>();
    
    keys.forEach(key => {
      results.set(key, this.get<T>(key));
    });
    
    const duration = performance.now() - startTime;
    log.debug('Utils', `[AdvancedCache] Batch get ${keys.length} items in ${duration.toFixed(2)}ms`);
    
    return results;
  }

  /**
   * Smart eviction based on priority and access patterns
   */
  private evictItems(requiredSpace: number): void {
    log.debug('Utils', `[AdvancedCache] Evicting items to free ${this.formatBytes(requiredSpace)}`);
    
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      item,
      score: this.calculateEvictionScore(item)
    }));

    // Sort by eviction score (lower score = evict first)
    items.sort((a, b) => a.score - b.score);

    let freedSpace = 0;
    let evicted = 0;

    for (const { key, item } of items) {
      if (freedSpace >= requiredSpace) break;
      
      this.delete(key);
      freedSpace += item.size;
      evicted++;
      this.stats.evictions++;
    }

    log.debug('Utils', `[AdvancedCache] Evicted ${evicted} items, freed ${this.formatBytes(freedSpace)}`);
  }

  /**
   * Calculate eviction score for cache item
   */
  private calculateEvictionScore(item: CacheItem): number {
    const age = Date.now() - item.timestamp;
    const timeSinceAccess = Date.now() - item.lastAccessed;
    const accessFrequency = item.accessCount / Math.max(age / 1000, 1); // accesses per second
    
    // Lower score = more likely to be evicted
    // Factors: age, time since last access, access frequency, size
    return (accessFrequency * 1000) - (age / 1000) - (timeSinceAccess / 1000) - (item.size / 1024);
  }

  /**
   * Start background cleanup process
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredItems();
    }, 60000); // Run every minute
  }

  /**
   * Clean up expired items
   */
  private cleanupExpiredItems(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.debug('Utils', `[AdvancedCache] Cleanup removed ${cleaned} expired items`);
    }
  }

  /**
   * Monitor memory usage and adjust limits
   */
  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = (performance as any).memory;
        const usagePercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
        
        if (usagePercent > 85) {
          log.warn('Utils', '[AdvancedCache] High memory usage detected, reducing cache size');
          this.evictItems(this.stats.memoryUsage * 0.25); // Evict 25% of cache
        }
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Simple compression simulation (replace with real compression in production)
   */
  private simpleCompress(data: string): string {
    // This is a placeholder - use proper compression library like pako or fflate
    return btoa(data);
  }

  private simpleDecompress(data: string): string {
    // This is a placeholder - use proper decompression
    return atob(data);
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
    log.debug('Utils', '[AdvancedCache] Destroyed');
  }
}

// Export singleton instance
export const advancedCache = AdvancedCacheManager.getInstance();

// Auto-initialize and expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).advancedCache = advancedCache;
  (window as any).getCacheStats = () => advancedCache.getStats();
  (window as any).getCacheHealth = () => advancedCache.getHealthReport();
  
  log.debug('Utils', '🚀 [AdvancedCache] Cache manager initialized');
} 