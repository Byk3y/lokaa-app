import { log } from '@/utils/logger';
/**
 * 📱 Simple Mobile Manager
 * 
 * Consolidated mobile protection system that replaces:
 * - mobileSessionManager.ts
 * - useMobileLifecycle.ts
 * - phase1MobileRecovery.ts
 * - MobileBrowserService.ts
 * - globalErrorInterceptor.ts (401 handling)
 * 
 * SIMPLIFIED APPROACH:
 * - Single 30s background threshold
 * - Basic session validation (no complex retry logic)
 * - Essential 401 error handling
 * - Simple mobile detection
 * - Minimal cache management
 */

import { getSupabaseClient } from '@/integrations/supabase/client';

interface SimpleMobileState {
  isBackground: boolean;
  lastBackgroundTime: number;
  needsSessionCheck: boolean;
  userId: string | null;
}

interface SessionValidationResult {
  isValid: boolean;
  action: 'valid' | 'refreshed' | 'expired' | 'failed';
}

class SimpleMobileManager {
  private static instance: SimpleMobileManager;
  
  private state: SimpleMobileState = {
    isBackground: false,
    lastBackgroundTime: 0,
    needsSessionCheck: false,
    userId: null
  };
  
  // SIMPLIFIED: Single threshold for all mobile behavior
  private readonly BACKGROUND_THRESHOLD = 30000; // 30 seconds
  private isRefreshingSession = false;
  
  private constructor() {
    this.setupMobileDetection();
    this.setupSessionProtection();
    this.setupVisibilityTracking();
    
    // Simple debug interface
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).simpleMobileManager = this;
    }
  }
  
  static getInstance(): SimpleMobileManager {
    if (!SimpleMobileManager.instance) {
      SimpleMobileManager.instance = new SimpleMobileManager();
    }
    return SimpleMobileManager.instance;
  }
  
  /**
   * Simple mobile detection (no complex patterns)
   */
  private setupMobileDetection(): void {
    // Simple mobile detection based on screen size and touch
    const isMobile = window.innerWidth <= 768 && 'ontouchstart' in window;
    
    if (isMobile) {
      log.debug('Utils', '📱 [SimpleMobile] Mobile device detected');
    }
  }
  
  /**
   * Setup basic 401 session protection
   */
  private setupSessionProtection(): void {
    if (typeof window === 'undefined') return;
    
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Simple 401 handling for Supabase API calls
      if (response.status === 401 && 
          args[0]?.toString().includes('supabase.co/rest/v1/')) {
        
        log.debug('Utils', '🔄 [SimpleMobile] 401 detected, refreshing session');
        
        const refreshed = await this.refreshSession();
        if (refreshed) {
          // Retry the request once
          return originalFetch(...args);
        }
      }
      
      return response;
    };
  }
  
  /**
   * Track app visibility for background detection
   */
  private setupVisibilityTracking(): void {
    if (typeof document === 'undefined') return;
    
    // OPTION C FIX: Check disable flag - don't initialize if Mobile Event Coordinator is managing events
    if (typeof window !== 'undefined' && (window as any).DISABLE_SIMPLE_MOBILE_MANAGER) {
      log.debug('Utils', '🔧 [SimpleMobileManager] DISABLED - Mobile Event Coordinator is managing events');
      return;
    }
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App went to background
        this.state.isBackground = true;
        this.state.lastBackgroundTime = Date.now();
        log.debug('Utils', '📱 [SimpleMobile] App backgrounded');
      } else {
        // App returned from background
        const backgroundDuration = Date.now() - this.state.lastBackgroundTime;
        log.debug('Utils', `📱 [SimpleMobile] App returned (${Math.round(backgroundDuration/1000)}s)`);
        
        this.state.isBackground = false;
        
        // Simple check: validate session if background > 30s
        if (backgroundDuration > this.BACKGROUND_THRESHOLD) {
          this.state.needsSessionCheck = true;
          this.validateSessionIfNeeded();
        }
      }
    });
  }
  
  /**
   * Simple session validation (no complex retry logic)
   */
  async validateSession(): Promise<SessionValidationResult> {
    try {
      const { data, error } = await getSupabaseClient().auth.getSession();
      
      if (error || !data.session) {
        return { isValid: false, action: 'failed' };
      }
      
      const session = data.session;
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      
      // Check if expired
      if (expiresAt <= now) {
        return { isValid: false, action: 'expired' };
      }
      
      // Check if expires soon (5 minutes)
      if (expiresAt - now < 300000) {
        const refreshed = await this.refreshSession();
        return { 
          isValid: refreshed, 
          action: refreshed ? 'refreshed' : 'failed' 
        };
      }
      
      return { isValid: true, action: 'valid' };
      
    } catch (error) {
      log.warn('Utils', '📱 [SimpleMobile] Session validation failed:', error);
      return { isValid: false, action: 'failed' };
    }
  }
  
  /**
   * Simple session refresh (no exponential backoff)
   */
  private async refreshSession(): Promise<boolean> {
    if (this.isRefreshingSession) {
      return false; // Prevent concurrent refreshes
    }
    
    this.isRefreshingSession = true;
    
    try {
      const { data, error } = await getSupabaseClient().auth.refreshSession();
      
      if (error || !data.session) {
        log.warn('Utils', '📱 [SimpleMobile] Session refresh failed');
        return false;
      }
      
      log.debug('Utils', '✅ [SimpleMobile] Session refreshed');
      return true;
      
    } catch (error) {
      log.error('Utils', '📱 [SimpleMobile] Session refresh error:', error);
      return false;
    } finally {
      this.isRefreshingSession = false;
    }
  }
  
  /**
   * Check session if needed after background return
   */
  private async validateSessionIfNeeded(): Promise<void> {
    if (!this.state.needsSessionCheck) return;
    
    this.state.needsSessionCheck = false;
    
    log.debug('Utils', '📱 [SimpleMobile] Validating session after background return');
    
    const result = await this.validateSession();
    
    if (!result.isValid) {
      log.warn('Utils', '📱 [SimpleMobile] Session validation failed, redirecting to login');
      window.location.href = '/';
    } else {
      log.debug('Utils', `📱 [SimpleMobile] Session validation: ${result.action}`);
    }
  }
  
  /**
   * Update user context
   */
  setUser(userId: string | null): void {
    this.state.userId = userId;
  }
  
  /**
   * Check if should use cache-first approach
   */
  shouldUseCacheFirst(): boolean {
    const isMobile = window.innerWidth <= 768 && 'ontouchstart' in window;
    const recentBackground = (Date.now() - this.state.lastBackgroundTime) < 60000; // 1 minute
    
    return isMobile && (this.state.isBackground || recentBackground);
  }
  
  /**
   * Get current state (for debugging)
   */
  getState(): SimpleMobileState & { 
    isMobile: boolean; 
    shouldUseCacheFirst: boolean; 
  } {
    return {
      ...this.state,
      isMobile: window.innerWidth <= 768 && 'ontouchstart' in window,
      shouldUseCacheFirst: this.shouldUseCacheFirst()
    };
  }
  
  /**
   * Manual session refresh (for testing)
   */
  async manualRefresh(): Promise<boolean> {
    return this.refreshSession();
  }
}

