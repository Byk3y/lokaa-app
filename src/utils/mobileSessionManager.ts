import { log } from '@/utils/logger';
/**
 * 📱 Mobile Session Manager - Phase 3.2
 * 
 * Handles mobile-specific session recovery, background return detection,
 * and simplified auth flow for mobile devices.
 * 
 * Enhanced with content URL support for space context detection.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { NavigateFunction } from 'react-router-dom';
import { shouldEnableMobileFeatures } from './mobileDetection';
import { isSpaceRelatedUrl, extractSpaceFromUrl, getContentTypeFromUrl } from './spaceContextUtils';

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

// PHASE 1: Enhanced session validation and recovery types
interface SessionValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  error?: string;
  action: 'valid' | 'refreshed' | 'expired' | 'failed';
}

interface SmartRecoveryOptions {
  retryCount?: number;
  maxRetries?: number;
  exponentialBackoff?: boolean;
  proactiveValidation?: boolean;
}

class MobileSessionManager {
  private static instance: MobileSessionManager;
  private state: MobileSessionState;
  private readonly BACKGROUND_THRESHOLD = 30000; // 30 seconds
  private readonly RECOVERY_TIMEOUT = 8000; // 8 seconds
  private readonly MAX_RECOVERY_ATTEMPTS = 3;
  private readonly CACHE_TTL = 300000; // 5 minutes
  
  // ENHANCED: More patient constants for long background sessions
  private readonly SESSION_VALIDATION_THRESHOLD = 30000; // 30 seconds background triggers validation
  private readonly SESSION_REFRESH_THRESHOLD = 300000; // 5 minutes triggers refresh
  private readonly MAX_VALIDATION_RETRIES = 5; // Increased retries for mobile browsers
  private readonly RETRY_DELAYS = [1000, 2000, 4000, 8000, 15000]; // Extended exponential backoff
  private readonly LONG_BACKGROUND_THRESHOLD = 60000; // 1 minute = long background

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
      // PHASE 1: Expose new validation methods for debugging
      (window as any).validateMobileSession = () => this.validateSessionProactively();
      (window as any).getMobileSessionState = () => this.getSessionState();
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
   * Only activates on actual mobile devices
   */
  private initializeVisibilityListeners(): void {
    if (typeof document === 'undefined') return;

    // OPTION C FIX: Check disable flag - don't initialize if Mobile Event Coordinator is managing events
    if (typeof window !== 'undefined' && (window as any).DISABLE_MOBILE_SESSION_MANAGER) {
      log.debug('Utils', '🔧 [MobileSessionManager] DISABLED - Mobile Event Coordinator is managing events');
      return;
    }

    // Only enable mobile session management on actual mobile devices
    if (!shouldEnableMobileFeatures()) {
      log.debug('Utils', '📱 [MobileSessionManager] Desktop detected - mobile session management disabled');
      return;
    }

    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden) {
        // App going to background
        this.state.backgroundTimestamp = now;
        this.state.lastActiveTimestamp = now;
        this.persistState();
        
        log.debug('Utils', '📱 [MobileSessionManager] App backgrounded');
      } else {
        // App returning from background
        const timeInBackground = now - this.state.backgroundTimestamp;
        
        if (timeInBackground > this.BACKGROUND_THRESHOLD) {
          this.state.isReturningFromBackground = true;
          
          log.debug('Utils', `📱 [MobileSessionManager] Returning from background after ${Math.round(timeInBackground / 1000)}s`);
          
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
    
    const handleFocus = () => {
      this.state.lastActiveTimestamp = Date.now();
      this.persistState();
    };
    
    window.addEventListener('focus', handleFocus);
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
    log.debug('Utils', '📱 [MobileSessionManager] Clearing stale states');
    
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
      
      log.debug('Utils', '📱 [MobileSessionManager] Cleared stale states');
    } catch (error) {
      log.warn('Utils', '📱 [MobileSessionManager] Error clearing stale states:', error);
    }
  }

  /**
   * Simplified mobile auth check - faster, more reliable for mobile
   */
  async quickMobileAuthCheck(): Promise<{ authenticated: boolean; userId?: string; error?: string }> {
    try {
      log.debug('Utils', '📱 [MobileSessionManager] Quick mobile auth check');
      
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
              log.debug('Utils', `📱 [MobileSessionManager] Found valid cache in ${key}`);
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
      log.warn('Utils', '📱 [MobileSessionManager] Error getting cached space:', error);
      return null;
    }
  }

  /**
   * Check if current URL indicates we should be in a space
   * Enhanced to recognize all space-related content URLs
   */
  private getCurrentSpaceFromURL(): { subdomain: string; contentType?: string } | null {
    try {
      const path = window.location.pathname;
      
      // Use utility function to check if this is a space-related URL
      if (!isSpaceRelatedUrl(path)) {
        return null;
      }
      
      // Extract space subdomain using utility function
      const subdomain = extractSpaceFromUrl(path);
      if (!subdomain) {
        return null;
      }
      
      // Skip non-space subdomains
      if (['app', 'discover', 'login', 'create-space', 'profile'].includes(subdomain)) {
        return null;
      }
      
      // Get content type for enhanced logging
      const contentType = getContentTypeFromUrl(path);
      
      log.debug('Utils', `📱 [MobileSessionManager] Detected ${contentType || 'space'} URL: ${path} → space: ${subdomain}`);
      
      return { 
        subdomain,
        contentType: contentType || undefined
      };
    } catch (error) {
      log.warn('Utils', '📱 [MobileSessionManager] Error extracting space from URL:', error);
      return null;
    }
  }

  /**
   * PHASE 1: Proactive session validation when returning from background
   */
  async validateSessionProactively(options: SmartRecoveryOptions = {}): Promise<SessionValidationResult> {
    const { 
      retryCount = 0, 
      maxRetries = this.MAX_VALIDATION_RETRIES,
      exponentialBackoff = true,
      proactiveValidation = true 
    } = options;
    
    log.debug('Utils', `📱 [Phase1] Proactive session validation (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    try {
      // Step 1: Check if session validation is needed
      const timeInBackground = Date.now() - this.state.backgroundTimestamp;
      const shouldValidate = timeInBackground > this.SESSION_VALIDATION_THRESHOLD || proactiveValidation;
      const isLongBackground = timeInBackground > this.LONG_BACKGROUND_THRESHOLD;
      
      if (!shouldValidate) {
        log.debug('Utils', '📱 [Phase1] Session validation not needed - short background duration');
        return { isValid: true, needsRefresh: false, action: 'valid' };
      }
      
      log.debug('Utils', `📱 [Phase1] Session validation needed - background: ${Math.round(timeInBackground/1000)}s, longBackground: ${isLongBackground}`);
      
      // Step 2: Quick session check with timeout (longer timeout for long backgrounds)
      const sessionTimeout = isLongBackground ? 10000 : 5000; // 10s for long backgrounds, 5s for normal
      const sessionPromise = getSupabaseClient().auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Session validation timeout after ${sessionTimeout}ms`)), sessionTimeout);
      });
      
      const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (error) {
        throw new Error(`Session check failed: ${error.message}`);
      }
      
      if (!data.session) {
        log.debug('Utils', '📱 [Phase1] No active session found');
        return { isValid: false, needsRefresh: false, action: 'expired' };
      }
      
      // Step 3: Check session expiry and age
      const session = data.session;
      const now = Date.now();
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const sessionAge = now - (session.refresh_token ? 0 : now - 3600000); // Estimate age
      
      const isExpiredSoon = expiresAt - now < 300000; // Expires in 5 minutes
      const isOldSession = sessionAge > this.SESSION_REFRESH_THRESHOLD;
      
      if (expiresAt <= now) {
        log.debug('Utils', '📱 [Phase1] Session expired');
        return { isValid: false, needsRefresh: true, action: 'expired' };
      }
      
      // Step 4: Proactive refresh if session is old or expires soon
      if (isExpiredSoon || isOldSession) {
        log.debug('Utils', `📱 [Phase1] Session needs refresh - expires soon: ${isExpiredSoon}, old: ${isOldSession}`);
        
        try {
          const refreshPromise = getSupabaseClient().auth.refreshSession();
          const refreshTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Session refresh timeout')), 8000);
          });
          
          const { data: refreshData, error: refreshError } = await Promise.race([
            refreshPromise, 
            refreshTimeoutPromise
          ]);
          
          if (refreshError || !refreshData.session) {
            throw new Error(`Session refresh failed: ${refreshError?.message || 'No session returned'}`);
          }
          
          log.debug('Utils', '📱 [Phase1] Session refreshed successfully');
          this.state.authState = 'verified';
          this.persistState();
          
          return { isValid: true, needsRefresh: false, action: 'refreshed' };
        } catch (refreshError) {
          log.warn('Utils', '📱 [Phase1] Session refresh failed:', refreshError);
          // Continue with existing session if refresh fails but session is still valid
          if (expiresAt > now + 60000) { // At least 1 minute left
            return { isValid: true, needsRefresh: true, action: 'valid' };
          }
          throw refreshError;
        }
      }
      
      // Step 5: Test session with a simple API call with 401 handling
      const testPromise = getSupabaseClient()
        .from('spaces')
        .select('id')
        .limit(1);
      const testTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('API test timeout')), 3000);
      });
      
      const { error: testError } = await Promise.race([testPromise, testTimeoutPromise]);
      
      if (testError) {
        // Check for 401 unauthorized error - indicates session needs refresh
        if (testError.message?.includes('401') || 
            testError.message?.includes('unauthorized') ||
            testError.message?.includes('JWT') ||
            testError.message?.includes('token')) {
          
          log.debug('Utils', '📱 [MobileSession] 401 error detected, attempting emergency session refresh');
          
          try {
            // Attempt session refresh
            const { data: refreshData, error: refreshError } = await getSupabaseClient().auth.refreshSession();
            
            if (refreshError || !refreshData.session) {
              log.warn('Utils', '📱 [MobileSession] Emergency session refresh failed');
              throw new Error(`Session expired and refresh failed: ${refreshError?.message}`);
            }
            
            log.debug('Utils', '📱 [MobileSession] Emergency session refresh successful');
            this.state.authState = 'verified';
            this.persistState();
            
            // Don't throw - continue with successful validation
            
          } catch (refreshException) {
            log.warn('Utils', '📱 [MobileSession] Emergency session refresh exception:', refreshException);
            throw new Error(`Session refresh exception: ${refreshException}`);
          }
        } else {
        throw new Error(`API connectivity test failed: ${testError.message}`);
        }
      }
      
      log.debug('Utils', '📱 [Phase1] Session validation successful');
      this.state.authState = 'verified';
      this.persistState();
      
      return { isValid: true, needsRefresh: false, action: 'valid' };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      log.warn('Utils', `📱 [Phase1] Session validation failed (attempt ${retryCount + 1}):`, errorMessage);
      
      // PHASE 1: Smart retry logic with exponential backoff
      if (retryCount < maxRetries) {
        const delay = exponentialBackoff ? this.RETRY_DELAYS[retryCount] || 4000 : 1000;
        
        log.debug('Utils', `📱 [Phase1] Retrying session validation in ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.validateSessionProactively({
          ...options,
          retryCount: retryCount + 1
        });
      }
      
      this.state.authState = 'failed';
      this.persistState();
      
      return { 
        isValid: false, 
        needsRefresh: false, 
        action: 'failed',
        error: errorMessage 
      };
    }
  }

  /**
   * PHASE 1: Enhanced recovery with proactive session validation
   */
  async performEnhancedMobileRecovery(navigate?: NavigateFunction): Promise<MobileRecoveryResult> {
    log.debug('Utils', '📱 [Phase1] Starting enhanced mobile recovery with proactive validation');
    
    // Increment recovery attempts
    this.state.mobileRecoveryAttempts++;
    this.persistState();
    
    // ENHANCED: Check background duration for more patient recovery
    const backgroundDuration = Date.now() - this.state.backgroundTimestamp;
    const isLongBackground = backgroundDuration > this.LONG_BACKGROUND_THRESHOLD;
    const maxAttempts = isLongBackground ? this.MAX_RECOVERY_ATTEMPTS + 2 : this.MAX_RECOVERY_ATTEMPTS; // More attempts for long backgrounds
    
    // Prevent infinite recovery loops
    if (this.state.mobileRecoveryAttempts > maxAttempts) {
      log.warn('Utils', `📱 [Phase1] Max recovery attempts reached (${this.state.mobileRecoveryAttempts}/${maxAttempts}), returning success to avoid refresh`);
      // Reset attempts and return success to prevent forced reload
      this.state.mobileRecoveryAttempts = 0;
      this.persistState();
      return {
        success: true,
        action: 'recovered',
        error: `Max attempts reached after ${Math.round(backgroundDuration/1000)}s background - maintaining current state`
      };
    }
    
    try {
      // PHASE 1: Step 1 - Proactive session validation
      log.debug('Utils', '📱 [Phase1] Step 1: Proactive session validation');
      const validationResult = await this.validateSessionProactively({
        proactiveValidation: true,
        exponentialBackoff: true
      });
      
      if (!validationResult.isValid) {
        log.debug('Utils', '📱 [Phase1] Session validation failed, redirecting to login');
        return {
          success: false,
          action: 'redirect',
          redirectPath: '/',
          error: validationResult.error || 'Session validation failed'
        };
      }
      
      log.debug('Utils', `📱 [Phase1] Session validation successful - action: ${validationResult.action}`);
      
      // Step 2: Clear stale states
      this.clearStaleStates();
      
      // Step 3: Integration with health monitor for comprehensive recovery
      if (typeof window !== 'undefined' && (window as any).supabaseHealthMonitor) {
        log.debug('Utils', '📱 [Phase1] Step 3: Health monitor integration');
        try {
          const healthStatus = (window as any).supabaseHealthMonitor.getHealthStatus();
          if (!healthStatus.isHealthy && !healthStatus.isRecovering) {
            log.debug('Utils', '📱 [Phase1] Triggering health monitor recovery');
            await (window as any).supabaseHealthMonitor.recoverClient();
          }
        } catch (healthError) {
          log.warn('Utils', '📱 [Phase1] Health monitor recovery failed:', healthError);
          // Continue with mobile recovery even if health monitor fails
        }
      }
      
      // Step 4: Enhanced navigation recovery
      const currentSpace = this.getCurrentSpaceFromURL();
      if (currentSpace && navigate) {
        const currentPath = window.location.pathname;
        const targetPath = `/${currentSpace.subdomain}/space`;
        
        log.debug('Utils', `📱 [Phase1] Step 4: Enhanced navigation recovery to: ${targetPath}`);
        
        // PHASE 1: Set enhanced auth cache with session validation timestamp
        if (this.state.userId) {
          const cacheData = {
            timestamp: Date.now(),
            source: 'phase1-enhanced-recovery',
            sessionValidated: true,
            sessionAction: validationResult.action,
            backgroundDuration: Date.now() - this.state.backgroundTimestamp
          };
          
          sessionStorage.setItem(
            `recent_auth_${currentSpace.subdomain}_${this.state.userId}`, 
            JSON.stringify(cacheData)
          );
          
          // Set phase1 recovery flag for components to detect
          sessionStorage.setItem('phase1_recovery_active', JSON.stringify({
            timestamp: Date.now(),
            spaceId: currentSpace.subdomain,
            validationResult: validationResult.action
          }));
          
          log.debug('Utils', `📱 [Phase1] Set enhanced auth cache for ${currentSpace.subdomain}`);
        }
        
        // Gentle navigation with phase1 recovery state (avoid force refresh)
        navigate(targetPath, { 
          replace: false, // Don't replace - let user go back if needed
          state: { 
            phase1Recovery: true,
            sessionValidated: true,
            validationAction: validationResult.action,
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
      
      // Step 5: Try to recover to last known space with validation
      const cachedSpace = this.getCachedSpaceInfo();
      if (cachedSpace && navigate) {
        const targetPath = `/${cachedSpace.subdomain}/space`;
        
        log.debug('Utils', `📱 [Phase1] Step 5: Enhanced cached space recovery: ${targetPath}`);
        
        // PHASE 1: Set enhanced cache for cached space recovery
        if (this.state.userId) {
          const cacheData = {
            timestamp: Date.now(),
            source: 'phase1-cached-recovery',
            sessionValidated: true,
            sessionAction: validationResult.action,
            backgroundDuration: Date.now() - this.state.backgroundTimestamp
          };
          
          sessionStorage.setItem(
            `recent_auth_${cachedSpace.subdomain}_${this.state.userId}`, 
            JSON.stringify(cacheData)
          );
          
          log.debug('Utils', `📱 [Phase1] Set enhanced auth cache for cached space ${cachedSpace.subdomain}`);
        }
        
        // Navigate with enhanced phase1 recovery flag (gentle approach)
        navigate(targetPath, { 
          replace: false, // Don't force replace
          state: { 
            phase1Recovery: true,
            sessionValidated: true,
            validationAction: validationResult.action,
            skipLoading: true,
            preserveSpace: true,
            fromCache: true
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
      
      // Step 6: Fallback to app root with session validation (gentle approach)
      if (navigate) {
        log.debug('Utils', '📱 [Phase1] Step 6: Fallback to /app with session validation');
        navigate('/app', { 
          replace: false, // Don't force replace
          state: { 
            phase1Recovery: true,
            sessionValidated: true,
            validationAction: validationResult.action
          } 
        });
        
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
      log.error('Utils', '📱 [Phase1] Enhanced recovery error:', error);
      
      // ENHANCED: Only force reload after more attempts, especially for long backgrounds
      const backgroundDuration = Date.now() - this.state.backgroundTimestamp;
      const isLongBackground = backgroundDuration > this.LONG_BACKGROUND_THRESHOLD;
      const reloadThreshold = isLongBackground ? 4 : 2; // More attempts for long backgrounds before reload
      
      if (this.state.mobileRecoveryAttempts >= reloadThreshold) {
        log.warn('Utils', `📱 [Phase1] Force reload triggered after ${this.state.mobileRecoveryAttempts} attempts (background: ${Math.round(backgroundDuration/1000)}s)`);
        return this.forceReload();
      }
      
      return {
        success: false,
        action: 'failed',
        error: error instanceof Error ? error.message : 'Unknown enhanced recovery error'
      };
    }
  }

  /**
   * PHASE 1: Get comprehensive session state for debugging
   */
  getSessionState() {
    const timeInBackground = this.state.backgroundTimestamp > 0 ? 
      Date.now() - this.state.backgroundTimestamp : 0;
    
    return {
      ...this.state,
      timeInBackground,
      needsValidation: timeInBackground > this.SESSION_VALIDATION_THRESHOLD,
      backgroundThreshold: this.SESSION_VALIDATION_THRESHOLD,
      retryDelays: this.RETRY_DELAYS,
      phase1Enabled: true
    };
  }

  /**
   * Force reload as last resort
   */
  private forceReload(): MobileRecoveryResult {
    log.debug('Utils', '📱 [MobileSessionManager] Forcing page reload');
    
    try {
      // CRITICAL: Set recent auth cache before reload to prevent re-stuck
      const currentSpace = this.getCurrentSpaceFromURL();
      if (currentSpace && this.state.userId) {
        sessionStorage.setItem(`recent_auth_${currentSpace.subdomain}_${this.state.userId}`, JSON.stringify({
          timestamp: Date.now(),
          source: 'mobile-force-reload'
        }));
        log.debug('Utils', `📱 [MobileSessionManager] Set recent auth cache before reload for ${currentSpace.subdomain}`);
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
      log.warn('Utils', '📱 [MobileSessionManager] Failed to persist state:', error);
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
      log.warn('Utils', '📱 [MobileSessionManager] Failed to load persisted state:', error);
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
      log.warn('Utils', '📱 [MobileSessionManager] Failed to update space cache:', error);
    }
  }

  /**
   * Enhanced space cache update for content URLs
   * Handles caching when user navigates to posts, courses, profiles, etc.
   */
  updateSpaceCacheFromContentUrl(spaceData: { id: string; subdomain: string; name: string }, contentType?: string): void {
    this.state.lastActiveSpace = spaceData.subdomain;
    this.persistState();
    
    // Enhanced cache with content type information
    try {
      const cacheData = {
        ...spaceData,
        timestamp: Date.now(),
        userId: this.state.userId,
        contentType: contentType || 'space',
        lastContentUrl: window.location.pathname
      };
      
      localStorage.setItem('lastActiveSpace', JSON.stringify(cacheData));
      
      // Also cache the specific content URL for quick recovery
      if (contentType && contentType !== 'space') {
        const contentCacheKey = `space_content_${spaceData.subdomain}_${contentType}`;
        localStorage.setItem(contentCacheKey, JSON.stringify({
          spaceData,
          contentType,
          url: window.location.pathname,
          timestamp: Date.now()
        }));
      }
      
      log.debug('Utils', `📱 [MobileSessionManager] Updated space cache for ${contentType || 'space'} content: ${spaceData.subdomain}`);
    } catch (error) {
      log.warn('Utils', '📱 [MobileSessionManager] Failed to update content URL cache:', error);
    }
  }

  /**
   * Get cached content URL for a specific space and content type
   */
  getCachedContentUrl(spaceSubdomain: string, contentType: string): string | null {
    try {
      const contentCacheKey = `space_content_${spaceSubdomain}_${contentType}`;
      const cached = localStorage.getItem(contentCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const cacheAge = Date.now() - parsed.timestamp;
        const maxAge = 30 * 60 * 1000; // 30 minutes
        
        if (cacheAge < maxAge) {
          return parsed.url;
        }
      }
      return null;
    } catch (error) {
      log.warn('Utils', '📱 [MobileSessionManager] Error getting cached content URL:', error);
      return null;
    }
  }
}

// OPTION C FIX: Only create singleton instance if not disabled
let mobileSessionManagerInstance: MobileSessionManager | null = null;

function getMobileSessionManager(): MobileSessionManager {
  if (!mobileSessionManagerInstance) {
    // Check disable flag before creating instance
    if (typeof window !== 'undefined' && (window as any).DISABLE_MOBILE_SESSION_MANAGER) {
      log.debug('Utils', '🔧 [MobileSessionManager] Singleton creation DISABLED - Mobile Event Coordinator is managing events');
      // Return a no-op instance
      mobileSessionManagerInstance = {
        isReturningFromBackground: () => false,
        getBackgroundTime: () => 0,
        clearStaleStates: () => {},
        quickMobileAuthCheck: async () => ({ authenticated: true }),
        getCachedSpaceInfo: () => null,
        validateSessionProactively: async () => ({ isValid: true, needsRefresh: false, action: 'valid' }),
        performEnhancedMobileRecovery: async () => ({ success: true, action: 'recovered' }),
        getSessionState: () => ({
          lastActiveTimestamp: Date.now(),
          backgroundTimestamp: 0,
          authState: 'verified' as const,
          lastActiveSpace: null,
          userId: null,
          isReturningFromBackground: false,
          mobileRecoveryAttempts: 0
        }),
        isLikelyStuck: () => false,
        resetRecoveryState: () => {},
        getState: () => ({
          lastActiveTimestamp: Date.now(),
          backgroundTimestamp: 0,
          authState: 'verified' as const,
          lastActiveSpace: null,
          userId: null,
          isReturningFromBackground: false,
          mobileRecoveryAttempts: 0
        }),
        updateSpaceCache: () => {}
      } as unknown as MobileSessionManager;
    } else {
      mobileSessionManagerInstance = MobileSessionManager.getInstance();
    }
  }
  return mobileSessionManagerInstance;
}

// Export lazy singleton using Proxy for deferred creation
export const mobileSessionManager = new Proxy({} as MobileSessionManager, {
  get(target, prop) {
    const instance = getMobileSessionManager();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

// Debug helpers for development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugMobileSession = () => {
    log.debug('Utils', '📱 [Debug] Mobile Session State:', mobileSessionManager.getState());
    log.debug('Utils', '📱 [Debug] Background Time:', mobileSessionManager.getBackgroundTime());
    log.debug('Utils', '📱 [Debug] Cached Space:', mobileSessionManager.getCachedSpaceInfo());
  };
} 