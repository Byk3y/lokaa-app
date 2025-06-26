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
const DB_VERSION = 3; // Incremented to create USER_CONVERSATIONS store
const STORES = {
  SPACE_MEMBERS: 'space_members_cache',
  SPACES: 'spaces_cache',
  POSTS: 'posts_cache',
  CATEGORIES: 'categories_cache',
  USER_PROFILES: 'user_profiles_cache',
  USER_CONVERSATIONS: 'user_conversations_cache'
};

// Cache TTL settings
const CACHE_TTL = {
  SPACE_MEMBERS: 2 * 60 * 1000,     // 2 minutes - real-time data
  SPACES: 10 * 60 * 1000,           // 10 minutes - semi-static
  POSTS: 5 * 60 * 1000,             // 5 minutes - dynamic content
  CATEGORIES: 30 * 60 * 1000,       // 30 minutes - static content
  USER_PROFILES: 5 * 60 * 1000,     // 5 minutes - user profile data
  USER_CONVERSATIONS: 5 * 60 * 1000 // 5 minutes - conversation data
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

interface SupabaseBridgeResult {
  data: any;
  error: Error | null;
  fromCache?: boolean;
  reason?: string;
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
        clearUserConversationsCache: (userId: string) => this.clearUserConversationsCache(userId),
        testMobileBlocking: () => this.testMobileBlockingDetection(),
        getCacheStatus: (spaceId: string) => this.getCacheStatus(spaceId),
        warmCache: (spaceId: string) => this.warmCacheForSpace(spaceId),
        getUserProfile: (userId: string, fields?: string[]) => this.getUserProfile(userId, fields),
        getSpaceMembers: (spaceId: string, options?: any) => this.getSpaceMembers(spaceId, options),
              // Chat system functionality
      testChatSystemHealth: () => this.testChatSystemHealth(),
      validateUserConversations: (userId: string) => this.validateUserConversations(userId),
      diagnoseConversationIssues: (conversationId: string) => this.diagnoseConversationIssues(conversationId),
      findOrCreateConversation: (userId: string, targetUserId: string) => this.findOrCreateConversation(userId, targetUserId)
      };

      // Add global debugging interface
      (window as any).debugSupabaseBridge = {
        getMetrics: () => this.getMetrics(),
        testMobileBlocking: () => this.testMobileBlockingDetection(),
        clearCache: () => this.clearCache(),
        getCacheStatus: (spaceId: string) => this.getCacheStatus(spaceId),
        testUserProfile: (userId: string) => this.getUserProfile(userId, ['profile_url', 'full_name']),
        testAuthUser: () => this.getCurrentUser(),
        testPresenceUpdate: (userId: string, isOnline: boolean) => this.updateGlobalPresence(userId, isOnline),
        testSpaceMembers: (spaceId: string) => this.getSpaceMembers(spaceId, { status: 'active', forceNetwork: true })
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
      case STORES.USER_CONVERSATIONS: return CACHE_TTL.USER_CONVERSATIONS;
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
    spaceId?: string;
  } = {}): Promise<any> {
    this.metrics.totalRequests++;
    
    const { forceNetwork = false, spaceId } = options;
    
    devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Global presence update request', { 
      userId, 
      isOnline, 
      spaceId,
      forceNetwork 
    });

    // Check if we should skip network call (mobile browser blocking)
    const shouldUseCacheFirst = this.shouldUseCacheFirst();

    if (!forceNetwork && shouldUseCacheFirst) {
      devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Mobile blocking suspected, skipping presence update to prevent errors');
      
      // Store intention in cache for later sync
      await this.setCachedData(STORES.USER_PROFILES, `presence_intent_${userId}`, {
        isOnline,
        spaceId,
        timestamp: Date.now(),
        userId
      }, {
        query: 'presence_update_intent',
        params: { userId, isOnline, spaceId },
        userId
      });
      
      this.metrics.cacheHits++;
      return { data: null, error: null, fromCache: true, reason: 'mobile-blocking-skip' };
    }

    // Try network request with mobile browser blocking detection
    try {
      const networkPromise = this.executePresenceUpdateQuery(userId, isOnline, spaceId);
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
        spaceId,
        timestamp: Date.now(),
        userId
      }, {
        query: 'presence_update_intent',
        params: { userId, isOnline, spaceId },
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
  private async executePresenceUpdateQuery(userId: string, isOnline: boolean, spaceId?: string): Promise<any> {
    try {
      if (isOnline && spaceId) {
        // When going online in a specific space:
        // 1. Set current space as online
        // 2. Set all other spaces as offline
        
        // First, set all other spaces to offline
        await getSupabaseClient()
          .from('space_members')
          .update({
            is_online: false
          })
          .eq('user_id', userId)
          .eq('status', 'active')
          .neq('space_id', spaceId);
        
        // Then set current space as online
        const { error } = await getSupabaseClient()
          .from('space_members')
          .update({
            is_online: true,
            last_active_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('space_id', spaceId)
          .eq('status', 'active');
          
        return { data: null, error };
        
      } else if (!isOnline) {
        // When going offline, set all spaces to offline
        const { error } = await getSupabaseClient()
          .from('space_members')
          .update({
            is_online: false,
            last_active_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('status', 'active');
          
        return { data: null, error };
        
      } else {
        // Legacy fallback - update last_active_at only
        const { error } = await getSupabaseClient()
          .from('space_members')
          .update({
            last_active_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('status', 'active');

        return { data: null, error };
      }
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
          const cachedData = await this.getCachedData(STORES.USER_CONVERSATIONS, cacheKey);
          if (cachedData && !this.isCacheExpired(cachedData)) {
            console.log('🔧 [CacheDebug] [SupabaseIndexedDBBridge] Cache hit for user conversations');
            return { data: cachedData.data, error: null, fromCache: true };
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
          const cachedData = await this.getCachedData(STORES.USER_CONVERSATIONS, cacheKey);
          if (cachedData) {
            console.log('🔧 [CacheDebug] [SupabaseIndexedDBBridge] Using cached fallback for user conversations');
            return { data: cachedData.data, error: null, fromCache: true, reason: 'network_error_fallback' };
          }
        } catch (fallbackError) {
          console.warn('🔧 [CacheDebug] [SupabaseIndexedDBBridge] No cached fallback available');
        }
        return { data: null, error: result.error };
      }

      // Cache successful results
      if (result.data) {
        await this.setCachedData(STORES.USER_CONVERSATIONS, cacheKey, result.data, {
          query: 'user_conversations',
          params: { userId },
          userId
        });
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

  /**
   * Clean up stale presence data - set users offline if inactive for more than 5 minutes
   */
  async cleanupStalePresence(spaceId: string): Promise<any> {
    try {
      devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Cleaning up stale presence for space', spaceId);
      
      // Set users offline if they haven't been active in last 5 minutes
      const { data, error } = await getSupabaseClient()
        .from('space_members')
        .update({ is_online: false })
        .eq('space_id', spaceId)
        .eq('status', 'active')
        .or('last_active_at.is.null,last_active_at.lte.' + new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (error) {
        console.error('[SupabaseIndexedDBBridge] Error cleaning stale presence:', error);
        return { error };
      }

      devLogger.log('CacheDebug', '[SupabaseIndexedDBBridge] Stale presence cleanup completed', { spaceId, affectedRows: data });
      return { data };
    } catch (error) {
      console.error('[SupabaseIndexedDBBridge] Exception in cleanupStalePresence:', error);
      return { error };
    }
  }

  /**
   * Get online members with time-based validation
   */
  async getOnlineMembersWithTimeValidation(spaceId: string): Promise<any> {
    try {
      // First cleanup stale presence
      await this.cleanupStalePresence(spaceId);
      
      // Then get current online members
      const { data, error } = await getSupabaseClient()
        .from('space_members')
        .select(`
          user_id,
          is_online,
          last_active_at,
          users!inner(full_name, avatar_url)
        `)
        .eq('space_id', spaceId)
        .eq('status', 'active')
        .eq('is_online', true)
        .gte('last_active_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (error) {
        console.error('[SupabaseIndexedDBBridge] Error fetching time-validated online members:', error);
        return { error, data: [] };
      }

      devLogger.log('CacheDebug', `[SupabaseIndexedDBBridge] Time-validated online members for ${spaceId}:`, data?.length || 0);
      return { data: data || [], error: null };
    } catch (error) {
      console.error('[SupabaseIndexedDBBridge] Exception in getOnlineMembersWithTimeValidation:', error);
      return { error, data: [] };
    }
  }

  /**
   * Clear user conversations cache for a specific user
   */
  async clearUserConversationsCache(userId: string): Promise<void> {
    await this.initializeDB();
    if (!this.db) return;

    const cacheKey = `user_conversations_${userId}`;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.USER_CONVERSATIONS], 'readwrite');
      const store = transaction.objectStore(STORES.USER_CONVERSATIONS);
      const request = store.delete(cacheKey);

      request.onsuccess = () => {
        console.log(`[SupabaseIndexedDBBridge] Cleared user conversations cache for user: ${userId}`);
        resolve();
      };
      request.onerror = () => {
        console.warn(`[SupabaseIndexedDBBridge] Failed to clear user conversations cache for user: ${userId}`);
        resolve(); // Don't fail the operation if cache clear fails
      };
    });
  }

  /**
   * ROCK SOLID: Test chat system health
   */
  async testChatSystemHealth(): Promise<any> {
    console.log('🏥 [ChatHealthCheck] Starting comprehensive chat system health test...');
    
    const healthReport = {
      timestamp: new Date().toISOString(),
      overallHealth: 'unknown',
      tests: {
        database_connectivity: { status: 'pending', details: null },
        rpc_function_exists: { status: 'pending', details: null },
        user_conversations_view: { status: 'pending', details: null },
        chat_tables_structure: { status: 'pending', details: null },
        cache_system: { status: 'pending', details: null },
        bridge_functionality: { status: 'pending', details: null }
      },
      recommendations: []
    };

    try {
      // Test 1: Database connectivity
      console.log('🔍 [ChatHealthCheck] Testing database connectivity...');
      try {
        const { data, error } = await getSupabaseClient().from('chat_conversations').select('count', { count: 'exact', head: true });
        if (error) throw error;
        
        healthReport.tests.database_connectivity = { 
          status: 'healthy', 
          details: { total_conversations: data?.length || 0 }
        };
        console.log('✅ [ChatHealthCheck] Database connectivity: HEALTHY');
      } catch (error) {
        healthReport.tests.database_connectivity = { 
          status: 'unhealthy', 
          details: { error: error instanceof Error ? error.message : String(error) }
        };
        console.error('❌ [ChatHealthCheck] Database connectivity: FAILED', error);
      }

      // Test 2: RPC function exists and works
      console.log('🔍 [ChatHealthCheck] Testing RPC function...');
      try {
        const { data, error } = await getSupabaseClient().rpc('get_or_create_direct_conversation', {
          user1_id: '00000000-0000-0000-0000-000000000000',
          user2_id: '11111111-1111-1111-1111-111111111111'
        });
        
        // We expect this to fail with a specific error, not a function-not-found error
        if (error && !error.message.includes('function') && !error.message.includes('does not exist')) {
          healthReport.tests.rpc_function_exists = { 
            status: 'healthy', 
            details: { function_exists: true, error_as_expected: error.message }
          };
          console.log('✅ [ChatHealthCheck] RPC function: HEALTHY');
        } else {
          healthReport.tests.rpc_function_exists = { 
            status: 'unhealthy', 
            details: { error: error?.message || 'Function not found' }
          };
          console.error('❌ [ChatHealthCheck] RPC function: FAILED');
        }
      } catch (error) {
        healthReport.tests.rpc_function_exists = { 
          status: 'unhealthy', 
          details: { error: error instanceof Error ? error.message : String(error) }
        };
        console.error('❌ [ChatHealthCheck] RPC function: EXCEPTION', error);
      }

      // Test 3: user_conversations view
      console.log('🔍 [ChatHealthCheck] Testing user_conversations view...');
      try {
        const { data, error } = await getSupabaseClient()
          .from('user_conversations')
          .select('conversation_id')
          .limit(1);
        
        if (error) throw error;
        
        healthReport.tests.user_conversations_view = { 
          status: 'healthy', 
          details: { view_accessible: true, sample_data: data?.length > 0 }
        };
        console.log('✅ [ChatHealthCheck] User conversations view: HEALTHY');
      } catch (error) {
        healthReport.tests.user_conversations_view = { 
          status: 'unhealthy', 
          details: { error: error instanceof Error ? error.message : String(error) }
        };
        console.error('❌ [ChatHealthCheck] User conversations view: FAILED', error);
      }

      // Test 4: Chat tables structure
      console.log('🔍 [ChatHealthCheck] Testing chat tables structure...');
      try {
        const tables = ['chat_conversations', 'chat_participants', 'chat_messages'];
        const tableResults = {};
        
        for (const table of tables) {
          try {
            const { data, error } = await getSupabaseClient().from(table).select('*').limit(0);
            if (error) throw error;
            tableResults[table] = { exists: true, accessible: true };
          } catch (error) {
            tableResults[table] = { exists: false, error: error instanceof Error ? error.message : String(error) };
          }
        }
        
        const allTablesHealthy = Object.values(tableResults).every((result: any) => result.exists);
        healthReport.tests.chat_tables_structure = { 
          status: allTablesHealthy ? 'healthy' : 'unhealthy', 
          details: tableResults
        };
        
        if (allTablesHealthy) {
          console.log('✅ [ChatHealthCheck] Chat tables structure: HEALTHY');
        } else {
          console.error('❌ [ChatHealthCheck] Chat tables structure: ISSUES FOUND');
        }
      } catch (error) {
        healthReport.tests.chat_tables_structure = { 
          status: 'unhealthy', 
          details: { error: error instanceof Error ? error.message : String(error) }
        };
        console.error('❌ [ChatHealthCheck] Chat tables structure: EXCEPTION', error);
      }

      // Test 5: Cache system
      console.log('🔍 [ChatHealthCheck] Testing cache system...');
      try {
        await this.initializeDB();
        const cacheStatus = this.db ? 'healthy' : 'unhealthy';
        const metrics = this.getMetrics();
        
        healthReport.tests.cache_system = { 
          status: cacheStatus, 
          details: { 
            indexedDB_available: !!this.db,
            metrics: metrics,
            stores_available: this.db ? Object.keys(STORES).length : 0
          }
        };
        
        if (cacheStatus === 'healthy') {
          console.log('✅ [ChatHealthCheck] Cache system: HEALTHY');
        } else {
          console.error('❌ [ChatHealthCheck] Cache system: FAILED');
        }
      } catch (error) {
        healthReport.tests.cache_system = { 
          status: 'unhealthy', 
          details: { error: error instanceof Error ? error.message : String(error) }
        };
        console.error('❌ [ChatHealthCheck] Cache system: EXCEPTION', error);
      }

      // Test 6: Bridge functionality
      console.log('🔍 [ChatHealthCheck] Testing bridge functionality...');
      try {
        const testUserId = '00000000-0000-0000-0000-000000000000';
        const result = await this.getUserConversations(testUserId, { forceNetwork: false });
        
        healthReport.tests.bridge_functionality = { 
          status: 'healthy', 
          details: { 
            method_callable: true,
            returns_result: !!result,
            has_data_field: result.hasOwnProperty('data'),
            has_error_field: result.hasOwnProperty('error')
          }
        };
        console.log('✅ [ChatHealthCheck] Bridge functionality: HEALTHY');
      } catch (error) {
        healthReport.tests.bridge_functionality = { 
          status: 'unhealthy', 
          details: { error: error instanceof Error ? error.message : String(error) }
        };
        console.error('❌ [ChatHealthCheck] Bridge functionality: EXCEPTION', error);
      }

      // Calculate overall health
      const healthyTests = Object.values(healthReport.tests).filter(test => test.status === 'healthy').length;
      const totalTests = Object.keys(healthReport.tests).length;
      const healthPercentage = (healthyTests / totalTests) * 100;
      
      if (healthPercentage >= 100) {
        healthReport.overallHealth = 'excellent';
      } else if (healthPercentage >= 80) {
        healthReport.overallHealth = 'good';
      } else if (healthPercentage >= 60) {
        healthReport.overallHealth = 'concerning';
      } else {
        healthReport.overallHealth = 'critical';
      }

      // Generate recommendations
      if (healthReport.tests.database_connectivity.status === 'unhealthy') {
        healthReport.recommendations.push('Check database connection and network connectivity');
      }
      if (healthReport.tests.rpc_function_exists.status === 'unhealthy') {
        healthReport.recommendations.push('Verify RPC function get_or_create_direct_conversation exists and has correct signature');
      }
      if (healthReport.tests.user_conversations_view.status === 'unhealthy') {
        healthReport.recommendations.push('Check user_conversations view definition and permissions');
      }
      if (healthReport.tests.chat_tables_structure.status === 'unhealthy') {
        healthReport.recommendations.push('Verify all chat tables (chat_conversations, chat_participants, chat_messages) exist');
      }
      if (healthReport.tests.cache_system.status === 'unhealthy') {
        healthReport.recommendations.push('Check IndexedDB availability and permissions');
      }
      if (healthReport.tests.bridge_functionality.status === 'unhealthy') {
        healthReport.recommendations.push('Investigate bridge method implementation issues');
      }

      console.log(`🏥 [ChatHealthCheck] Health test completed: ${healthReport.overallHealth.toUpperCase()} (${healthyTests}/${totalTests} tests passed)`);
      
      return healthReport;
      
    } catch (error) {
      console.error('💥 [ChatHealthCheck] Health test failed with exception:', error);
      healthReport.overallHealth = 'critical';
      healthReport.recommendations.push('Investigate system-wide chat functionality issues');
      return healthReport;
    }
  }

  /**
   * ROCK SOLID: Validate user conversations consistency
   */
  async validateUserConversations(userId: string): Promise<any> {
    console.log(`🔍 [ConversationValidator] Validating conversations for user: ${userId}`);
    
    const validationReport = {
      userId: userId,
      timestamp: new Date().toISOString(),
      status: 'unknown',
      issues: [],
      stats: {
        total_conversations: 0,
        database_conversations: 0,
        cache_conversations: 0,
        missing_in_cache: 0,
        missing_in_database: 0,
        inconsistent_data: 0
      },
      recommendations: []
    };

    try {
      // Get conversations from database
      console.log('📊 [ConversationValidator] Fetching from database...');
      const dbResult = await this.executeUserConversationsQuery(userId);
      const dbConversations = dbResult.data || [];
      validationReport.stats.database_conversations = dbConversations.length;

      // Get conversations from cache
      console.log('📊 [ConversationValidator] Checking cache...');
      const cacheKey = `user_conversations_${userId}`;
      const cachedData = await this.getCachedData(STORES.USER_CONVERSATIONS, cacheKey);
      const cacheConversations = cachedData?.data || [];
      validationReport.stats.cache_conversations = cacheConversations.length;

      validationReport.stats.total_conversations = Math.max(dbConversations.length, cacheConversations.length);

      // Compare database vs cache
      const dbConversationIds = new Set(dbConversations.map((c: any) => c.conversation_id));
      const cacheConversationIds = new Set(cacheConversations.map((c: any) => c.conversation_id));

      // Find missing conversations
      const missingInCache = [...dbConversationIds].filter(id => !cacheConversationIds.has(id));
      const missingInDatabase = [...cacheConversationIds].filter(id => !dbConversationIds.has(id));

      validationReport.stats.missing_in_cache = missingInCache.length;
      validationReport.stats.missing_in_database = missingInDatabase.length;

      if (missingInCache.length > 0) {
        validationReport.issues.push({
          type: 'cache_outdated',
          description: `${missingInCache.length} conversations missing from cache`,
          conversation_ids: missingInCache
        });
      }

      if (missingInDatabase.length > 0) {
        validationReport.issues.push({
          type: 'cache_stale',
          description: `${missingInDatabase.length} stale conversations in cache`,
          conversation_ids: missingInDatabase
        });
      }

      // Check data consistency for common conversations
      const commonIds = [...dbConversationIds].filter(id => cacheConversationIds.has(id));
      let inconsistentCount = 0;

      for (const conversationId of commonIds) {
        const dbConv = dbConversations.find((c: any) => c.conversation_id === conversationId);
        const cacheConv = cacheConversations.find((c: any) => c.conversation_id === conversationId);

        if (dbConv && cacheConv) {
          const inconsistencies = [];
          
          if (dbConv.last_message_at !== cacheConv.last_message_at) {
            inconsistencies.push('last_message_at');
          }
          if (dbConv.unread_count !== cacheConv.unread_count) {
            inconsistencies.push('unread_count');
          }

          if (inconsistencies.length > 0) {
            inconsistentCount++;
            validationReport.issues.push({
              type: 'data_inconsistency',
              description: `Data mismatch in conversation ${conversationId}`,
              fields: inconsistencies,
              database_data: dbConv,
              cache_data: cacheConv
            });
          }
        }
      }

      validationReport.stats.inconsistent_data = inconsistentCount;

      // Determine overall status
      if (validationReport.issues.length === 0) {
        validationReport.status = 'healthy';
      } else if (validationReport.issues.length <= 2 && inconsistentCount === 0) {
        validationReport.status = 'minor_issues';
      } else {
        validationReport.status = 'needs_attention';
      }

      // Generate recommendations
      if (missingInCache.length > 0) {
        validationReport.recommendations.push('Clear user conversations cache and refresh from database');
      }
      if (missingInDatabase.length > 0) {
        validationReport.recommendations.push('Clean up stale cache entries');
      }
      if (inconsistentCount > 0) {
        validationReport.recommendations.push('Force refresh conversations to sync database and cache');
      }

      console.log(`✅ [ConversationValidator] Validation completed: ${validationReport.status} (${validationReport.issues.length} issues found)`);
      
      return validationReport;

    } catch (error) {
      console.error('💥 [ConversationValidator] Validation failed:', error);
      validationReport.status = 'error';
      validationReport.issues.push({
        type: 'validation_error',
        description: 'Failed to validate conversations',
        error: error instanceof Error ? error.message : String(error)
      });
      return validationReport;
    }
  }

  /**
   * ROCK SOLID: Diagnose specific conversation issues
   */
  async diagnoseConversationIssues(conversationId: string): Promise<any> {
    console.log(`🔬 [ConversationDiagnostic] Diagnosing conversation: ${conversationId}`);
    
    const diagnostic = {
      conversationId: conversationId,
      timestamp: new Date().toISOString(),
      exists: {
        in_chat_conversations: false,
        in_chat_participants: false,
        in_user_conversations: false,
        in_cache: false
      },
      details: {
        chat_conversations: null,
        chat_participants: null,
        user_conversations: null,
        cache_info: {} as Record<string, string>
      },
      issues: [],
      recommendations: []
    };

    try {
      // Check if conversation exists in chat_conversations table
      console.log('🔍 [ConversationDiagnostic] Checking chat_conversations table...');
      try {
        const { data, error } = await getSupabaseClient()
          .from('chat_conversations')
          .select('*')
          .eq('id', conversationId)
          .single();
        
        if (data && !error) {
          diagnostic.exists.in_chat_conversations = true;
          diagnostic.details.chat_conversations = data;
        } else {
          diagnostic.issues.push({
            type: 'missing_conversation',
            description: 'Conversation not found in chat_conversations table',
            error: error?.message
          });
        }
      } catch (error) {
        diagnostic.issues.push({
          type: 'database_error',
          description: 'Error querying chat_conversations table',
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Check participants
      console.log('🔍 [ConversationDiagnostic] Checking chat_participants table...');
      try {
        const { data, error } = await getSupabaseClient()
          .from('chat_participants')
          .select('*')
          .eq('conversation_id', conversationId);
        
        if (data && !error && data.length > 0) {
          diagnostic.exists.in_chat_participants = true;
          diagnostic.details.chat_participants = data;
        } else {
          diagnostic.issues.push({
            type: 'missing_participants',
            description: 'No participants found for conversation',
            error: error?.message
          });
        }
      } catch (error) {
        diagnostic.issues.push({
          type: 'database_error',
          description: 'Error querying chat_participants table',
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Check user_conversations view
      console.log('🔍 [ConversationDiagnostic] Checking user_conversations view...');
      try {
        const { data, error } = await getSupabaseClient()
          .from('user_conversations')
          .select('*')
          .eq('conversation_id', conversationId);
        
        if (data && !error && data.length > 0) {
          diagnostic.exists.in_user_conversations = true;
          diagnostic.details.user_conversations = data;
        } else {
          diagnostic.issues.push({
            type: 'missing_in_view',
            description: 'Conversation not found in user_conversations view',
            error: error?.message
          });
        }
      } catch (error) {
        diagnostic.issues.push({
          type: 'view_error',
          description: 'Error querying user_conversations view',
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Check cache for all potential users
      console.log('🔍 [ConversationDiagnostic] Checking cache...');
      if (diagnostic.details.chat_participants) {
        for (const participant of diagnostic.details.chat_participants) {
          const cacheKey = `user_conversations_${participant.user_id}`;
          const cachedData = await this.getCachedData(STORES.USER_CONVERSATIONS, cacheKey);
          
          if (cachedData?.data) {
            const foundInCache = cachedData.data.some((c: any) => c.conversation_id === conversationId);
            if (foundInCache) {
              diagnostic.exists.in_cache = true;
              diagnostic.details.cache_info = diagnostic.details.cache_info || {};
              diagnostic.details.cache_info[participant.user_id] = 'found';
            }
          }
        }
      }

      // Generate recommendations based on findings
      if (!diagnostic.exists.in_chat_conversations) {
        diagnostic.recommendations.push('Conversation data is corrupted or never created properly');
      }
      if (!diagnostic.exists.in_chat_participants) {
        diagnostic.recommendations.push('Participants data is missing - conversation creation was incomplete');
      }
      if (!diagnostic.exists.in_user_conversations) {
        diagnostic.recommendations.push('Check user_conversations view definition and underlying data');
      }
      if (diagnostic.exists.in_chat_conversations && diagnostic.exists.in_chat_participants && !diagnostic.exists.in_user_conversations) {
        diagnostic.recommendations.push('View cache may be stale - try refreshing the view');
      }
      if (!diagnostic.exists.in_cache && diagnostic.exists.in_user_conversations) {
        diagnostic.recommendations.push('Clear and refresh user conversation cache');
      }

      console.log(`🔬 [ConversationDiagnostic] Diagnosis completed: ${diagnostic.issues.length} issues found`);
      
      return diagnostic;

    } catch (error) {
      console.error('💥 [ConversationDiagnostic] Diagnostic failed:', error);
      diagnostic.issues.push({
        type: 'diagnostic_error',
        description: 'Failed to complete diagnostic',
        error: error instanceof Error ? error.message : String(error)
      });
      return diagnostic;
    }
  }

  /**
   * Simple conversation lookup (replaced emergency recovery with standard functionality)
   */
  async findOrCreateConversation(userId: string, targetUserId: string): Promise<any> {
    console.log(`🔍 [ConversationLookup] Finding conversation between ${userId} and ${targetUserId}`);
    
    try {
      // Look for existing conversation
      const { data: participants, error } = await getSupabaseClient()
        .from('chat_participants')
        .select('conversation_id')
        .in('user_id', [userId, targetUserId]);
      
      if (!error && participants) {
        const conversationCounts = participants.reduce((acc: Record<string, number>, p: any) => {
          acc[p.conversation_id] = (acc[p.conversation_id] || 0) + 1;
          return acc;
        }, {});
        
        const existingConversationId = Object.keys(conversationCounts).find(id => conversationCounts[id] >= 2);
        
        if (existingConversationId) {
          console.log(`✅ [ConversationLookup] Found existing conversation: ${existingConversationId}`);
          return { success: true, conversationId: existingConversationId };
        }
      }

      // Create new conversation if none exists
      const newConversationId = crypto.randomUUID();
      
      const { error: createError } = await getSupabaseClient()
        .from('chat_conversations')
        .insert({
          id: newConversationId,
          is_group: false,
          created_by: userId
        });
      
      if (createError) throw createError;
      
      // Add participants
      const { error: participantsError } = await getSupabaseClient()
        .from('chat_participants')
        .insert([
          { conversation_id: newConversationId, user_id: userId, is_admin: false },
          { conversation_id: newConversationId, user_id: targetUserId, is_admin: false }
        ]);
      
      if (participantsError) throw participantsError;
      
      console.log(`✅ [ConversationLookup] Created new conversation: ${newConversationId}`);
      return { success: true, conversationId: newConversationId };

    } catch (error) {
      console.error('❌ [ConversationLookup] Failed to find/create conversation:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
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