// OPTION C FIX: Only create singleton instance if not disabled
let simpleMobileManagerInstance: SimpleMobileManager | null = null;

function getSimpleMobileManager(): SimpleMobileManager {
  if (!simpleMobileManagerInstance) {
    // Check disable flag before creating instance
    if (typeof window !== 'undefined' && (window as any).DISABLE_SIMPLE_MOBILE_MANAGER) {
      log.debug('Utils', '🔧 [SimpleMobileManager] Singleton creation DISABLED - Mobile Event Coordinator is managing events');
      // Return a no-op instance
      simpleMobileManagerInstance = {
        setUser: () => {},
        shouldUseCacheFirst: () => false,
        getState: () => ({
          isBackground: false,
          lastBackgroundTime: 0,
          needsSessionCheck: false,
          userId: null,
          isMobile: false,
          shouldUseCacheFirst: false
        }),
        validateSession: async () => ({ isValid: true, action: 'valid' }),
        manualRefresh: async () => true
      } as unknown as SimpleMobileManager;
    } else {
      simpleMobileManagerInstance = SimpleMobileManager.getInstance();
    }
  }
  return simpleMobileManagerInstance;
}

// Export lazy singleton using Proxy for deferred creation
export const simpleMobileManager = new Proxy({} as SimpleMobileManager, {
  get(target, prop) {
    const instance = getSimpleMobileManager();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

// Auto-initialize
if (typeof window !== 'undefined') {
  simpleMobileManager.setUser(null); // Will be updated by auth context
} 