import { log } from '@/utils/logger';
/**
 * 🧠 SMART AVATAR CACHING SERVICE
 * 
 * High-performance caching system with:
 * - LRU (Least Recently Used) cache with intelligent eviction
 * - Space member preloading for faster UX
 * - Cache invalidation on updates
 * - Performance monitoring and analytics
 * - Background prefetching and optimization
 */

import { getSupabaseClient } from '@/integrations/supabase/client';

interface CacheEntry {
  url: string;
  timestamp: number;
  size: string;
  accessCount: number;
  lastAccessed: number;
  isPreloaded?: boolean;
}

interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  cacheSize: number;
  preloadCount: number;
  evictionCount: number;
}

interface PreloadResult {
  loaded: number;
  failed: number;
  cached: number;
  duration: number;
}

export class AvatarCacheService {
  private static cache = new Map<string, CacheEntry>();
  private static readonly CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours
  private static readonly MAX_ENTRIES = 1000; // Increased for better performance
  private static readonly PRELOAD_BATCH_SIZE = 10;
  
  // 🚀 NEW: Pending load tracking to prevent duplicate requests
  private static pendingLoads = new Map<string, Promise<void>>();
  
  // Performance tracking
  private static stats: CacheStats = {
    totalEntries: 0,
    hitRate: 0,
    totalHits: 0,
    totalMisses: 0,
    cacheSize: 0,
    preloadCount: 0,
    evictionCount: 0
  };

  /**
   * 🎯 Get cached avatar with smart LRU management
   */
  static getCachedAvatar(userId: string, size = 'md'): string | null {
    const key = `${userId}-${size}`;
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.totalMisses++;
      this.updateHitRate();
      return null;
    }

