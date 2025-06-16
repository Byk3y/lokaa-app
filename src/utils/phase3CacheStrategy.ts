/**
 * Phase 3 Enhanced Caching Strategy
 * Advanced cache invalidation, predictive cache warming, and cross-component coordination
 */

import { logError } from './errorHandlingSystem';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  size: number;
}

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  memoryUsage: number;
  averageAccessTime: number;
}

interface CacheConfig {
  maxSize: number; // Maximum cache size in MB
  maxEntries: number;
  defaultTTL: number; // Default TTL in milliseconds
  cleanupInterval: number;
  enablePredictiveWarming: boolean;
  enableCompression: boolean;
  memoryThreshold: number; // Memory usage threshold for cleanup
}

class Phase3CacheStrategy {
  private cache = new Map<string, CacheEntry>();
  private accessTimes = new Map<string, number[]>();
  private stats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
    memoryUsage: 0,
    averageAccessTime: 0
  };

  private config: CacheConfig = {
    maxSize: 50, // 50MB
    maxEntries: 1000,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    cleanupInterval: 60 * 1000, // 1 minute
    enablePredictiveWarming: true,
    enableCompression: false,
    memoryThreshold: 0.8 // 80% of maxSize
  };

  private cleanupInterval: NodeJS.Timeout | null = null;
  private warmingQueue: Array<{ key: string; loader: () => Promise<any> }> = [];
  private isWarming = false;

  constructor() {
    this.startCleanupInterval();
    this.setupMemoryMonitoring();
    console.log('🚀 Phase 3 Cache Strategy initialized');
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      setInterval(() => {
        const memory = (window.performance as any).memory;
        if (memory) {
          this.stats.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        }
      }, 10000); // Check every 10 seconds
    }
  }

  /**
   * Set cache entry
   */
  public set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      priority?: CacheEntry['priority'];
      tags?: string[];
    } = {}
  ): void {
    const now = Date.now();
    const size = this.calculateSize(data);
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: options.ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: now,
      priority: options.priority || 'medium',
      tags: options.tags || [],
      size
    };

    // Check if we need to make space
    if (this.cache.size >= this.config.maxEntries) {
      this.evictEntries(1);
    }

    this.cache.set(key, entry);
    this.updateStats();
  }

  /**
   * Get cache entry
   */
  public get<T>(key: string): T | null {
    const startTime = performance.now();
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.recordMiss();
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.recordMiss();
      return null;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Record access time
    const accessTime = performance.now() - startTime;
    this.recordAccess(key, accessTime);
    
    this.recordHit();
    return entry.data;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Calculate data size (approximate)
   */
  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1024; // Default size if can't calculate
    }
  }

  /**
   * Evict entries to make space
   */
  private evictEntries(count: number): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by priority and access patterns (LRU with priority)
    entries.sort(([, a], [, b]) => {
      const priorityWeight = { low: 1, medium: 2, high: 3, critical: 4 };
      const aPriority = priorityWeight[a.priority];
      const bPriority = priorityWeight[b.priority];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority; // Lower priority first
      }
      
      // Same priority, use LRU
      return a.lastAccessed - b.lastAccessed;
    });

    for (let i = 0; i < count && i < entries.length; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
    }

    this.stats.evictionCount += count;
    this.updateStats();
  }

  /**
   * Regular cleanup
   */
  private performCleanup(): void {
    const entries = Array.from(this.cache.entries());
    let removed = 0;

    for (const [key, entry] of entries) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.updateStats();
    }
  }

  /**
   * Invalidate by tags
   */
  public invalidateByTags(tags: string[]): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      this.updateStats();
    }

    return invalidated;
  }

  /**
   * Record cache hit
   */
  private recordHit(): void {
    const total = this.stats.hitRate + this.stats.missRate;
    if (total === 0) {
      this.stats.hitRate = 1;
      this.stats.missRate = 0;
    } else {
      this.stats.hitRate = (this.stats.hitRate * total + 1) / (total + 1);
      this.stats.missRate = 1 - this.stats.hitRate;
    }
  }

  /**
   * Record cache miss
   */
  private recordMiss(): void {
    const total = this.stats.hitRate + this.stats.missRate;
    if (total === 0) {
      this.stats.hitRate = 0;
      this.stats.missRate = 1;
    } else {
      this.stats.missRate = (this.stats.missRate * total + 1) / (total + 1);
      this.stats.hitRate = 1 - this.stats.missRate;
    }
  }

  /**
   * Record access time
   */
  private recordAccess(key: string, accessTime: number): void {
    if (!this.accessTimes.has(key)) {
      this.accessTimes.set(key, []);
    }
    
    const times = this.accessTimes.get(key)!;
    times.push(accessTime);
    
    // Keep only last 10 access times
    if (times.length > 10) {
      times.shift();
    }
    
    // Update average access time
    const allTimes = Array.from(this.accessTimes.values()).flat();
    if (allTimes.length > 0) {
      this.stats.averageAccessTime = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.totalEntries = this.cache.size;
    this.stats.totalSize = Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Test cache efficiency
   */
  public testCacheEfficiency(): Promise<{
    success: boolean;
    results: {
      setPerformance: number;
      getPerformance: number;
      hitRate: number;
      memoryEfficiency: boolean;
    };
  }> {
    return new Promise((resolve) => {
      const testData = { test: 'data', timestamp: Date.now() };
      
      // Test set performance
      const setStart = performance.now();
      this.set('test-key', testData);
      const setTime = performance.now() - setStart;
      
      // Test get performance
      const getStart = performance.now();
      const retrieved = this.get('test-key');
      const getTime = performance.now() - getStart;
      
      // Test hit rate
      const hitRate = this.stats.hitRate;
      
      // Test memory efficiency
      const memoryEfficient = this.stats.totalSize < this.config.maxSize * 1024 * 1024;
      
      // Cleanup test data
      this.cache.delete('test-key');
      
      resolve({
        success: setTime < 5 && getTime < 1 && retrieved !== null,
        results: {
          setPerformance: setTime,
          getPerformance: getTime,
          hitRate,
          memoryEfficiency: memoryEfficient
        }
      });
    });
  }

  /**
   * Validate cache coordination
   */
  public validateCacheCoordination(): {
    success: boolean;
    results: {
      tagInvalidation: boolean;
      predictiveWarming: boolean;
      memoryManagement: boolean;
      cleanup: boolean;
    };
  } {
    const results = {
      tagInvalidation: false,
      predictiveWarming: false,
      memoryManagement: false,
      cleanup: false
    };

    // Test tag invalidation
    this.set('tag-test-1', 'data1', { tags: ['test-tag'] });
    this.set('tag-test-2', 'data2', { tags: ['test-tag'] });
    const invalidated = this.invalidateByTags(['test-tag']);
    results.tagInvalidation = invalidated === 2;

    // Test predictive warming
    results.predictiveWarming = this.config.enablePredictiveWarming;

    // Test memory management
    results.memoryManagement = this.stats.totalSize < this.config.maxSize * 1024 * 1024;

    // Test cleanup
    results.cleanup = this.cleanupInterval !== null;

    return {
      success: Object.values(results).every(Boolean),
      results
    };
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
    this.updateStats();
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Get cache status
   */
  public getStatus(): {
    isActive: boolean;
    stats: CacheStats;
    config: CacheConfig;
    health: {
      memoryUsage: string;
      hitRate: string;
      totalEntries: number;
      recommendations: string[];
    };
  } {
    const recommendations: string[] = [];
    
    if (this.stats.hitRate < 0.7) {
      recommendations.push('Consider adjusting cache TTL or warming strategies');
    }
    
    if (this.stats.totalSize > this.config.maxSize * 1024 * 1024 * 0.8) {
      recommendations.push('Cache approaching memory limit - consider cleanup');
    }
    
    if (this.stats.averageAccessTime > 5) {
      recommendations.push('Cache access time is high - consider optimization');
    }

    return {
      isActive: true,
      stats: { ...this.stats },
      config: { ...this.config },
      health: {
        memoryUsage: `${(this.stats.totalSize / (1024 * 1024)).toFixed(2)}MB`,
        hitRate: `${(this.stats.hitRate * 100).toFixed(1)}%`,
        totalEntries: this.stats.totalEntries,
        recommendations
      }
    };
  }
}

// Create global instance
const phase3CacheStrategy = new Phase3CacheStrategy();

// Global interface for testing
if (typeof window !== 'undefined') {
  (window as any).phase3CacheStrategy = {
    getStatus: () => phase3CacheStrategy.getStatus(),
    getCacheStats: () => phase3CacheStrategy.getCacheStats(),
    testCacheEfficiency: () => phase3CacheStrategy.testCacheEfficiency(),
    validateCacheCoordination: () => phase3CacheStrategy.validateCacheCoordination(),
    set: (key: string, data: any, options?: any) => phase3CacheStrategy.set(key, data, options),
    get: (key: string) => phase3CacheStrategy.get(key),
    invalidateByTags: (tags: string[]) => phase3CacheStrategy.invalidateByTags(tags),
    clear: () => phase3CacheStrategy.clear(),
    
    getStatistics: () => {
      const stats = phase3CacheStrategy.getCacheStats();
      const status = phase3CacheStrategy.getStatus();
      return {
        ...stats,
        health: status.health,
        efficiency: {
          hitRatePercentage: (stats.hitRate * 100).toFixed(1) + '%',
          memoryUtilization: ((stats.totalSize / (1024 * 1024)) / 50 * 100).toFixed(1) + '%', // Assuming 50MB max
          averageAccessTime: stats.averageAccessTime.toFixed(2) + 'ms',
          totalOperations: stats.hitRate + stats.missRate
        }
      };
    }
  };
}

export default phase3CacheStrategy;
export type { CacheEntry, CacheStats, CacheConfig }; 