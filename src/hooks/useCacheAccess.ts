import { log } from '@/utils/logger';
import { useMemo } from 'react';
import { CacheAccessService, type CacheAccessResult } from '@/services/CacheAccessService';

/**
 * useCacheAccess - Hook for checking instant cache access
 * 
 * Extracted from SpaceTabContent.tsx Phase 3 refactoring
 * Provides a clean React interface to the CacheAccessService
 */

interface User {
  id: string;
}

interface CacheAccessHookResult {
  hasInstantAccess: boolean;
  cacheStatus: CacheAccessResult['cacheStatus'];
  source?: CacheAccessResult['source'];
  error?: string;
  loading: boolean;
}

export function useCacheAccess(
  user: User | null,
  subdomain: string,
  authLoading: boolean
): CacheAccessHookResult {
  
  const result = useMemo(() => {
    // If auth is still loading, don't check cache yet
    if (authLoading) {
      return {
        hasInstantAccess: false,
        cacheStatus: 'no-user' as const,
        loading: true
      };
    }

    // Use the service to check cache access
    const cacheResult = CacheAccessService.checkInstantAccess(user, subdomain, authLoading);
    
    return {
      hasInstantAccess: cacheResult.hasInstantAccess,
      cacheStatus: cacheResult.cacheStatus,
      source: cacheResult.source,
      error: cacheResult.error,
      loading: false
    };
  }, [user, subdomain, authLoading]);

  // Debug logging in development
  if (process.env.NODE_ENV === 'development' && result.hasInstantAccess) {
    log.debug('Hook', '🚀 [useCacheAccess] Instant access granted:', {
      subdomain,
      userId: user?.id,
      source: result.source,
      cacheStatus: result.cacheStatus
    });
  }

  return result;
}

/**
 * Helper hook for cache management
 */
export function useCacheManager(subdomain: string, userId?: string) {
  return useMemo(() => ({
    clearCache: () => CacheAccessService.clearSubdomainCache(subdomain, userId),
    getStats: () => CacheAccessService.getCacheStats(subdomain, userId),
  }), [subdomain, userId]);
} 