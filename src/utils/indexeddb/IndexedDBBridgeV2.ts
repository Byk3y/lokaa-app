/**
 * IndexedDB Bridge V2 - Modern Service-Based Architecture
 * 
 * Orchestrates all specialized services to provide a unified interface
 * Replaces the monolithic supabaseIndexedDBBridge.ts
 */

import { SupabaseBridgeResult, ServiceHealthStatus } from './types';
import { indexedDBManager } from './core/IndexedDBManager';
import { mobileBrowserService } from './core/MobileBrowserService';
import { spaceMembersService, SpaceMember, SpaceMemberOptions } from './services/SpaceMembersService';
import { userProfileService, UserProfile, AuthUser, UserProfileOptions } from './services/UserProfileService';
import { conversationService, UserConversation, ConversationOptions } from './services/ConversationService';
import { presenceService, PresenceOptions } from './services/PresenceService';

/**
 * IndexedDB Bridge V2
 * 
 * Modern service-based architecture for mobile-safe database operations
 */
export class IndexedDBBridgeV2 {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the bridge and all services
   */
  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[IndexedDBBridgeV2] Initializing modern service architecture...');
        
        // Initialize core database manager
        await indexedDBManager.initialize();
        
        // Setup mobile detection
        mobileBrowserService.setupMobileDetection();
        
        this.initialized = true;
        console.log('[IndexedDBBridgeV2] Modern bridge initialized successfully');
        
