import { log } from '@/utils/logger';
/**
 * Simple Unified Cache System
 * 
 * Replaces 8+ complex cache systems with a single, clean implementation.
 * Features: Memory + localStorage + TTL + simple invalidation
 * 
 * This is Phase 3 of the mobile app optimization - cache consolidation.
 */

interface CacheItem {
  value: any;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number;
  persist?: boolean;
}

interface CacheStats {
  memoryItems: number;
  storageItems: number;
  totalItems: number;
  memoryUsage: number;
}

export class SimpleCache {
  // Simplified TTL configuration (instead of 15+ different values)
  public static readonly TTL = {
    SHORT: 2 * 60 * 1000,    // 2 minutes - frequently changing data
    MEDIUM: 10 * 60 * 1000,  // 10 minutes - moderately stable data  
    LONG: 30 * 60 * 1000     // 30 minutes - stable data
  } as const;

  private memory = new Map<string, CacheItem>();
  
  /**
   * Set cache item
   */
  set(key: string, value: any, options: CacheOptions = {}): void {
    const { ttl = SimpleCache.TTL.MEDIUM, persist = true } = options;
    
    const item: CacheItem = {
      value,
      timestamp: Date.now(),
      ttl
    };

    // Always set in memory for fast access
    this.memory.set(key, item);

    // Persist to localStorage if requested
    if (persist) {
      this.setInStorage(key, item);
    }
  }

  /**
   * Get cache item
   */
  get(key: string): any {
    // Try memory first (fastest)
    let item = this.memory.get(key);
    if (item) {
      if (this.isExpired(item)) {
        this.memory.delete(key);
      } else {
        return item.value;
      }
    }

    // Try localStorage (persistent)
    item = this.getFromStorage(key);
    if (item) {
      if (this.isExpired(item)) {
        this.removeFromStorage(key);
        return null;
      }
      
      // Restore to memory for future fast access
      this.memory.set(key, item);
      return item.value;
    }

    return null;
  }

  /**
   * Invalidate (remove) cache item
   */
  invalidate(key: string): void {
    this.memory.delete(key);
    this.removeFromStorage(key);
  }

  /**
   * Clear cache by pattern or all
   */
  clear(pattern?: string): void {
    if (pattern) {
      // Clear by pattern
      const memoryKeys = Array.from(this.memory.keys()).filter(key => key.includes(pattern));
      memoryKeys.forEach(key => this.memory.delete(key));

      const storageKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('cache:') && key.includes(pattern));
      storageKeys.forEach(key => localStorage.removeItem(key));
    } else {
      // Clear all
      this.memory.clear();
      const storageKeys = Object.keys(localStorage).filter(key => key.startsWith('cache:'));
      storageKeys.forEach(key => localStorage.removeItem(key));
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const memorySize = this.memory.size;
    const storageKeys = Object.keys(localStorage).filter(key => key.startsWith('cache:'));
    
    return {
      memoryItems: memorySize,
      storageItems: storageKeys.length,
      totalItems: memorySize + storageKeys.length,
      memoryUsage: JSON.stringify([...this.memory.entries()]).length
    };
  }

  /**
   * Clean up expired items
   */
  cleanup(): number {
    let cleanedCount = 0;

    // Clean memory
    for (const [key, item] of this.memory.entries()) {
      if (this.isExpired(item)) {
        this.memory.delete(key);
        cleanedCount++;
      }
    }

    // Clean localStorage
    const storageKeys = Object.keys(localStorage).filter(key => key.startsWith('cache:'));
    for (const key of storageKeys) {
      const item = this.getFromStorage(key.replace('cache:', ''));
      if (!item || this.isExpired(item)) {
        localStorage.removeItem(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  // Private helper methods

  private isExpired(item: CacheItem): boolean {
    return (Date.now() - item.timestamp) > item.ttl;
  }

  private setInStorage(key: string, item: CacheItem): void {
    try {
      localStorage.setItem(`cache:${key}`, JSON.stringify(item));
    } catch (error) {
      log.warn('Utils', '[SimpleCache] localStorage set failed:', error);
    }
  }

  private getFromStorage(key: string): CacheItem | null {
    try {
      const item = localStorage.getItem(`cache:${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      log.warn('Utils', '[SimpleCache] localStorage get failed:', error);
      return null;
    }
  }

  private removeFromStorage(key: string): void {
    localStorage.removeItem(`cache:${key}`);
  }
}

// Create singleton instance
export const simpleCache = new SimpleCache();

// Auto-cleanup every 5 minutes
setInterval(() => {
  const cleaned = simpleCache.cleanup();
  if (cleaned > 0) {
    log.debug('Utils', `🧹 [SimpleCache] Auto-cleanup removed ${cleaned} expired items`);
  }
}, 5 * 60 * 1000);

// Expose globally for debugging
if (typeof window !== 'undefined') {
  (window as any).simpleCache = simpleCache;
  log.debug('Utils', '💾 [SimpleCache] Unified cache system initialized');
} 