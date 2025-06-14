/**
 * 📱 Mobile Session Manager - Phase 1
 * 
 * Handles mobile-specific session recovery, background return detection,
 * and simplified auth flow for mobile devices.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { NavigateFunction } from 'react-router-dom';

interface MobileSessionState {
  lastActiveTimestamp: number;
  backgroundTimestamp: number;
  authState: 'verified' | 'checking' | 'failed' | 'unknown';
  lastActiveSpace: string | null;
  userId: string | null;
  isReturningFromBackground: boolean;
  mobileRecoveryAttempts: number;
}

interface MobileRecoveryResult {
  success: boolean;
  action: 'recovered' | 'reload' | 'redirect' | 'failed';
  redirectPath?: string;
  error?: string;
}

class MobileSessionManager {
  private static instance: MobileSessionManager;
  private state: MobileSessionState;
  private readonly BACKGROUND_THRESHOLD = 5000; // 5 seconds
  private readonly RECOVERY_TIMEOUT = 8000; // 8 seconds
  private readonly MAX_RECOVERY_ATTEMPTS = 3;
  private readonly CACHE_TTL = 300000; // 5 minutes

  private constructor() {
    this.state = {
      lastActiveTimestamp: Date.now(),
      backgroundTimestamp: 0,
      authState: 'unknown',
      lastActiveSpace: null,
      userId: null,
      isReturningFromBackground: false,
      mobileRecoveryAttempts: 0
    };

    this.initializeVisibilityListeners();
    this.loadPersistedState();
    
    if (typeof window !== 'undefined') {
      (window as any).mobileSessionManager = this;
    }
  }

  static getInstance(): MobileSessionManager {
    if (!MobileSessionManager.instance) {
      MobileSessionManager.instance = new MobileSessionManager();
    }
    return MobileSessionManager.instance;
  }

  /**
   * Initialize page visibility listeners for mobile background detection
   */
  private initializeVisibilityListeners(): void {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden) {
        // App going to background
        this.state.backgroundTimestamp = now;
        this.state.lastActiveTimestamp = now;
        this.persistState();
        
        console.log('📱 [MobileSessionManager] App backgrounded');
      } else {
        // App returning from background
        const timeInBackground = now - this.state.backgroundTimestamp;
        
        if (timeInBackground > this.BACKGROUND_THRESHOLD) {
          this.state.isReturningFromBackground = true;
          
          console.log(`📱 [MobileSessionManager] Returning from background after ${Math.round(timeInBackground / 1000)}s`);
          
          // Clear the flag after processing
          setTimeout(() => {
            this.state.isReturningFromBackground = false;
            this.persistState();
          }, 2000);
        }
        
        this.state.lastActiveTimestamp = now;
        this.persistState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => {
      this.state.lastActiveTimestamp = Date.now();
      this.persistState();
    });
  }

  /**
   * Detect if user is returning from mobile background
   */
  isReturningFromBackground(): boolean {
    return this.state.isReturningFromBackground;
  }

  /**
   * Get time spent in background
   */
  getBackgroundTime(): number {
    if (this.state.backgroundTimestamp === 0) return 0;
    return Date.now() - this.state.backgroundTimestamp;
  }

  /**
   * Clear stale states that might cause issues on mobile return
   */
  clearStaleStates(): void {
    console.log('📱 [MobileSessionManager] Clearing stale states');
    
    try {
      // Clear React Router stale states
      sessionStorage.removeItem('react-router-state');
      
      // Clear stale navigation states
      const navigationKeys = Object.keys(sessionStorage).filter(key => 
        key.includes('navigation') || key.includes('routing') || key.includes('redirect')
      );
      navigationKeys.forEach(key => sessionStorage.removeItem(key));
      
      // Clear stale loading states but preserve auth tokens
      const loadingKeys = Object.keys(sessionStorage).filter(key => 
        key.includes('loading') && !key.includes('auth') && !key.includes('token')
      );
      loadingKeys.forEach(key => sessionStorage.removeItem(key));
      
      console.log('📱 [MobileSessionManager] Cleared stale states');
    } catch (error) {
      console.warn('📱 [MobileSessionManager] Error clearing stale states:', error);
    }
  }

  /**
   * Simplified mobile auth check - faster, more reliable for mobile
   */
  async quickMobileAuthCheck(): Promise<{ authenticated: boolean; userId?: string; error?: string }> {
    try {
      console.log('📱 [MobileSessionManager] Quick mobile auth check');
      
      // First check localStorage for token (fastest)
      const hasLocalToken = Object.keys(localStorage).some(key => 
        key.startsWith('sb-') && key.includes('auth.token')
      );
      
      if (!hasLocalToken) {
        this.state.authState = 'failed';
        return { authenticated: false, error: 'No local token found' };
      }
      
      // Quick session check with short timeout for mobile
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Mobile auth timeout')), 3000);
      });
      
      const sessionPromise = getSupabaseClient().auth.getSession();
      const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (error || !data.session) {
        this.state.authState = 'failed';
        return { authenticated: false, error: error?.message || 'No session' };
      }
      
      this.state.authState = 'verified';
      this.state.userId = data.session.user.id;
      this.persistState();
      
      return { 
        authenticated: true, 
        userId: data.session.user.id 
      };
      
    } catch (error) {
      this.state.authState = 'failed';
      this.persistState();
      
      return { 
        authenticated: false, 
        error: error instanceof Error ? error.message : 'Unknown auth error' 
      };
    }
  }

  /**
   * Get cached space information for mobile recovery
   */
  getCachedSpaceInfo(): { subdomain: string; id: string; name: string } | null {
    try {
      // Check multiple cache sources in order of preference
      const cacheKeys = [
        'lastActiveSpace',
        'lastVisitedSpace', 
        'lastJoinedSpace',
        'lastCreatedSpace'
      ];
      
      for (const key of cacheKeys) {
        const cached = localStorage.getItem(key);
        if (!cached) continue;
        
        try {
          const data = JSON.parse(cached);
          if (data?.subdomain && data?.id) {
            // Validate cache age
            const age = data.timestamp ? Date.now() - data.timestamp : Infinity;
            if (age < this.CACHE_TTL) {
              console.log(`📱 [MobileSessionManager] Found valid cache in ${key}`);
              return {
                subdomain: data.subdomain,
                id: data.id,
                name: data.name || data.subdomain
              };
            }
          }
        } catch (parseError) {
          // Continue to next cache key
        }
      }
      
      return null;
    } catch (error) {
      console.warn('📱 [MobileSessionManager] Error getting cached space:', error);
      return null;
    }
  }

  /**
   * Check if current URL indicates we should be in a space
   */
  private getCurrentSpaceFromURL(): { subdomain: string } | null {
    try {
      const path = window.location.pathname;
      const match = path.match(/^\/([^\/]+)\/?/);
      if (match && match[1] && match[1] !== 'app' && match[1] !== 'discover' && match[1] !== 'login') {
        return { subdomain: match[1] };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Perform mobile recovery sequence
   */
  async performMobileRecovery(navigate?: NavigateFunction): Promise<MobileRecoveryResult> {
    console.log('📱 [MobileSessionManager] Starting mobile recovery');
    
    // Increment recovery attempts
    this.state.mobileRecoveryAttempts++;
    this.persistState();
    
    // Prevent infinite recovery loops
    if (this.state.mobileRecoveryAttempts > this.MAX_RECOVERY_ATTEMPTS) {
      console.warn('📱 [MobileSessionManager] Max recovery attempts reached, forcing reload');
      return this.forceReload();
    }
    
    try {
      // Step 1: Clear stale states
      this.clearStaleStates();
      
      // Step 2: Quick auth check
      const authResult = await this.quickMobileAuthCheck();
      if (!authResult.authenticated) {
        console.log('📱 [MobileSessionManager] Auth failed, redirecting to login');
        return {
          success: false,
          action: 'redirect',
          redirectPath: '/',
          error: authResult.error
        };
      }
      
      // Step 3: Check if we're currently on a space URL that's stuck
      const currentSpace = this.getCurrentSpaceFromURL();
      if (currentSpace && navigate) {
        const currentPath = window.location.pathname;
        const targetPath = `/${currentSpace.subdomain}/space`;
        
        console.log(`📱 [MobileSessionManager] Stuck on space URL, forcing navigation refresh: ${targetPath}`);
        
        // CRITICAL: Set recent auth cache to bypass loading on refresh
        if (authResult.userId) {
          sessionStorage.setItem(`recent_auth_${currentSpace.subdomain}_${authResult.userId}`, JSON.stringify({
            timestamp: Date.now(),
            source: 'mobile-recovery'
          }));
          console.log(`📱 [MobileSessionManager] Set recent auth cache for ${currentSpace.subdomain}`);
        }
        
        // Force a clean navigation to the same space
        // This often resolves stuck loading states
        navigate(targetPath, { 
          replace: true,
          state: { 
            mobileRecovery: true,
            forceRefresh: true,
            timestamp: Date.now()
          }
        });
        
        // Reset recovery attempts on successful navigation
        this.state.mobileRecoveryAttempts = 0;
        this.persistState();
        
        return {
          success: true,
          action: 'recovered',
          redirectPath: targetPath
        };
      }
      
      // Step 4: Try to recover to last known space
      const cachedSpace = this.getCachedSpaceInfo();
      if (cachedSpace && navigate) {
        const targetPath = `/${cachedSpace.subdomain}/space`;
        
        console.log(`📱 [MobileSessionManager] Recovering to cached space: ${targetPath}`);
        
        // CRITICAL: Set recent auth cache to bypass loading on recovery
        if (authResult.userId) {
          sessionStorage.setItem(`recent_auth_${cachedSpace.subdomain}_${authResult.userId}`, JSON.stringify({
            timestamp: Date.now(),
            source: 'mobile-recovery-cached'
          }));
          console.log(`📱 [MobileSessionManager] Set recent auth cache for cached space ${cachedSpace.subdomain}`);
        }
        
        // Navigate with mobile recovery flag
        navigate(targetPath, { 
          replace: true,
          state: { 
            mobileRecovery: true,
            skipLoading: true,
            preserveSpace: true 
          }
        });
        
        // Reset recovery attempts on successful navigation
        this.state.mobileRecoveryAttempts = 0;
        this.persistState();
        
        return {
          success: true,
          action: 'recovered',
          redirectPath: targetPath
        };
      }
      
      // Step 5: Fallback to app root if no cached space
      if (navigate) {
        console.log('📱 [MobileSessionManager] No cached space, redirecting to /app');
        navigate('/app', { replace: true, state: { mobileRecovery: true } });
        
        return {
          success: true,
          action: 'redirect',
          redirectPath: '/app'
        };
      }
      
      return {
        success: false,
        action: 'failed',
        error: 'No navigation function available'
      };
      
    } catch (error) {
      console.error('📱 [MobileSessionManager] Recovery error:', error);
      
      // If recovery fails and we've tried multiple times, force reload
      if (this.state.mobileRecoveryAttempts >= 2) {
        return this.forceReload();
      }
      
      return {
        success: false,
        action: 'failed',
        error: error instanceof Error ? error.message : 'Unknown recovery error'
      };
    }
  }

  /**
   * Force reload as last resort
   */
  private forceReload(): MobileRecoveryResult {
    console.log('📱 [MobileSessionManager] Forcing page reload');
    
    try {
      // CRITICAL: Set recent auth cache before reload to prevent re-stuck
      const currentSpace = this.getCurrentSpaceFromURL();
      if (currentSpace && this.state.userId) {
        sessionStorage.setItem(`recent_auth_${currentSpace.subdomain}_${this.state.userId}`, JSON.stringify({
          timestamp: Date.now(),
          source: 'mobile-force-reload'
        }));
        console.log(`📱 [MobileSessionManager] Set recent auth cache before reload for ${currentSpace.subdomain}`);
      }
      
      // Clear mobile-specific flags before reload
      sessionStorage.removeItem('mobile-session-state');
      window.location.reload();
      
      return {
        success: true,
        action: 'reload'
      };
    } catch (error) {
      return {
        success: false,
        action: 'failed',
        error: 'Failed to reload page'
      };
    }
  }

  /**
   * Check if we're likely stuck in a loading state
   */
  isLikelyStuck(loadingDuration: number): boolean {
    return (
      this.isReturningFromBackground() && 
      loadingDuration > this.RECOVERY_TIMEOUT
    );
  }

  /**
   * Reset mobile recovery state
   */
  resetRecoveryState(): void {
    this.state.mobileRecoveryAttempts = 0;
    this.state.isReturningFromBackground = false;
    this.persistState();
  }

  /**
   * Persist state to sessionStorage
   */
  private persistState(): void {
    try {
      sessionStorage.setItem('mobile-session-state', JSON.stringify(this.state));
    } catch (error) {
      console.warn('📱 [MobileSessionManager] Failed to persist state:', error);
    }
  }

  /**
   * Load persisted state from sessionStorage
   */
  private loadPersistedState(): void {
    try {
      const persisted = sessionStorage.getItem('mobile-session-state');
      if (persisted) {
        const parsedState = JSON.parse(persisted);
        this.state = { ...this.state, ...parsedState };
        
        // Reset background return flag on load (new session)
        this.state.isReturningFromBackground = false;
      }
    } catch (error) {
      console.warn('📱 [MobileSessionManager] Failed to load persisted state:', error);
    }
  }

  /**
   * Get current state for debugging
   */
  getState(): MobileSessionState {
    return { ...this.state };
  }

  /**
   * Update space cache when user navigates to a space
   */
  updateSpaceCache(spaceData: { id: string; subdomain: string; name: string }): void {
    this.state.lastActiveSpace = spaceData.subdomain;
    this.persistState();
    
    // Also update localStorage cache
    try {
      localStorage.setItem('lastActiveSpace', JSON.stringify({
        ...spaceData,
        timestamp: Date.now(),
        userId: this.state.userId
      }));
    } catch (error) {
      console.warn('📱 [MobileSessionManager] Failed to update space cache:', error);
    }
  }
}

// Export singleton instance
export const mobileSessionManager = MobileSessionManager.getInstance();

// Debug helpers for development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugMobileSession = () => {
    console.log('📱 [Debug] Mobile Session State:', mobileSessionManager.getState());
    console.log('📱 [Debug] Background Time:', mobileSessionManager.getBackgroundTime());
    console.log('📱 [Debug] Cached Space:', mobileSessionManager.getCachedSpaceInfo());
  };
} 