import { log } from '@/utils/logger';
/**
 * 🚀 Smart Space Redirect - Next Level UX
 * Aggressively gets users to their spaces instantly using multiple strategies
 * 🎯 PHASE 8: Enhanced with Emergency Database Recovery
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { NavigateFunction } from 'react-router-dom';
import EmergencyDatabaseRecovery from '@/utils/emergencyDatabaseRecovery';

// 🎯 PHASE 2B: Import unified loading system for coordination
import { 
  loadingStateManager, 
  LoadingOperation, 
  UserType 
} from '@/managers/LoadingStateManager';
import { enhancedCacheManager } from '@/services/EnhancedCacheManager';

interface CachedSpaceInfo {
  id: string;
  subdomain: string;
  name: string;
  isOwned: boolean;
  timestamp: number;
}

interface SpaceRedirectResult {
  redirected: boolean;
  strategy: string;
  spaceInfo?: CachedSpaceInfo;
  reason?: string;
}

class SmartSpaceRedirector {
  private static readonly CACHE_KEYS = {
    LAST_SPACE: 'lastActiveSpace',
    OWNED_SPACES: 'ownedSpaces',
    MEMBER_SPACES: 'memberSpaces',
    REDIRECT_TIMESTAMP: 'lastRedirectTimestamp'
  };
  
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  /**
   * 🎯 STRATEGY 1: Instant Cache-Based Redirect
   * Check cached space info immediately without waiting for network
   */
  static async instantCacheRedirect(
    userId: string, 
    navigate: NavigateFunction, 
    currentPath: string
  ): Promise<SpaceRedirectResult> {
    
    // Skip if already in a space
    if (currentPath.includes('/space') && !currentPath.includes('/discover')) {
      return { redirected: false, strategy: 'already-in-space' };
    }
    
    try {
      // Check for immediately available cached space
      const cachedSpace = this.getCachedSpace();
      if (cachedSpace && this.isCacheValid(cachedSpace.timestamp)) {
        log.debug('Utils', '🚀 [SmartRedirect] INSTANT: Using cached space:', cachedSpace.name);
        
        const spaceUrl = `/${cachedSpace.subdomain}/space`;
        navigate(spaceUrl, { replace: true });
        
        return {
          redirected: true,
          strategy: 'instant-cache',
          spaceInfo: cachedSpace
        };
      }
      
      // Check localStorage for any space indicators
      const quickSpaceCheck = this.getQuickSpaceIndicators();
      if (quickSpaceCheck.hasSpaces) {
        log.debug('Utils', '🚀 [SmartRedirect] QUICK: Found space indicators, proceeding to fast lookup');
        return this.fastSpaceLookup(userId, navigate);
      }
      
      return { redirected: false, strategy: 'no-cache-available' };
      
    } catch (error) {
      log.warn('Utils', '🚀 [SmartRedirect] Cache redirect failed:', error);
      return { redirected: false, strategy: 'cache-error', reason: String(error) };
    }
  }
  
  /**
   * 🔥 STRATEGY 2: Fast Space Lookup with Emergency Recovery
   * 🚨 PHASE 8: Now uses emergency recovery system
   */
  static async fastSpaceLookup(
    userId: string, 
    navigate: NavigateFunction
  ): Promise<SpaceRedirectResult> {
    
    try {
      log.debug('Utils', '🔥 [SmartRedirect] FAST: Starting optimized space lookup with recovery');
      
      // 🚨 PHASE 8: Use emergency recovery instead of direct database queries
      const recoveryResult = await EmergencyDatabaseRecovery.safeSpaceQuery(
        userId,
        {
          retryAttempts: 2,
          fallbackToPublic: false, // For redirect, we want user's actual spaces
          useCache: true
        }
      );

      if (recoveryResult.success && recoveryResult.data) {
        // Find the best space to redirect to
        const spaces = recoveryResult.data;
        
        // Prioritize spaces where user has access
        for (const space of spaces) {
          const membershipCheck = await EmergencyDatabaseRecovery.safeMembershipCheck(
            space.id,
            userId
          );
          
          if (membershipCheck.isMember || membershipCheck.isOwner) {
            const spaceInfo: CachedSpaceInfo = {
              id: space.id,
              subdomain: space.subdomain,
              name: space.name,
              isOwned: membershipCheck.isOwner,
              timestamp: Date.now()
            };
            
            this.cacheSpaceInfo(spaceInfo);
            
            return {
              redirected: true,
              strategy: `fast-recovery-${membershipCheck.strategy}`,
              spaceInfo
            };
          }
        }
      }
      
      return { redirected: false, strategy: 'no-user-spaces-found' };
      
    } catch (error) {
      log.error('Utils', '🔥 [SmartRedirect] Fast lookup failed:', error);
      return { redirected: false, strategy: 'lookup-error', reason: String(error) };
    }
  }
  
  /**
   * 🎯 PHASE 8: SAFE DATABASE QUERY
   * Replaces the old checkAllUserSpaces with emergency recovery
   */
  private static async checkAllUserSpaces(userId: string): Promise<SpaceRedirectResult> {
    try {
      log.debug('Utils', '🚨 [SmartRedirect] Using emergency recovery for space check');
      
      const recoveryResult = await EmergencyDatabaseRecovery.safeSpaceQuery(
        userId,
        {
          retryAttempts: 1,
          fallbackToPublic: false,
          useCache: false // For redirects, we want fresh data
        }
      );

      if (recoveryResult.success && recoveryResult.data) {
        const spaces = recoveryResult.data;
        
        // Check for owned spaces first (highest priority)
        for (const space of spaces) {
          const membershipCheck = await EmergencyDatabaseRecovery.safeMembershipCheck(
            space.id,
            userId
          );
          
          if (membershipCheck.isOwner) {
            return {
              redirected: true,
              strategy: `owned-space-recovery-${membershipCheck.strategy}`,
              spaceInfo: {
                id: space.id,
                subdomain: space.subdomain,
                name: space.name,
                isOwned: true,
                timestamp: Date.now()
              }
            };
          }
        }
        
        // Then check for member spaces
        for (const space of spaces) {
          const membershipCheck = await EmergencyDatabaseRecovery.safeMembershipCheck(
            space.id,
            userId
          );
          
          if (membershipCheck.isMember) {
            return {
              redirected: true,
              strategy: `member-space-recovery-${membershipCheck.strategy}`,
              spaceInfo: {
                id: space.id,
                subdomain: space.subdomain,
                name: space.name,
                isOwned: false,
                timestamp: Date.now()
              }
            };
          }
        }
      }

      return { redirected: false, strategy: 'no-spaces-found' };
      
    } catch (error) {
      log.warn('Utils', '🚨 [SmartRedirect] Emergency recovery failed:', error);
      return { redirected: false, strategy: 'recovery-error', reason: String(error) };
    }
  }
  
  /**
   * ⚡ STRATEGY 3: Gentle Discover Override (Updated for Public Access)
   * Only override discover for users who didn't explicitly navigate there
   */
  static async aggressiveDiscoverOverride(
    userId: string, 
    navigate: NavigateFunction
  ): Promise<SpaceRedirectResult> {
    
    try {
      log.debug('Utils', '⚡ [SmartRedirect] GENTLE: Checking discover override with user intent awareness');
      
      // 🚀 NEW: Check if user explicitly wants to stay on discover
      const userExplicitlyWantsDiscover = sessionStorage.getItem('userWantsDiscover') === 'true';
      const userJustSignedIn = sessionStorage.getItem('justSignedIn') === 'true';
      
      if (userExplicitlyWantsDiscover && !userJustSignedIn) {
        log.debug('Utils', '⚡ [SmartRedirect] GENTLE: User explicitly chose discover, respecting choice');
        return { redirected: false, strategy: 'user-explicit-discover-choice' };
      }
      
      // Clear the flags since we've processed them
      sessionStorage.removeItem('userWantsDiscover');
      sessionStorage.removeItem('justSignedIn');
      
      // Quick check if user has any spaces using recovery system
      const hasSpacesResult = await EmergencyDatabaseRecovery.safeSpaceQuery(
        userId,
        {
          retryAttempts: 1,
          fallbackToPublic: false,
          useCache: true
        }
      );
      
      if (hasSpacesResult.success && hasSpacesResult.data && hasSpacesResult.data.length > 0) {
        // User has spaces, redirect to first available one
        const space = hasSpacesResult.data[0];
        
        const membershipCheck = await EmergencyDatabaseRecovery.safeMembershipCheck(
          space.id,
          userId
        );
        
        if (membershipCheck.isMember || membershipCheck.isOwner) {
          log.debug('Utils', '⚡ [SmartRedirect] GENTLE: User has accessible space, redirecting');
          
          const spaceInfo: CachedSpaceInfo = {
            id: space.id,
            subdomain: space.subdomain,
            name: space.name,
            isOwned: membershipCheck.isOwner,
            timestamp: Date.now()
          };
          
          navigate(`/${space.subdomain}/space`, { replace: true });
          this.cacheSpaceInfo(spaceInfo);
          
          return {
            redirected: true,
            strategy: 'gentle-discover-override',
            spaceInfo
          };
        }
      }
      
      return { redirected: false, strategy: 'no-override-needed' };
      
    } catch (error) {
      log.warn('Utils', '⚡ [SmartRedirect] Gentle override failed:', error);
      return { redirected: false, strategy: 'override-error', reason: String(error) };
    }
  }
  
  /**
   * 🎪 STRATEGY 4: Progressive Space Loading
   * Show space-aware loading states during redirect
   */
  static showProgressiveLoading(expectedSpaceName?: string): void {
    // This would integrate with your loading UI
    const loadingMessage = expectedSpaceName 
      ? `Taking you to ${expectedSpaceName}...`
      : 'Finding your space...';
      
    log.debug('Utils', '🎪 [SmartRedirect] PROGRESSIVE:', loadingMessage);
    
    // You could emit events here for your loading UI to consume
    window.dispatchEvent(new CustomEvent('smartRedirectProgress', {
      detail: { message: loadingMessage, stage: 'loading' }
    }));
  }
  
  /**
   * 🏆 MASTER REDIRECT ORCHESTRATOR
   * Coordinates all strategies for optimal UX
   * 🎯 PHASE 2B: Enhanced with LoadingStateManager coordination
   */
  static async masterRedirect(
    userId: string, 
    navigate: NavigateFunction, 
    currentPath: string,
    fromDiscover: boolean = false
  ): Promise<SpaceRedirectResult> {
    
    // 🎯 PHASE 2B: Check if operation is already in progress
    if (loadingStateManager.isOperationInProgress(LoadingOperation.SPACE_DETECTION)) {
      log.debug('Utils', '🚫 [SmartRedirect] COORDINATION: SPACE_DETECTION already in progress, skipping duplicate operation');
      return { redirected: false, strategy: 'operation-in-progress' };
    }
    
    // 🎯 PHASE 2B: Try enhanced cache manager first for instant results
    const cacheResult = loadingStateManager.attemptInstantCacheAccess(userId);
    if (cacheResult.found && cacheResult.isValid) {
      log.debug('Utils', `🚀 [SmartRedirect] INSTANT CACHE: Using ${cacheResult.source} for immediate redirect`);
      
      let spaceData = null;
      if (typeof cacheResult.data === 'string') {
        try {
          spaceData = JSON.parse(cacheResult.data);
        } catch {
          spaceData = null;
        }
      } else {
        spaceData = cacheResult.data;
      }
      
      if (spaceData && spaceData.subdomain) {
        const spaceUrl = `/${spaceData.subdomain}/space`;
        navigate(spaceUrl, { replace: true });
        
        return {
          redirected: true,
          strategy: 'enhanced-cache-instant',
          spaceInfo: spaceData
        };
      }
    }
    
    // 🎯 PHASE 2B: Start coordinated operation
    const operationStarted = loadingStateManager.startOperation(
      LoadingOperation.SPACE_DETECTION,
      { userId, source: 'SmartRedirect', currentPath, fromDiscover }
    );
    
    if (!operationStarted) {
      log.debug('Utils', '🚫 [SmartRedirect] COORDINATION: Operation blocked by LoadingStateManager');
      return { redirected: false, strategy: 'operation-blocked' };
    }
    
    log.debug('Utils', '🏆 [SmartRedirect] MASTER: Starting intelligent space redirect for user:', userId);
    log.debug('Utils', '🏆 [SmartRedirect] Current path:', currentPath, 'From discover:', fromDiscover);
    
    try {
      let result: SpaceRedirectResult;
      
      // If coming from discover page, be extra aggressive
      if (fromDiscover || currentPath === '/discover') {
        result = await this.aggressiveDiscoverOverride(userId, navigate);
      } else {
        // Try instant cache redirect first
        const instantResult = await this.instantCacheRedirect(userId, navigate, currentPath);
        if (instantResult.redirected) {
          result = instantResult;
        } else {
          // Fall back to fast lookup
          const fastResult = await this.fastSpaceLookup(userId, navigate);
          if (fastResult.redirected) {
            result = fastResult;
          } else {
            // No spaces found - user belongs on discover
            log.debug('Utils', '🏆 [SmartRedirect] MASTER: User has no spaces, directing to discover');
            if (currentPath !== '/discover') {
              navigate('/discover', { replace: true });
              result = { redirected: true, strategy: 'redirect-to-discover' };
            } else {
              result = { redirected: false, strategy: 'legitimate-discover-user' };
            }
          }
        }
      }
      
      // 🎯 PHASE 2B: Cache result in enhanced cache manager
      if (result.redirected && result.spaceInfo) {
        log.debug('Utils', `🎯 [SmartRedirect] Caching space data for instant future access: ${result.spaceInfo.name}`);
        enhancedCacheManager.cacheSpaceData(
          result.spaceInfo, 
          userId, 
          result.spaceInfo.isOwned ? UserType.SPACE_OWNER : UserType.MEMBER_ONLY
        );
      }
      
      // 🎯 PHASE 2B: Complete the coordinated operation
      loadingStateManager.completeOperation(LoadingOperation.SPACE_DETECTION, result.redirected);
      
      return result;
      
    } catch (error) {
      log.error('Utils', '🏆 [SmartRedirect] MASTER: Error during coordinated redirect:', error);
      loadingStateManager.completeOperation(LoadingOperation.SPACE_DETECTION, false);
      return { redirected: false, strategy: 'coordination-error', reason: String(error) };
    }
  }
  
  // ========================
  // HELPER METHODS
  // ========================
  
  private static getCachedSpace(): CachedSpaceInfo | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEYS.LAST_SPACE);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      log.warn('Utils', 'Failed to get cached space:', error);
      return null;
    }
  }
  
  private static isCacheValid(timestamp: number): boolean {
    return (Date.now() - timestamp) < this.CACHE_TTL;
  }
  
  private static getQuickSpaceIndicators(): { hasSpaces: boolean, indicators: string[] } {
    const indicators: string[] = [];
    
    // Check various localStorage keys for space evidence
    const keys = ['lastJoinedSpace', 'lastCreatedSpace', 'lastVisitedSpace', 'selectedSpaceId'];
    keys.forEach(key => {
      if (localStorage.getItem(key)) {
        indicators.push(key);
      }
    });
    
    // Check for space-related sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('space') || key.includes('Space')) {
        indicators.push(`session:${key}`);
      }
    });
    
    return { hasSpaces: indicators.length > 0, indicators };
  }
  
  private static cacheSpaceInfo(spaceInfo: CachedSpaceInfo): void {
    try {
      localStorage.setItem(this.CACHE_KEYS.LAST_SPACE, JSON.stringify(spaceInfo));
      localStorage.setItem(this.CACHE_KEYS.REDIRECT_TIMESTAMP, Date.now().toString());
      log.debug('Utils', '🎯 [SmartRedirect] Cached space info for future instant redirects');
    } catch (error) {
      log.warn('Utils', 'Failed to cache space info:', error);
    }
  }
}

// Export the master orchestrator
export const smartSpaceRedirect = SmartSpaceRedirector.masterRedirect.bind(SmartSpaceRedirector);
export const instantSpaceRedirect = SmartSpaceRedirector.instantCacheRedirect.bind(SmartSpaceRedirector);
export const aggressiveDiscoverOverride = SmartSpaceRedirector.aggressiveDiscoverOverride.bind(SmartSpaceRedirector);

export default SmartSpaceRedirector; 