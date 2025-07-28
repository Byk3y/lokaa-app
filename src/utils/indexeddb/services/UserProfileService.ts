import { log } from '@/utils/logger';
/**
 * User Profile Service
 * 
 * Specialized service for handling user profile data with caching
 * Replaces user profile functionality from the monolithic bridge
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { SupabaseBridgeResult, CacheOptions } from '../types';
import { userProfilesCacheService } from '../core/CacheService';
import { mobileBrowserService } from '../core/MobileBrowserService';
import { devLogger } from '@/utils/developmentLogger';

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  profile_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  phone?: string;
  last_sign_in_at?: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  aud?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfileOptions {
  fields?: string[];
  forceNetwork?: boolean;
  includeAuth?: boolean;
}

/**
 * User Profile Service
 * 
 * Handles all user profile operations with mobile-safe caching
 */
export class UserProfileService {
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    networkRequests: 0,
    mobileBlocking: 0,
    errors: 0
  };

  /**
   * Get user profile with caching and mobile browser protection
   */
  async getUserProfile(
    userId: string,
    options: UserProfileOptions = {}
  ): Promise<SupabaseBridgeResult<UserProfile>> {
    this.metrics.totalRequests++;
    
    const { fields = ['id', 'full_name', 'profile_url', 'bio'], forceNetwork = false } = options;
    const cacheKey = this.generateCacheKey(userId, fields);

    try {
      // Check if we should use cache-first approach (mobile blocking)
      const shouldUseCacheFirst = mobileBrowserService.shouldUseCacheFirst();
      
      if (!forceNetwork && shouldUseCacheFirst) {
        devLogger.log('IndexedDB', '[UserProfileService] Mobile blocking detected, checking cache first');
        
        const cachedData = await userProfilesCacheService.get(cacheKey);
        if (cachedData) {
          this.metrics.cacheHits++;
          devLogger.log('IndexedDB', '[UserProfileService] Returning cached user profile (mobile blocking)');
          return {
            data: cachedData as unknown as UserProfile,
            error: null,
            fromCache: true,
            reason: 'mobile_blocking'
          };
        }
      }

      // Try network request with mobile browser blocking detection
      try {
        const networkResult = await this.executeUserProfileQuery(userId, fields);
        this.metrics.networkRequests++;
        
        if (networkResult.error) {
          throw networkResult.error;
        }

        // Cache successful network response
        if (networkResult.data) {
          const cacheOptions: CacheOptions = {
            metadata: {
              query: 'user_profile',
              params: { userId, fields },
              userId
            }
          };
          
          await userProfilesCacheService.set(cacheKey, networkResult.data, cacheOptions);
          // Only log cache operations in development and not too frequently
          if (process.env.NODE_ENV === 'development' && this.metrics.totalRequests % 5 === 0) {
            devLogger.log('IndexedDB', '[UserProfileService] Cached fresh user profile data');
          }
        }

        this.metrics.cacheMisses++;
        return {
          data: networkResult.data,
          error: null,
          fromCache: false
        };

      } catch (error) {
        this.metrics.errors++;
        
        // Check if this is mobile browser blocking
        if (mobileBrowserService.isMobileBrowserBlocking(error)) {
          this.metrics.mobileBlocking++;
          devLogger.log('IndexedDB', '[UserProfileService] Mobile browser blocking detected, using cache fallback');
          
          // Return cached data if available (even if expired)
          const cachedData = await userProfilesCacheService.get(cacheKey, { skipCache: true });
          if (cachedData) {
            return {
              data: cachedData as unknown as UserProfile,
              error: null,
              fromCache: true,
              reason: 'mobile_browser_blocking'
            };
          }
        }

        // No cache available or not mobile blocking, return error
        return {
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          fromCache: false
        };
      }

    } catch (error) {
      this.metrics.errors++;
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        fromCache: false
      };
    }
  }

  /**
   * Get current authenticated user with caching
   */
  async getCurrentUser(
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult<{ user: AuthUser | null }>> {
    this.metrics.totalRequests++;
    
    const { forceNetwork = false } = options;
    const cacheKey = 'current_auth_user';

    try {
      // Check if we should use cache-first approach (mobile blocking)
      const shouldUseCacheFirst = mobileBrowserService.shouldUseCacheFirst();
      
      if (!forceNetwork && shouldUseCacheFirst) {
        devLogger.log('IndexedDB', '[UserProfileService] Mobile blocking detected, checking auth cache first');
        
        const cachedData = await userProfilesCacheService.get(cacheKey);
        if (cachedData) {
          this.metrics.cacheHits++;
          devLogger.log('IndexedDB', '[UserProfileService] Returning cached auth user (mobile blocking)');
          return {
            data: cachedData as { user: AuthUser | null },
            error: null,
            fromCache: true,
            reason: 'mobile_blocking'
          };
        }
      }

      // Try network request with mobile browser blocking detection
      try {
        const networkResult = await this.executeAuthUserQuery();
        this.metrics.networkRequests++;
        
        if (networkResult.error) {
          throw networkResult.error;
        }

        // Cache successful network response
        if (networkResult.data) {
          const cacheOptions: CacheOptions = {
            metadata: {
              query: 'auth_user',
              params: {}
            }
          };
          
          await userProfilesCacheService.set(cacheKey, networkResult.data, cacheOptions);
          devLogger.log('IndexedDB', '[UserProfileService] Cached fresh auth user data');
        }

        this.metrics.cacheMisses++;
        return {
          data: networkResult.data,
          error: null,
          fromCache: false
        };

      } catch (error) {
        this.metrics.errors++;
        
        // Check if this is mobile browser blocking
        if (mobileBrowserService.isMobileBrowserBlocking(error)) {
          this.metrics.mobileBlocking++;
          devLogger.log('IndexedDB', '[UserProfileService] Mobile auth blocking detected, using cache fallback');
          
          // Return cached data if available (even if expired)
          const cachedData = await userProfilesCacheService.get(cacheKey, { skipCache: true });
          if (cachedData) {
            return {
              data: cachedData as { user: AuthUser | null },
              error: null,
              fromCache: true,
              reason: 'mobile_browser_blocking'
            };
          }
        }

        // No cache available or not mobile blocking, return error
        return {
          data: { user: null },
          error: error instanceof Error ? error : new Error(String(error)),
          fromCache: false
        };
      }

    } catch (error) {
      this.metrics.errors++;
      return {
        data: { user: null },
        error: error instanceof Error ? error : new Error(String(error)),
        fromCache: false
      };
    }
  }

  /**
   * Get multiple user profiles efficiently
   */
  async getUserProfiles(
    userIds: string[],
    options: UserProfileOptions = {}
  ): Promise<SupabaseBridgeResult<UserProfile[]>> {
    const { fields = ['id', 'full_name', 'profile_url'], forceNetwork = false } = options;
    
    try {
      // Check cache for each user first
      const cachedProfiles: UserProfile[] = [];
      const uncachedUserIds: string[] = [];

      for (const userId of userIds) {
        const cacheKey = this.generateCacheKey(userId, fields);
        const cachedProfile = await userProfilesCacheService.get(cacheKey);
        
        if (cachedProfile && !forceNetwork) {
          cachedProfiles.push(cachedProfile as unknown as UserProfile);
          this.metrics.cacheHits++;
        } else {
          uncachedUserIds.push(userId);
        }
      }

      // If all profiles are cached, return them
      if (uncachedUserIds.length === 0) {
        return {
          data: cachedProfiles,
          error: null,
          fromCache: true,
          reason: 'all_cached'
        };
      }

      // Fetch missing profiles from network
      const networkResult = await this.executeMultipleUserProfilesQuery(uncachedUserIds, fields);
      
      if (networkResult.error) {
        // If network fails but we have some cached data, return partial results
        if (cachedProfiles.length > 0) {
          return {
            data: cachedProfiles,
            error: null,
            fromCache: true,
            reason: 'partial_cache_fallback'
          };
        }
        
        return {
          data: null,
          error: networkResult.error,
          fromCache: false
        };
      }

      // Cache the newly fetched profiles
      if (networkResult.data) {
        for (const profile of networkResult.data) {
          const cacheKey = this.generateCacheKey(profile.id, fields);
          const cacheOptions: CacheOptions = {
            metadata: {
              query: 'user_profile',
              params: { userId: profile.id, fields },
              userId: profile.id
            }
          };
          
          await userProfilesCacheService.set(cacheKey, profile, cacheOptions);
        }
      }

      // Combine cached and network results
      const allProfiles = [...cachedProfiles, ...(networkResult.data || [])];
      
      this.metrics.cacheMisses += uncachedUserIds.length;
      this.metrics.networkRequests++;

      return {
        data: allProfiles,
        error: null,
        fromCache: cachedProfiles.length > 0
      };

    } catch (error) {
      this.metrics.errors++;
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        fromCache: false
      };
    }
  }

  /**
   * Invalidate cache for a specific user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      // Get all cache entries for this user and remove them
      const entries = await userProfilesCacheService.getByMetadata('userId', userId);
      
      for (const entry of entries) {
        await userProfilesCacheService.invalidate(entry.key);
      }

      // Also invalidate auth cache if it's for the current user
      const authCacheKey = 'current_auth_user';
      const authCachedData = await userProfilesCacheService.get(authCacheKey);
      if (authCachedData && (authCachedData as AuthUser).id === userId) {
        await userProfilesCacheService.invalidate(authCacheKey);
      }

      devLogger.log('IndexedDB', `[UserProfileService] Invalidated cache for user: ${userId}`);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        log.error('Utils', '[UserProfileService] Error invalidating user cache:', error);
      }
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return await userProfilesCacheService.getStats();
  }

  /**
   * Clear all cached user profile data
   */
  async clearCache(): Promise<void> {
    await userProfilesCacheService.clear();
    devLogger.log('IndexedDB', '[UserProfileService] Cleared all user profile cache');
  }

  // Private helper methods

  /**
   * Execute the actual Supabase user profile query
   */
  private async executeUserProfileQuery(
    userId: string, 
    fields: string[]
  ): Promise<{ data: UserProfile | null; error: any }> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select(fields.join(','))
        .eq('id', userId)
        .single();

      return {
        data: data as UserProfile,
        error
      };

    } catch (error) {
      return {
        data: null,
        error
      };
    }
  }

  /**
   * Execute auth user query against Supabase
   */
  private async executeAuthUserQuery(): Promise<{ data: { user: AuthUser | null }; error: any }> {
    try {
      const { data, error } = await getSupabaseClient().auth.getUser();
      
      // Check for auth errors first
      if (error) {
        return {
          data: { user: null },
          error
        };
      }
      
      // Check if user exists and is authenticated
      if (!data?.user) {
        return {
          data: { user: null },
          error: new Error('No authenticated user found')
        };
      }
      
      return {
        data: { user: data.user as AuthUser },
        error: null
      };
    } catch (error) {
      return {
        data: { user: null },
        error: error instanceof Error ? error : new Error('Failed to get current user')
      };
    }
  }

  /**
   * Execute multiple user profiles query
   */
  private async executeMultipleUserProfilesQuery(
    userIds: string[],
    fields: string[]
  ): Promise<{ data: UserProfile[] | null; error: any }> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select(fields.join(','))
        .in('id', userIds);

      return {
        data: data as UserProfile[],
        error
      };

    } catch (error) {
      return {
        data: null,
        error
      };
    }
  }

  /**
   * Generate cache key for user profile query
   */
  private generateCacheKey(userId: string, fields: string[]): string {
    const sortedFields = fields.sort().join('_');
    return `user_profile_${userId}_${sortedFields}`;
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService(); 