    // Check expiration
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      this.stats.totalMisses++;
      this.updateHitRate();
      return null;
    }

    // Update LRU data
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.totalHits++;
    this.updateHitRate();

    return entry.url;
  }

  /**
   * 🎯 Cache avatar with intelligent storage
   */
  static setCachedAvatar(userId: string, url: string, size = 'md', isPreloaded = false): void {
    const key = `${userId}-${size}`;

    // LRU eviction if at capacity
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry = {
      url,
      timestamp: Date.now(),
      size,
      accessCount: 1,
      lastAccessed: Date.now(),
      isPreloaded
    };

    this.cache.set(key, entry);
    
    if (isPreloaded) {
      this.stats.preloadCount++;
    }
    
    this.updateStats();
  }

  /**
   * 🚀 Preload avatars for current space members (MAJOR PERFORMANCE BOOST)
   * Now optimized for instant display + background preloading + incognito mode support
   */
  static async preloadSpaceAvatars(spaceId: string): Promise<PreloadResult> {
    const startTime = Date.now();
    let loaded = 0, failed = 0, cached = 0;

    try {
      // Only log in development with verbose flag
      if (process.env.NODE_ENV === 'development' && (window as any).__AVATAR_VERBOSE_LOGS__) {
        log.debug('Service', `🚀 [AvatarCache] Starting preload for space: ${spaceId}`);
      }

      // Get space members with avatars - using separate queries to avoid foreign key issues
      const supabase = getSupabaseClient();
      
      // First get space member user IDs
      const { data: spaceMembers, error: membersError } = await supabase
        .from('space_members')
        .select('user_id')
        .eq('space_id', spaceId);

      if (membersError) {
        log.error('Service', '❌ [AvatarCache] Failed to fetch space members:', membersError);
        return { loaded: 0, failed: 1, cached: 0, duration: Date.now() - startTime };
      }

      if (!spaceMembers?.length) {
        // Silent success for empty spaces
        return { loaded: 0, failed: 0, cached: 0, duration: Date.now() - startTime };
      }

      // Get user details for all member IDs
      const userIds = spaceMembers.map(m => m.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, avatar_url')
        .in('id', userIds)
        .not('avatar_url', 'is', null);

      if (usersError) {
        log.error('Service', '❌ [AvatarCache] Failed to fetch user avatars:', usersError);
        return { loaded: 0, failed: 1, cached: 0, duration: Date.now() - startTime };
      }

      if (!users?.length) {
        // Silent success for no avatars
        return { loaded: 0, failed: 0, cached: 0, duration: Date.now() - startTime };
      }

      // 🚀 OPTIMIZATION: Separate cached vs new avatars for instant display
      const cachedAvatars: any[] = [];
      const newAvatars: any[] = [];

      users.forEach((user: any) => {
        if (this.getCachedAvatar(user.id, 'md')) {
          cachedAvatars.push(user);
          cached++;
        } else {
          newAvatars.push(user);
        }
      });

      // Only log success in development with minimal info
      if (process.env.NODE_ENV === 'development') {
        log.debug('Service', `⚡ [AvatarCache] Instant cache status: ${cached} cached, ${newAvatars.length} need loading`);
      }

      // 🚀 INSTANT RETURN: If we have cached avatars, return immediately
      // New avatars will be loaded in background
      if (cached > 0 && newAvatars.length === 0) {
        const duration = Date.now() - startTime;
        if (process.env.NODE_ENV === 'development') {
          log.debug('Service', `⚡ [AvatarCache] INSTANT complete: 0 loaded, ${cached} cached, 0 failed (${duration}ms)`);
        }
        return { loaded: 0, failed: 0, cached, duration };
      }

      // 🔄 BACKGROUND LOADING: Load new avatars asynchronously
      if (newAvatars.length > 0) {
        // 🚀 FIX FOR INCOGNITO MODE: If no cache exists, load some avatars synchronously first
        const isEmptyCache = cached === 0;
        const shouldLoadSomeSync = isEmptyCache && newAvatars.length > 0;
        
        if (shouldLoadSomeSync) {
          // Load first 3 avatars synchronously for immediate display in incognito mode
          const syncAvatars = newAvatars.slice(0, 3);
          const backgroundAvatars = newAvatars.slice(3);
          
          if (process.env.NODE_ENV === 'development') {
            log.debug('Service', `🔄 [AvatarCache] INCOGNITO MODE: Loading ${syncAvatars.length} avatars synchronously, ${backgroundAvatars.length} in background`);
          }
          
          // Load first batch synchronously
          try {
            const syncResult = await this.loadAvatarsSynchronously(syncAvatars);
            loaded += syncResult.loaded;
            failed += syncResult.failed;
            
            if (process.env.NODE_ENV === 'development') {
              log.debug('Service', `⚡ [AvatarCache] SYNC COMPLETE: ${syncResult.loaded} loaded, ${syncResult.failed} failed`);
            }
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              log.warn('Service', '⚠️ [AvatarCache] Sync loading failed:', error);
            }
            failed += syncAvatars.length;
          }
          
          // Load remaining avatars in background
          if (backgroundAvatars.length > 0) {
            this.loadAvatarsInBackground(backgroundAvatars).then(result => {
              if (process.env.NODE_ENV === 'development') {
                log.debug('Service', `🔄 [AvatarCache] Background loading complete: ${result.loaded} loaded, ${result.failed} failed`);
              }
            }).catch(error => {
              if (process.env.NODE_ENV === 'development') {
                log.warn('Service', '⚠️ [AvatarCache] Background loading failed:', error);
              }
            });
          }
        } else {
          // Normal background loading for when we have some cache
          this.loadAvatarsInBackground(newAvatars).then(result => {
          if (process.env.NODE_ENV === 'development') {
            log.debug('Service', `🔄 [AvatarCache] Background loading complete: ${result.loaded} loaded, ${result.failed} failed`);
          }
        }).catch(error => {
          if (process.env.NODE_ENV === 'development') {
            log.warn('Service', '⚠️ [AvatarCache] Background loading failed:', error);
          }
        });
        }

        // Return with current status
        const duration = Date.now() - startTime;
        if (process.env.NODE_ENV === 'development') {
          if (shouldLoadSomeSync) {
            log.debug('Service', `⚡ [AvatarCache] HYBRID LOADING: ${loaded} loaded, ${cached} cached, ${failed} failed (${duration}ms) + ${newAvatars.length - loaded} loading in background`);
          } else {
            log.debug('Service', `⚡ [AvatarCache] INSTANT with background: ${loaded} loaded, ${cached} cached, ${failed} failed (${duration}ms) + ${newAvatars.length} loading in background`);
          }
        }
        return { loaded, failed, cached, duration };
      }

      const duration = Date.now() - startTime;
      
      // Only log success in development with minimal info
      if (process.env.NODE_ENV === 'development') {
        log.debug('Service', `✅ [AvatarCache] Preload complete: ${loaded} loaded, ${cached} cached, ${failed} failed (${duration}ms)`);
      }

      return { loaded, failed, cached, duration };
    } catch (error) {
      log.error('Service', '❌ [AvatarCache] Preload failed:', error);
      return { loaded: 0, failed: 1, cached: 0, duration: Date.now() - startTime };
    }
  }

  /**
   * 🔄 Load avatars in background without blocking UI
   */
  private static async loadAvatarsInBackground(avatars: any[]): Promise<{ loaded: number; failed: number }> {
    let loaded = 0, failed = 0;

    try {
      // Process in smaller batches for background loading
      const batchSize = 5; // Smaller batches for background
      for (let i = 0; i < avatars.length; i += batchSize) {
        const batch = avatars.slice(i, i + batchSize);
        
        const promises = batch.map(async (user: any) => {
          try {
            const userId = user.id;
            const avatarUrl = user.avatar_url;

            if (!avatarUrl) return;

            // Preload image in background
            await this.preloadImage(avatarUrl);
            
            // Cache for multiple sizes
            this.setCachedAvatar(userId, avatarUrl, 'sm', true);
            this.setCachedAvatar(userId, avatarUrl, 'md', true);
            this.setCachedAvatar(userId, avatarUrl, 'lg', true);
            
            loaded++;
          } catch (error) {
            failed++;
            // Only log errors in development
            if (process.env.NODE_ENV === 'development') {
              log.warn('Service', '⚠️ [AvatarCache] Background load failed for avatar:', error);
            }
          }
        });

        await Promise.all(promises);

        // Small delay between batches to not overwhelm the browser
        if (i + batchSize < avatars.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      return { loaded, failed };
    } catch (error) {
      log.error('Service', '❌ [AvatarCache] Background loading failed:', error);
      return { loaded, failed: failed + 1 };
    }
  }

  /**
   * 🖼️ Preload individual image with deduplication
   * Prevents multiple simultaneous requests for the same URL
   * ✅ FIXED: Fully atomic check-and-set using placeholder Promise pattern
   */
  private static preloadImage(url: string): Promise<void> {
    // ✅ ATOMIC CHECK: Check if this image is already being loaded
    let existingLoad = this.pendingLoads.get(url);
    if (existingLoad) {
      return existingLoad;
    }

    // ✅ CRITICAL FIX: Create placeholder Promise with deferred resolution
    // Store it IMMEDIATELY to ensure atomic check-and-set
    // This prevents race conditions where multiple calls pass the check before any Promise is stored
    let resolvePromise: () => void;
    let rejectPromise: (error: Error) => void;
    
    const loadPromise = new Promise<void>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    // ✅ ATOMIC SET: Store Promise IMMEDIATELY before creating Image object
    // This ensures that if another call happens now, it will find this Promise
    this.pendingLoads.set(url, loadPromise);

    // ✅ NOW create Image object and set up handlers
    // By this point, the Promise is already stored, so concurrent calls will find it
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      this.pendingLoads.delete(url); // Remove from pending when complete
      resolvePromise!();
    };
    
    img.onerror = () => {
      this.pendingLoads.delete(url); // Remove from pending on error
      rejectPromise!(new Error(`Failed to load image: ${url}`));
    };
    
    // ✅ NOW set src - this triggers the actual HTTP request
    // The Promise is already stored, so deduplication is guaranteed
    img.src = url;
    
    return loadPromise;
  }

  /**
   * 🚀 Load image with deduplication (public API for components)
   * Returns a Promise that resolves when image is loaded
   * Multiple components requesting the same URL will share the same Promise
   */
  static loadImageWithDeduplication(url: string): Promise<void> {
    if (!url) {
      return Promise.reject(new Error('Image URL is required'));
    }

    // Check if already cached in browser (quick check)
    // Note: Browser cache will still help, but we deduplicate requests
    return this.preloadImage(url);
  }

  /**
   * 🗑️ Smart LRU eviction
   */
  private static evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    // Find least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictionCount++;
      log.debug('Service', `🗑️ [AvatarCache] Evicted LRU entry: ${oldestKey}`);
    }
  }

  /**
   * 🧹 Clear cache for specific user (on avatar update)
   */
  static invalidateUser(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${userId}-`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    log.debug('Service', `🧹 [AvatarCache] Invalidated ${keysToDelete.length} entries for user: ${userId}`);
  }

  /**
   * 🧹 Clear cache for entire space (on space changes)
   */
  static async invalidateSpace(spaceId: string): Promise<void> {
    try {
      // Get all space members
      const supabase = getSupabaseClient();
      const { data: members } = await supabase
        .from('space_members')
        .select('user_id')
        .eq('space_id', spaceId);

      if (members?.length) {
        members.forEach(member => {
          this.invalidateUser(member.user_id);
        });
        log.debug('Service', `🧹 [AvatarCache] Invalidated cache for ${members.length} space members`);
      }
    } catch (error) {
      log.warn('Service', '⚠️ [AvatarCache] Failed to invalidate space cache:', error);
    }
  }

  /**
   * 📊 Performance analytics
   */
  static getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 📊 Get detailed cache information
   */
  static getCacheInfo(): {
    entries: Array<{key: string, entry: CacheEntry}>,
    stats: CacheStats,
    recommendations: string[]
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({ key, entry }));
    const stats = this.getStats();
    const recommendations = this.generateRecommendations();

    return { entries, stats, recommendations };
  }

  /**
   * 🎯 Generate performance recommendations
   */
  private static generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.stats.hitRate < 0.7) {
      recommendations.push('Consider increasing cache size or preloading more aggressively');
    }
    
    if (this.stats.evictionCount > this.stats.totalEntries * 0.1) {
      recommendations.push('Cache eviction rate is high - consider increasing MAX_ENTRIES');
    }
    
    if (this.stats.preloadCount < this.stats.totalEntries * 0.3) {
      recommendations.push('Low preload usage - consider preloading space members more frequently');
    }

    return recommendations;
  }

  /**
   * 🔧 Utility methods
   */
  private static updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = total > 0 ? this.stats.totalHits / total : 0;
  }

  private static updateStats(): void {
    this.stats.totalEntries = this.cache.size;
    this.stats.cacheSize = this.estimateCacheSize();
    this.updateHitRate();
  }

  private static estimateCacheSize(): number {
    // Rough estimate: 200 bytes per entry (URL + metadata)
    return this.cache.size * 200;
  }

  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 🎯 Initialize cache for a space (call this when user enters a space)
   */
  static async initializeSpace(spaceId: string): Promise<void> {
    log.debug('Service', `🚀 [AvatarCache] Initializing cache for space: ${spaceId}`);
    await this.preloadSpaceAvatars(spaceId);
  }

  /**
   * 🧪 Test cache performance
   */
  static runPerformanceTest(): void {
    log.debug('Service', '🧪 [AvatarCache] Performance Test Results:');
    log.debug('Service', '📊 Cache Stats:', this.getStats());
    log.debug('Service', '💡 Recommendations:', this.generateRecommendations());
  }

  /**
   * 🔄 Load avatars synchronously for incognito mode (blocking but fast)
   */
  private static async loadAvatarsSynchronously(avatars: any[]): Promise<{ loaded: number; failed: number }> {
    let loaded = 0, failed = 0;

    try {
      // Load all avatars in parallel but wait for completion
      const promises = avatars.map(async (user: any) => {
        try {
          const userId = user.id;
          const avatarUrl = user.avatar_url;

          if (!avatarUrl) return;

          // Preload image synchronously
          await this.preloadImage(avatarUrl);
          
          // Cache for multiple sizes
          this.setCachedAvatar(userId, avatarUrl, 'sm', true);
          this.setCachedAvatar(userId, avatarUrl, 'md', true);
          this.setCachedAvatar(userId, avatarUrl, 'lg', true);
          
          loaded++;
        } catch (error) {
          failed++;
          // Only log errors in development
          if (process.env.NODE_ENV === 'development') {
            log.warn('Service', '⚠️ [AvatarCache] Sync load failed for avatar:', error);
          }
        }
      });

      await Promise.all(promises);
      return { loaded, failed };
    } catch (error) {
      log.error('Service', '❌ [AvatarCache] Synchronous loading failed:', error);
      return { loaded, failed: failed + 1 };
    }
  }
}

// 🧪 Expose globally for testing in development
if (typeof window !== 'undefined') {
  (window as any).AvatarCacheService = AvatarCacheService;
} 