        // Setup global interface for backward compatibility and debugging
        this.setupGlobalInterface();
        
      } catch (error) {
        console.error('[IndexedDBBridgeV2] Failed to initialize:', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * SPACE MEMBERS API
   * Mobile-safe space member operations with caching
   */

  /**
   * Get space members (main API method)
   */
  async getSpaceMembers(
    spaceId: string, 
    options: SpaceMemberOptions = {}
  ): Promise<SupabaseBridgeResult<SpaceMember[]>> {
    await this.ensureInitialized();
    return await spaceMembersService.getSpaceMembers(spaceId, options);
  }

  /**
   * Get specific user's membership in a space
   */
  async getUserSpaceMembership(
    spaceId: string, 
    userId: string,
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult<SpaceMember | null>> {
    await this.ensureInitialized();
    return await spaceMembersService.getUserSpaceMembership(spaceId, userId, options);
  }

  /**
   * Get online members for a space
   */
  async getOnlineMembers(
    spaceId: string,
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult<SpaceMember[]>> {
    await this.ensureInitialized();
    return await spaceMembersService.getOnlineMembers(spaceId, options);
  }

  /**
   * Get member count statistics
   */
  async getMemberCounts(
    spaceId: string,
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult<{
    total: number;
    online: number;
    admins: number;
    owners: number;
  }>> {
    await this.ensureInitialized();
    return await spaceMembersService.getMemberCounts(spaceId, options);
  }

  /**
   * USER PROFILE API
   * Mobile-safe user profile operations with caching
   */

  /**
   * Get user profile with caching
   */
  async getUserProfile(
    userId: string,
    options: UserProfileOptions = {}
  ): Promise<SupabaseBridgeResult<UserProfile>> {
    await this.ensureInitialized();
    return await userProfileService.getUserProfile(userId, options);
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult<AuthUser>> {
    await this.ensureInitialized();
    return await userProfileService.getCurrentUser(options);
  }

  /**
   * Get multiple user profiles efficiently
   */
  async getUserProfiles(
    userIds: string[],
    options: UserProfileOptions = {}
  ): Promise<SupabaseBridgeResult<UserProfile[]>> {
    await this.ensureInitialized();
    return await userProfileService.getUserProfiles(userIds, options);
  }

  /**
   * Invalidate cache for a specific user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.ensureInitialized();
    return await userProfileService.invalidateUserCache(userId);
  }

  /**
   * CONVERSATION API
   * Critical chat conversation operations with mobile-safe caching
   */

  /**
   * Get user conversations - CRITICAL METHOD for chat system
   * 
   * This is the main method that ChatApiService.ts uses at line 97
   */
  async getUserConversations(
    userId: string,
    options: ConversationOptions = {}
  ): Promise<SupabaseBridgeResult<UserConversation[]>> {
    await this.ensureInitialized();
    return await conversationService.getUserConversations(userId, options);
  }

  /**
   * PRESENCE API
   * Mobile-safe user presence operations
   */

  /**
   * Update global user presence - CRITICAL METHOD for presence system
   * 
   * This is the main method for tracking user online/offline status
   */
  async updateGlobalPresence(
    userId: string,
    isOnline: boolean,
    options: PresenceOptions = {}
  ): Promise<SupabaseBridgeResult<null>> {
    await this.ensureInitialized();
    return await presenceService.updateGlobalPresence(userId, isOnline, options);
  }

  /**
   * Cleanup stale presence data for a space
   */
  async cleanupStalePresence(spaceId: string): Promise<SupabaseBridgeResult<any>> {
    await this.ensureInitialized();
    return await presenceService.cleanupStalePresence(spaceId);
  }

  /**
   * CACHE MANAGEMENT API
   */

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    await this.ensureInitialized();
    await spaceMembersService.clearCache();
    await userProfileService.clearCache();
    await conversationService.clearCache();
    await presenceService.clearCache();
    console.log('[IndexedDBBridgeV2] All caches cleared');
  }

  /**
   * Invalidate cache for a specific space
   */
  async invalidateSpaceCache(spaceId: string): Promise<void> {
    await this.ensureInitialized();
    await spaceMembersService.invalidateSpaceCache(spaceId);
  }

  /**
   * HEALTH & DIAGNOSTICS API
   */

  /**
   * Check overall system health
   */
  async checkHealth(): Promise<ServiceHealthStatus> {
    try {
      const dbHealth = await indexedDBManager.checkHealth();
      const mobileInfo = mobileBrowserService.getDebugInfo();
      
      // Combine health from all services
      const overallHealth: ServiceHealthStatus = {
        status: dbHealth.status,
        details: {
          database: dbHealth.details,
          mobile: mobileInfo,
          services: {
            indexedDBManager: dbHealth.status,
            mobileBrowserService: 'healthy',
            spaceMembersService: 'healthy',
            userProfileService: 'healthy',
            conversationService: 'healthy',
            presenceService: 'healthy'
          }
        },
        lastChecked: Date.now(),
        errors: dbHealth.errors
      };

      return overallHealth;

    } catch (error) {
      return {
        status: 'unhealthy',
        details: { healthCheckError: true },
        lastChecked: Date.now(),
        errors: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Get comprehensive metrics from all services
   */
  async getMetrics(): Promise<{
    spaceMembersService: ReturnType<typeof spaceMembersService.getMetrics>;
    userProfileService: ReturnType<typeof userProfileService.getMetrics>;
    conversationService: ReturnType<typeof conversationService.getMetrics>;
    presenceService: ReturnType<typeof presenceService.getMetrics>;
    cacheStats: {
      spaceMembers: Awaited<ReturnType<typeof spaceMembersService.getCacheStats>>;
      userProfiles: Awaited<ReturnType<typeof userProfileService.getCacheStats>>;
      conversations: Awaited<ReturnType<typeof conversationService.getCacheStats>>;
      presence: Awaited<ReturnType<typeof presenceService.getCacheStats>>;
    };
    mobileDetection: ReturnType<typeof mobileBrowserService.testMobileBlockingDetection>;
    database: Awaited<ReturnType<typeof indexedDBManager.getDatabaseStats>>;
  }> {
    await this.ensureInitialized();

    const [spaceMembersStats, userProfileStats, conversationStats, presenceStats, mobileDetection] = await Promise.all([
      spaceMembersService.getCacheStats(),
      userProfileService.getCacheStats(),
      conversationService.getCacheStats(),
      presenceService.getCacheStats(),
      Promise.resolve(mobileBrowserService.testMobileBlockingDetection())
    ]);

    let databaseStats;
    try {
      databaseStats = await indexedDBManager.getDatabaseStats();
    } catch (error) {
      databaseStats = { version: 0, storeCount: 0, stores: [] };
    }

    return {
      spaceMembersService: spaceMembersService.getMetrics(),
      userProfileService: userProfileService.getMetrics(),
      conversationService: conversationService.getMetrics(),
      presenceService: presenceService.getMetrics(),
      cacheStats: {
        spaceMembers: spaceMembersStats,
        userProfiles: userProfileStats,
        conversations: conversationStats,
        presence: presenceStats
      },
      mobileDetection,
      database: databaseStats
    };
  }

  /**
   * MOBILE BROWSER API
   */

  /**
   * Test mobile blocking detection
   */
  testMobileBlockingDetection() {
    return mobileBrowserService.testMobileBlockingDetection();
  }

  /**
   * Force cache-first mode (for testing)
   */
  forceCacheFirstMode(): void {
    mobileBrowserService.forceCacheFirstMode();
  }

  /**
   * Clear cache-first mode
   */
  clearCacheFirstMode(): void {
    mobileBrowserService.clearCacheFirstMode();
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Check if the bridge is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Cleanup all services and connections
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup mobile browser service
      mobileBrowserService.cleanup();
      
      // Close database connections
      indexedDBManager.close();
      
      this.initialized = false;
      this.initPromise = null;
      
      console.log('[IndexedDBBridgeV2] Cleanup completed');
    } catch (error) {
      console.error('[IndexedDBBridgeV2] Error during cleanup:', error);
    }
  }

  // Private helper methods

  /**
   * Ensure the bridge is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Setup global interface for debugging and backward compatibility
   */
  private setupGlobalInterface(): void {
    if (typeof window !== 'undefined') {
      // Modern interface
      (window as any).indexedDBBridgeV2 = {
        // Health & Diagnostics
        checkHealth: () => this.checkHealth(),
        getMetrics: () => this.getMetrics(),
        testMobileBlocking: () => this.testMobileBlockingDetection(),
        
        // Cache Management
        clearCache: () => this.clearCache(),
        invalidateSpaceCache: (spaceId: string) => this.invalidateSpaceCache(spaceId),
        invalidateUserCache: (userId: string) => this.invalidateUserCache(userId),
        
        // Space Members API
        getSpaceMembers: (spaceId: string, options?: SpaceMemberOptions) => 
          this.getSpaceMembers(spaceId, options),
        getMemberCounts: (spaceId: string, options?: { forceNetwork?: boolean }) => 
          this.getMemberCounts(spaceId, options),
        getOnlineMembers: (spaceId: string, options?: { forceNetwork?: boolean }) => 
          this.getOnlineMembers(spaceId, options),
        
        // User Profile API
        getUserProfile: (userId: string, options?: UserProfileOptions) => 
          this.getUserProfile(userId, options),
        getCurrentUser: (options?: { forceNetwork?: boolean }) => 
          this.getCurrentUser(options),
        getUserProfiles: (userIds: string[], options?: UserProfileOptions) => 
          this.getUserProfiles(userIds, options),
        
        // Conversation API
        getUserConversations: (userId: string, options?: ConversationOptions) => 
          this.getUserConversations(userId, options),
        
        // Presence API
        updateGlobalPresence: (userId: string, isOnline: boolean, options?: PresenceOptions) => 
          this.updateGlobalPresence(userId, isOnline, options),
        cleanupStalePresence: (spaceId: string) => 
          this.cleanupStalePresence(spaceId),
        
        // Mobile Testing
        forceCacheFirstMode: () => this.forceCacheFirstMode(),
        clearCacheFirstMode: () => this.clearCacheFirstMode(),
        
        // Utilities
        isInitialized: () => this.isInitialized(),
        cleanup: () => this.cleanup()
      };

      // Backward compatibility interface (mimics old bridge API)
      (window as any).supabaseIndexedDBBridgeV2 = {
        getSpaceMembers: (spaceId: string, options: any = {}) => {
          // Convert old API format to new format
          const newOptions: SpaceMemberOptions = {
            userId: options.userId,
            status: options.status || 'active',
            forceNetwork: options.forceNetwork
          };
          return this.getSpaceMembers(spaceId, newOptions);
        },
        getUserProfile: (userId: string, fields: string[] = [], options: any = {}) => {
          // Convert old API format to new format
          const newOptions: UserProfileOptions = {
            fields: fields.length > 0 ? fields : undefined,
            forceNetwork: options.forceNetwork
          };
          return this.getUserProfile(userId, newOptions);
        },
        getCurrentUser: (options: any = {}) => this.getCurrentUser(options),
        getUserConversations: (userId: string, options: any = {}) => this.getUserConversations(userId, options),
        updateGlobalPresence: (userId: string, isOnline: boolean, options: any = {}) => 
          this.updateGlobalPresence(userId, isOnline, options),
        getMetrics: () => this.getMetrics(),
        clearCache: () => this.clearCache(),
        testMobileBlockingDetection: () => this.testMobileBlockingDetection(),
        getCacheStatus: (spaceId: string) => this.invalidateSpaceCache(spaceId)
      };

      console.log('[IndexedDBBridgeV2] Global interfaces configured:');
      console.log('  - window.indexedDBBridgeV2 (modern API)');
      console.log('  - window.supabaseIndexedDBBridgeV2 (compatibility API)');
    }
  }
}

// Export singleton instance
export const indexedDBBridgeV2 = new IndexedDBBridgeV2();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  indexedDBBridgeV2.initialize().catch(error => {
    console.error('[IndexedDBBridgeV2] Auto-initialization failed:', error);
  });
} 