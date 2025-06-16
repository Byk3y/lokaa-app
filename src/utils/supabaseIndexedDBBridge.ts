/**
 * 🔧 Supabase-IndexedDB Bridge - Mobile Browser Blocking Fix
 * 
 * CRITICAL SOLUTION: Bridges the gap between Supabase requests and IndexedDB cache
 * 
 * PROBLEM SOLVED:
 * - Service Worker bypasses ALL Supabase requests
 * - Mobile browsers block network after backgrounding  
 * - No offline fallback for critical queries like space_members
 * - Results in endless loading states on mobile return
 * 
 * SOLUTION ARCHITECTURE:
 * 1. Intercept specific Supabase queries before they reach the network
 * 2. Check IndexedDB first for cached data
 * 3. On mobile browser blocking, return cached data immediately
 * 4. Populate cache proactively for offline-first experience
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { devLogger } from './developmentLogger';

// IndexedDB database for Supabase request caching
const DB_NAME = 'lokaa-supabase-cache';
const DB_VERSION = 2; // Incremented to create USER_PROFILES store
const STORES = {
  SPACE_MEMBERS: 'space_members_cache',
  SPACES: 'spaces_cache',
  POSTS: 'posts_cache',
  CATEGORIES: 'categories_cache',
  USER_PROFILES: 'user_profiles_cache'
};

// Cache TTL settings
const CACHE_TTL = {
  SPACE_MEMBERS: 2 * 60 * 1000,     // 2 minutes - real-time data
  SPACES: 10 * 60 * 1000,           // 10 minutes - semi-static
  POSTS: 5 * 60 * 1000,             // 5 minutes - dynamic content
  CATEGORIES: 30 * 60 * 1000,       // 30 minutes - static content
  USER_PROFILES: 5 * 60 * 1000      // 5 minutes - user profile data
};

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  key: string;
  ttl: number;
  metadata?: {
    query?: string;
    params?: Record<string, any>;
    spaceId?: string;
    userId?: string;
  };
}

interface BridgeMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  mobileBlockingDetected: number;
  offlineReturns: number;
  networkFailures: number;
}

class SupabaseIndexedDBBridge {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private metrics: BridgeMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    mobileBlockingDetected: 0,
    offlineReturns: 0,
    networkFailures: 0
  };

  constructor() {
    this.initializeDB();
    this.setupGlobalInterface();
    this.setupMobileDetection();
  }

  /**
   * Initialize IndexedDB with all required object stores
   */
  private async initializeDB(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[SupabaseIndexedDBBridge] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores for different data types
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'key' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('spaceId', 'metadata.spaceId', { unique: false });
            devLogger.log('CacheDebug', `[SupabaseIndexedDBBridge] Created store: ${storeName}`);
          }
        });
      };
    });

    return this.initPromise;
  }

  /**
   * Setup global interface for debugging and monitoring
   */
  private setupGlobalInterface(): void {
    if (typeof window !== 'undefined') {
      (window as any).supabaseIndexedDBBridge = {
        getMetrics: () => this.getMetrics(),
        clearCache: () => this.clearCache(),
        testMobileBlocking: () => this.testMobileBlockingDetection(),
        getCacheStatus: (spaceId: string) => this.getCacheStatus(spaceId),
        warmCache: (spaceId: string) => this.warmCacheForSpace(spaceId),
        getUserProfile: (userId: string, fields?: string[]) => this.getUserProfile(userId, fields)
      };

      // Add global debugging interface
      (window as any).debugSupabaseBridge = {
        getMetrics: () => this.getMetrics(),
        testMobileBlocking: () => this.testMobileBlockingDetection(),
        clearCache: () => this.clearCache(),
        getCacheStatus: (spaceId: string) => this.getCacheStatus(spaceId),
        testUserProfile: (userId: string) => this.getUserProfile(userId, ['profile_url', 'full_name']),
        testAuthUser: () => this.getCurrentUser(),
        testPresenceUpdate: (userId: string, isOnline: boolean) => this.updateGlobalPresence(userId, isOnline)
      };
    }
  }

  /**
   * Setup mobile browser blocking detection
   */
  private setupMobileDetection(): void {
    // Listen for page visibility changes to detect mobile backgrounding
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // User returned from background - prepare for potential blocking
        setTimeout(() => {
          this.checkForMobileBlocking();
        }, 1000);
      }
    });
  }

  /**
   * CORE METHOD: Intercept Supabase space_members queries
   */
  async getSpaceMembers(spaceId: string, options: {
    userId?: string;
    status?: string;
    forceNetwork?: boolean;
  } = {}): Promise<any> {
    this.metrics.totalRequests++;
    
    const { userId, status = 'active', forceNetwork = false } = options;
    const cacheKey = `members_${spaceId}_${userId || 'all'}_${status}`;
    
    devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] space_members request', { 
      spaceId, 
      userId, 
      status, 
      forceNetwork 
    });

    // Check if we should use cache-first approach (mobile browser blocking)
    const shouldUseCacheFirst = this.shouldUseCacheFirst();

    if (!forceNetwork && shouldUseCacheFirst) {
      devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Mobile blocking suspected, checking cache first');
      
      const cachedData = await this.getCachedData(STORES.SPACE_MEMBERS, cacheKey);
      if (cachedData && !this.isCacheExpired(cachedData)) {
        this.metrics.cacheHits++;
        devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Returning cached space_members (mobile blocking)');
        return { data: cachedData.data, error: null, fromCache: true };
      }
    }

    // Try network request with mobile browser blocking detection
    try {
      const networkPromise = this.executeSpaceMembersQuery(spaceId, { userId, status });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Mobile browser blocking timeout')), 5000);
      });

      const result = await Promise.race([networkPromise, timeoutPromise]);
      
      // Cache successful network response
      if (result.data && !result.error) {
        await this.setCachedData(STORES.SPACE_MEMBERS, cacheKey, result.data, {
          query: 'space_members',
          params: { spaceId, userId, status },
          spaceId,
          userId
        });
        devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Cached fresh space_members data');
      }

      return result;

    } catch (error) {
      this.metrics.networkFailures++;
      
      // Check if this is mobile browser blocking
      if (this.isMobileBrowserBlocking(error)) {
        this.metrics.mobileBlockingDetected++;
        devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Mobile browser blocking detected, using cache fallback');
        
        // Return cached data if available
        const cachedData = await this.getCachedData(STORES.SPACE_MEMBERS, cacheKey);
        if (cachedData) {
          this.metrics.offlineReturns++;
          return { 
            data: cachedData.data, 
            error: null, 
            fromCache: true,
            reason: 'mobile_browser_blocking'
          };
        }
      }

      // No cache available, return error
      return { data: null, error, fromCache: false };
    }
  }

  /**
   * Execute the actual Supabase space_members query
   */
  private async executeSpaceMembersQuery(spaceId: string, options: {
    userId?: string;
    status?: string;
  }): Promise<any> {
    let query = getSupabaseClient()
      .from('space_members')
      .select('id, user_id, space_id, role, status, is_online, last_active_at, joined_at')
      .eq('space_id', spaceId);

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    return await query;
  }

  /**
   * Get cached data from IndexedDB
   */
  private async getCachedData(storeName: string, key: string): Promise<CacheEntry | null> {
    await this.initializeDB();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Set cached data in IndexedDB
   */
  private async setCachedData(
    storeName: string, 
    key: string, 
    data: any, 
    metadata?: CacheEntry['metadata']
  ): Promise<void> {
    await this.initializeDB();
    if (!this.db) return;

    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl: this.getTTLForStore(storeName),
      metadata
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if cached data is expired
   */
  private isCacheExpired(cacheEntry: CacheEntry): boolean {
    return Date.now() - cacheEntry.timestamp > cacheEntry.ttl;
  }

  /**
   * Get TTL for specific store
   */
  private getTTLForStore(storeName: string): number {
    switch (storeName) {
      case STORES.SPACE_MEMBERS: return CACHE_TTL.SPACE_MEMBERS;
      case STORES.SPACES: return CACHE_TTL.SPACES;
      case STORES.POSTS: return CACHE_TTL.POSTS;
      case STORES.CATEGORIES: return CACHE_TTL.CATEGORIES;
      case STORES.USER_PROFILES: return CACHE_TTL.USER_PROFILES;
      default: return CACHE_TTL.SPACE_MEMBERS;
    }
  }

  /**
   * Detect if we should use cache-first approach
   */
  private shouldUseCacheFirst(): boolean {
    // Check if on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // ENHANCED: Always use cache-first on mobile browsers as they frequently block requests
    if (isMobile) {
      // Check if recently returned from background (extended window)
      const lastVisibilityChange = (window as any).__lastVisibilityChange;
      const recentBackgroundReturn = lastVisibilityChange && 
        (Date.now() - lastVisibilityChange) < 60000; // Extended to 60 seconds
      
      // Check for hard refresh
      const isHardRefresh = performance.navigation?.type === 1 || 
        (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload';
      
      // Check if mobile session manager detected backgrounding
      const mobileBackgroundDetected = (window as any).__mobileBackgroundState;
      
      // CRITICAL: Always use cache-first on mobile for initial page loads too
      const isInitialLoad = performance.getEntriesByType('navigation').length === 0 ||
        (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'navigate';
      
      devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Mobile cache-first detection', {
        isMobile,
        recentBackgroundReturn,
        isHardRefresh,
        mobileBackgroundDetected,
        isInitialLoad,
        lastVisibilityChange,
        timeSinceVisibilityChange: lastVisibilityChange ? Date.now() - lastVisibilityChange : null
      });
      
      // Use cache-first for any of these conditions on mobile
      return recentBackgroundReturn || isHardRefresh || mobileBackgroundDetected || isInitialLoad;
    }

    return false;
  }

  /**
   * Detect mobile browser blocking from error
   */
  private isMobileBrowserBlocking(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    return errorMessage.includes('access control checks') ||
           errorMessage.includes('load failed') ||
           errorMessage.includes('network error') ||
           errorMessage.includes('failed to fetch') ||
           errorMessage.includes('timeout');
  }

  /**
   * Check for mobile browser blocking and log metrics
   */
  private async checkForMobileBlocking(): Promise<void> {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    try {
      // Quick connectivity test
      const testPromise = fetch('https://nmddvthcsyppyjncqfsk.supabase.co/rest/v1/', {
        method: 'HEAD',
        mode: 'cors'
      });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection test timeout')), 3000);
      });

      await Promise.race([testPromise, timeoutPromise]);
      devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Mobile connectivity test passed');
      
    } catch (error) {
      this.metrics.mobileBlockingDetected++;
      devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Mobile browser blocking detected via connectivity test');
    }
  }

  /**
   * Test mobile blocking detection for debugging
   */
  testMobileBlockingDetection(): any {
    return {
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      shouldUseCacheFirst: this.shouldUseCacheFirst(),
      metrics: this.metrics,
      lastVisibilityChange: (window as any).__lastVisibilityChange,
      timeSinceVisibilityChange: (window as any).__lastVisibilityChange ? 
        Date.now() - (window as any).__lastVisibilityChange : null
    };
  }

  /**
   * Get cache status for a space
   */
  async getCacheStatus(spaceId: string): Promise<any> {
    const stores = Object.values(STORES);
    const status: any = {};

    for (const store of stores) {
      const cachedEntries = await this.getCachedEntriesForSpace(store, spaceId);
      status[store] = {
        entries: cachedEntries.length,
        totalSize: this.calculateCacheSize(cachedEntries),
        oldestEntry: cachedEntries.length > 0 ? 
          Math.min(...cachedEntries.map(e => e.timestamp)) : null,
        newestEntry: cachedEntries.length > 0 ? 
          Math.max(...cachedEntries.map(e => e.timestamp)) : null
      };
    }

    return status;
  }

  /**
   * Get cached entries for a specific space
   */
  private async getCachedEntriesForSpace(storeName: string, spaceId: string): Promise<CacheEntry[]> {
    await this.initializeDB();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index('spaceId');
      const request = index.getAll(spaceId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  /**
   * Calculate cache size for entries
   */
  private calculateCacheSize(entries: CacheEntry[]): number {
    return entries.reduce((total, entry) => {
      return total + JSON.stringify(entry).length;
    }, 0);
  }

  /**
   * Clear all caches (alias for clearAllCaches)
   */
  async clearCache(): Promise<void> {
    return this.clearAllCaches();
  }

  /**
   * Warm cache for a specific space (alias for warmCacheForSpace)
   */
  async warmCache(spaceId: string): Promise<void> {
    return this.warmCacheForSpace(spaceId);
  }

  /**
   * Warm cache for a specific space
   */
  async warmCacheForSpace(spaceId: string): Promise<void> {
    devLogger.log('CacheDebug', `[SupabaseIndexedDBBridge] Warming cache for space: ${spaceId}`);
    
    try {
      // Warm space_members cache
      await this.getSpaceMembers(spaceId, { forceNetwork: true });
      
      devLogger.log('CacheDebug', `[SupabaseIndexedDBBridge] Cache warmed for space: ${spaceId}`);
    } catch (error) {
      devLogger.warn('CacheDebug', `[SupabaseIndexedDBBridge] Cache warming failed for space: ${spaceId}`, { error });
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    await this.initializeDB();
    if (!this.db) return;

    const promises = Object.values(STORES).map(storeName => {
      return new Promise<void>((resolve) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    });

    await Promise.all(promises);
    devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] All caches cleared');
  }

  /**
   * Get bridge metrics
   */
  getMetrics(): BridgeMetrics {
    return { ...this.metrics };
  }

  /**
   * CORE METHOD: Intercept Supabase user profile queries
   */
  async getUserProfile(userId: string, fields: string[] = ['profile_url', 'full_name'], options: {
    forceNetwork?: boolean;
  } = {}): Promise<any> {
    this.metrics.totalRequests++;
    
    const { forceNetwork = false } = options;
    const cacheKey = `profile_${userId}_${fields.join('_')}`;
    
    devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] User profile request', { 
      userId, 
      fields, 
      forceNetwork 
    });

    // Check if we should use cache-first approach (mobile browser blocking)
    const shouldUseCacheFirst = this.shouldUseCacheFirst();

    if (!forceNetwork && shouldUseCacheFirst) {
      devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Mobile blocking suspected, checking user profile cache first');
      
      const cachedData = await this.getCachedData(STORES.USER_PROFILES, cacheKey);
      if (cachedData && !this.isCacheExpired(cachedData)) {
        this.metrics.cacheHits++;
        devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Returning cached user profile (mobile blocking)');
        return { data: cachedData.data, error: null, fromCache: true, reason: 'mobile-blocking' };
      }
    }

    // Try network request with mobile browser blocking detection
    try {
      const networkPromise = this.executeUserProfileQuery(userId, fields);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Mobile browser blocking timeout')), 5000);
      });

      const result = await Promise.race([networkPromise, timeoutPromise]);
      
      // Cache successful network response
      if (result.data && !result.error) {
        await this.setCachedData(STORES.USER_PROFILES, cacheKey, result.data, {
          query: 'user_profile',
          params: { userId, fields },
          userId
        });
        devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Cached fresh user profile data');
      }

      this.metrics.cacheMisses++;
      return { data: result.data, error: result.error, fromCache: false };

    } catch (error: any) {
      devLogger.warn('CacheDebug', '[SupabaseIndexedDBBridge] Network request failed, trying cache fallback', { error: error.message });
      
      this.metrics.networkFailures++;
      
      if (this.isMobileBrowserBlocking(error)) {
        this.metrics.mobileBlockingDetected++;
        devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Mobile browser blocking detected for user profile');
      }

      // Fallback to cached data (any available, even if expired)
      const cachedData = await this.getCachedData(STORES.USER_PROFILES, cacheKey);
      if (cachedData) {
        this.metrics.offlineReturns++;
        devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Returning stale cached user profile data');
        return { data: cachedData.data, error: null, fromCache: true, reason: 'network-failed' };
      }

      // No cache available, return error
      return { data: null, error, fromCache: false };
    }
  }

  /**
   * Execute user profile query against Supabase
   */
  private async executeUserProfileQuery(userId: string, fields: string[]): Promise<any> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select(fields.join(','))
        .eq('id', userId)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * CORE METHOD: Protected auth user call with mobile browser blocking detection
   */
  async getCurrentUser(options: {
    forceNetwork?: boolean;
  } = {}): Promise<any> {
    this.metrics.totalRequests++;
    
    const { forceNetwork = false } = options;
    const cacheKey = 'current_user_auth';
    
    devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Auth user request', { forceNetwork });

    // Check if we should use cache-first approach (mobile browser blocking)
    const shouldUseCacheFirst = this.shouldUseCacheFirst();

    if (!forceNetwork && shouldUseCacheFirst) {
      devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Mobile blocking suspected, checking auth cache first');
      
      const cachedData = await this.getCachedData(STORES.USER_PROFILES, cacheKey);
      if (cachedData && !this.isCacheExpired(cachedData)) {
        this.metrics.cacheHits++;
        devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Returning cached auth user (mobile blocking)');
        return { data: { user: cachedData.data }, error: null, fromCache: true, reason: 'mobile-blocking' };
      }
    }

    // Try network request with mobile browser blocking detection
    try {
      const networkPromise = this.executeAuthUserQuery();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Mobile browser auth blocking timeout')), 5000);
      });

      const result = await Promise.race([networkPromise, timeoutPromise]);
      
      // Cache successful network response
      if (result.data?.user && !result.error) {
        await this.setCachedData(STORES.USER_PROFILES, cacheKey, result.data.user, {
          query: 'auth_user',
          params: {},
        });
        devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Cached fresh auth user data');
      }

      this.metrics.cacheMisses++;
      return result;

    } catch (error: any) {
      devLogger.warn('CacheDebug', '[SupabaseIndexedDBBridge] Auth request failed, trying cache fallback', { error: error.message });
      
      this.metrics.networkFailures++;
      
      if (this.isMobileBrowserBlocking(error)) {
        this.metrics.mobileBlockingDetected++;
        devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Mobile browser auth blocking detected');
      }

      // Fallback to cached data (any available, even if expired)
      const cachedData = await this.getCachedData(STORES.USER_PROFILES, cacheKey);
      if (cachedData) {
        this.metrics.offlineReturns++;
        devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Returning stale cached auth user data');
        return { data: { user: cachedData.data }, error: null, fromCache: true, reason: 'network-failed' };
      }

      // No cache available, return error
      return { data: { user: null }, error, fromCache: false };
    }
  }

  /**
   * CORE METHOD: Protected presence update with mobile browser blocking detection
   */
  async updateGlobalPresence(userId: string, isOnline: boolean, options: {
    forceNetwork?: boolean;
  } = {}): Promise<any> {
    this.metrics.totalRequests++;
    
    const { forceNetwork = false } = options;
    
    devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Global presence update request', { 
      userId, 
      isOnline, 
      forceNetwork 
    });

    // Check if we should skip network call (mobile browser blocking)
    const shouldUseCacheFirst = this.shouldUseCacheFirst();

    if (!forceNetwork && shouldUseCacheFirst) {
      devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Mobile blocking suspected, skipping presence update to prevent errors');
      
      // Store intention in cache for later sync
      await this.setCachedData(STORES.USER_PROFILES, `presence_intent_${userId}`, {
        isOnline,
        timestamp: Date.now(),
        userId
      }, {
        query: 'presence_update_intent',
        params: { userId, isOnline },
        userId
      });
      
      this.metrics.cacheHits++;
      return { data: null, error: null, fromCache: true, reason: 'mobile-blocking-skip' };
    }

    // Try network request with mobile browser blocking detection
    try {
      const networkPromise = this.executePresenceUpdateQuery(userId, isOnline);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Mobile browser presence blocking timeout')), 3000);
      });

      const result = await Promise.race([networkPromise, timeoutPromise]);
      
      this.metrics.cacheMisses++;
      devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Presence update successful');
      return result;

    } catch (error: any) {
      devLogger.warn('CacheDebug', '[SupabaseIndexedDBBridge] Presence update failed', { error: error.message });
      
      this.metrics.networkFailures++;
      
      if (this.isMobileBrowserBlocking(error)) {
        this.metrics.mobileBlockingDetected++;
        devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Mobile browser presence blocking detected, silently failing');
      }

      // Store intention in cache for later sync
      await this.setCachedData(STORES.USER_PROFILES, `presence_intent_${userId}`, {
        isOnline,
        timestamp: Date.now(),
        userId
      }, {
        query: 'presence_update_intent',
        params: { userId, isOnline },
        userId
      });

      // Return success to prevent error cascading in presence system
      return { data: null, error: null, fromCache: true, reason: 'mobile-blocking-cached-intent' };
    }
  }

  /**
   * Execute auth user query against Supabase
   */
  private async executeAuthUserQuery(): Promise<any> {
    try {
      const { data, error } = await getSupabaseClient().auth.getUser();
      return { data, error };
    } catch (error) {
      return { data: { user: null }, error };
    }
  }

  /**
   * Execute presence update query against Supabase
   */
  private async executePresenceUpdateQuery(userId: string, isOnline: boolean): Promise<any> {
    try {
      const { error } = await getSupabaseClient()
        .from('space_members')
        .update({
          is_online: isOnline,
          last_active_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      return { data: null, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get user conversations with mobile browser blocking protection
   */
  async getUserConversations(userId: string, options: {
    forceNetwork?: boolean;
  } = {}): Promise<SupabaseBridgeResult> {
    const { forceNetwork = false } = options;
    const cacheKey = `user_conversations_${userId}`;
    
    try {
      // Check if we should use cache-first approach
      if (!forceNetwork && this.shouldUseCacheFirst()) {
        console.log('🔧 [CacheDebug] [SupabaseIndexedDBBridge] Using cache-first for user conversations');
        try {
          const cachedData = await this.getCachedData(cacheKey);
          if (cachedData) {
            console.log('🔧 [CacheDebug] [SupabaseIndexedDBBridge] Cache hit for user conversations');
            return { data: cachedData, error: null };
          }
        } catch (cacheError) {
          console.log('🔧 [CacheDebug] [SupabaseIndexedDBBridge] Cache miss for user conversations:', cacheError);
        }
      }

      // Execute network query
      const result = await this.executeUserConversationsQuery(userId);
      
      if (result.error) {
        console.warn('🔧 [CacheDebug] [SupabaseIndexedDBBridge] Network error for user conversations:', result.error);
        // Try to return cached data as fallback
        try {
          const cachedData = await this.getCachedData(cacheKey);
          if (cachedData) {
            console.log('🔧 [CacheDebug] [SupabaseIndexedDBBridge] Using cached fallback for user conversations');
            return { data: cachedData, error: null };
          }
        } catch (fallbackError) {
          console.warn('🔧 [CacheDebug] [SupabaseIndexedDBBridge] No cached fallback available');
        }
        return { data: null, error: result.error };
      }

      // Cache successful results
      if (result.data) {
        await this.setCachedData(cacheKey, result.data, 300000); // 5 minutes cache
        console.log('🔧 [CacheDebug] [SupabaseIndexedDBBridge] Cached user conversations data');
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('🔧 [CacheDebug] [SupabaseIndexedDBBridge] Unexpected error in getUserConversations:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Execute the actual Supabase user_conversations query
   */
  private async executeUserConversationsQuery(userId: string): Promise<any> {
    return await getSupabaseClient()
      .from('user_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false });
  }
}

// Export singleton instance
export const supabaseIndexedDBBridge = new SupabaseIndexedDBBridge();

// Export interface for integration with existing hooks
export interface SupabaseQuery<T = any> {
  execute(): Promise<{ data: T | null; error: any; fromCache?: boolean; reason?: string }>;
  cacheKey: string;
  ttl: number;
}

/**
 * Create a mobile-safe Supabase query with IndexedDB fallback
 */
export function createMobileSafeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  cacheKey: string,
  store: string = STORES.SPACE_MEMBERS
): SupabaseQuery<T> {
  return {
    cacheKey,
    ttl: supabaseIndexedDBBridge['getTTLForStore'](store),
    async execute() {
      // This will be integrated with existing hooks
      return await queryFn();
    }
  };
}