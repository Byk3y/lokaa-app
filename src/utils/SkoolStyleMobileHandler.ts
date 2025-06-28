/**
 * 🍎 Skool-Style Mobile Background Handler
 * 
 * Replicates Skool's graceful mobile background handling:
 * - NO aggressive validation on return from background
 * - Patient network recovery (wait for natural browser restoration)
 * - Cache-first data loading
 * - Minimal session checking
 * - Single source of truth for mobile behavior
 * 
 * REPLACES ALL EXISTING MOBILE SYSTEMS:
 * - phase1MobileRecovery.ts ❌
 * - MobileBrowserService.ts ❌  
 * - SimpleMobileManager.ts ❌
 * - mobileSessionManager.ts ❌
 * - useMobileLifecycle.ts ❌
 * - Health monitor mobile triggers ❌
 */

import { getSupabaseClient } from '@/integrations/supabase/client';

interface SkoolMobileState {
  isBackground: boolean;
  lastBackgroundTime: number;
  backgroundDuration: number;
  sessionLastChecked: number;
  networkRestoredAfterBackground: boolean;
  userId: string | null;
}

class SkoolStyleMobileHandler {
  private static instance: SkoolStyleMobileHandler;
  
  private state: SkoolMobileState = {
    isBackground: false,
    lastBackgroundTime: 0,
    backgroundDuration: 0,
    sessionLastChecked: Date.now(),
    networkRestoredAfterBackground: false,
    userId: null
  };
  
  // Skool-style thresholds (more patient)
  private readonly SIGNIFICANT_BACKGROUND = 60000; // 1 minute (vs our aggressive 20s)
  private readonly SESSION_CHECK_INTERVAL = 600000; // 10 minutes (vs our aggressive 30s)
  private readonly NETWORK_RESTORATION_WAIT = 5000; // 5 seconds for network to naturally restore
  
  private networkRestorationTimer: NodeJS.Timeout | null = null;
  private isSessionRefreshing = false;
  
  private constructor() {
    this.setupGracefulBackgroundHandling();
    this.setupMinimalSessionProtection();
    this.disableAggressiveSystems();
    
    // Minimal debug interface
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).skoolMobileHandler = {
        getState: () => this.getState(),
        testBackgroundReturn: () => this.simulateBackgroundReturn(),
        getCurrentStatus: () => this.getCurrentStatus()
      };
    }
  }
  
  static getInstance(): SkoolStyleMobileHandler {
    if (!SkoolStyleMobileHandler.instance) {
      SkoolStyleMobileHandler.instance = new SkoolStyleMobileHandler();
    }
    return SkoolStyleMobileHandler.instance;
  }
  
  /**
   * Skool-style graceful background handling
   */
  private setupGracefulBackgroundHandling(): void {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Going to background - just track it (no aggressive actions)
        this.state.isBackground = true;
        this.state.lastBackgroundTime = Date.now();
        this.state.networkRestoredAfterBackground = false;
        
        console.log('🍎 [SkoolMobile] App backgrounded (patient mode)');
        
      } else {
        // Returning from background - SKOOL'S APPROACH: Be patient!
        this.state.isBackground = false;
        this.state.backgroundDuration = Date.now() - this.state.lastBackgroundTime;
        
        console.log(`🍎 [SkoolMobile] Returned from background (${Math.round(this.state.backgroundDuration/1000)}s) - waiting for natural recovery`);
        
        // SKOOL'S SECRET: Wait for network to naturally restore instead of immediate validation
        this.scheduleGracefulNetworkRecovery();
      }
    });
  }
  
  /**
   * Skool's approach: Wait for natural network recovery
   */
  private scheduleGracefulNetworkRecovery(): void {
    // Clear any existing timer
    if (this.networkRestorationTimer) {
      clearTimeout(this.networkRestorationTimer);
    }
    
    // Only act if background was significant
    if (this.state.backgroundDuration < this.SIGNIFICANT_BACKGROUND) {
      console.log('🍎 [SkoolMobile] Short background (<1min), no action needed');
      return;
    }
    
    // PATIENT APPROACH: Wait 5 seconds for browser to naturally restore network access
    this.networkRestorationTimer = setTimeout(() => {
      this.state.networkRestoredAfterBackground = true;
      console.log('🍎 [SkoolMobile] Network restoration period complete');
      
      // Only check session if it's been a LONG time (like Skool)
      const timeSinceLastCheck = Date.now() - this.state.sessionLastChecked;
      if (timeSinceLastCheck > this.SESSION_CHECK_INTERVAL) {
        this.gentleSessionCheck();
      } else {
        console.log('🍎 [SkoolMobile] Session recently validated, skipping check');
      }
    }, this.NETWORK_RESTORATION_WAIT);
  }
  
  /**
   * Gentle session validation (like Skool - no aggressive retry)
   */
  private async gentleSessionCheck(): Promise<void> {
    if (this.isSessionRefreshing) return;
    
    this.isSessionRefreshing = true;
    console.log('🍎 [SkoolMobile] Gentle session check...');
    
    try {
      const { data, error } = await getSupabaseClient().auth.getSession();
      
      if (error || !data.session) {
        console.log('🍎 [SkoolMobile] Session expired, gentle redirect');
        // Gentle redirect (like Skool - no forced refresh)
        window.location.href = '/';
        return;
      }
      
      const session = data.session;
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      
      // Check if expires within 30 minutes (conservative like Skool)
      if (expiresAt - now < 1800000) {
        console.log('🍎 [SkoolMobile] Session expires soon, gentle refresh');
        const { error: refreshError } = await getSupabaseClient().auth.refreshSession();
        
        if (refreshError) {
          console.log('🍎 [SkoolMobile] Refresh failed, gentle redirect');
          window.location.href = '/';
          return;
        }
      }
      
      this.state.sessionLastChecked = Date.now();
      console.log('✅ [SkoolMobile] Session validated successfully');
      
    } catch (error) {
      console.warn('🍎 [SkoolMobile] Session check failed:', error);
      // Don't force refresh on errors - let user continue (like Skool)
    } finally {
      this.isSessionRefreshing = false;
    }
  }
  
  /**
   * Minimal 401 protection (only for critical failures)
   */
  private setupMinimalSessionProtection(): void {
    if (typeof window === 'undefined') return;
    
    const originalFetch = window.fetch;
    let consecutive401s = 0;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Only handle 401s on Supabase auth endpoints (not data endpoints)
      if (response.status === 401 && 
          args[0]?.toString().includes('supabase.co/auth/v1/')) {
        
        consecutive401s++;
        
        // Only refresh after multiple 401s (like Skool - be patient)
        if (consecutive401s >= 3) {
          console.log('🍎 [SkoolMobile] Multiple auth 401s, gentle refresh');
          await this.gentleSessionCheck();
        }
      } else if (response.ok) {
        consecutive401s = 0; // Reset on success
      }
      
      return response;
    };
  }
  
  /**
   * Disable aggressive competing systems
   */
  private disableAggressiveSystems(): void {
    if (typeof window === 'undefined') return;
    
    // Disable aggressive health monitoring for mobile
    const disableHealthMonitorRecovery = () => {
      const healthMonitor = (window as any).supabaseHealthMonitor;
      if (healthMonitor && this.isMobileDevice()) {
        // Override aggressive recovery with patient approach
        const originalRecoverClient = healthMonitor.recoverClient;
        healthMonitor.recoverClient = async () => {
          console.log('🍎 [SkoolMobile] Preventing aggressive health monitor recovery');
          return { success: true, message: 'Skool-style patience' };
        };
      }
    };
    
    // Disable Phase 1 recovery triggers
    const disablePhase1Recovery = () => {
      const phase1 = (window as any).phase1Recovery;
      if (phase1 && this.isMobileDevice()) {
        const originalTrigger = phase1.triggerRecovery;
        phase1.triggerRecovery = () => {
          console.log('🍎 [SkoolMobile] Preventing aggressive Phase 1 recovery');
          return Promise.resolve({ success: true });
        };
      }
    };
    
    // Apply overrides after a short delay to ensure systems are loaded
    setTimeout(() => {
      disableHealthMonitorRecovery();
      disablePhase1Recovery();
    }, 1000);
  }
  
  /**
   * Simple mobile detection
   */
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && 'ontouchstart' in window);
  }
  
  /**
   * Should use cache-first approach (Skool's strategy)
   */
  shouldUseCacheFirst(): boolean {
    if (!this.isMobileDevice()) return false;
    
    // Use cache-first during network restoration period
    if (this.state.isBackground || !this.state.networkRestoredAfterBackground) {
      return true;
    }
    
    // Use cache-first for brief period after significant background
    const timeSinceReturn = Date.now() - (this.state.lastBackgroundTime + this.state.backgroundDuration);
    return this.state.backgroundDuration > this.SIGNIFICANT_BACKGROUND && timeSinceReturn < 10000; // 10 seconds
  }
  
  /**
   * Check if network requests should be delayed
   */
  shouldDelayNetworkRequests(): boolean {
    return this.isMobileDevice() && 
           this.state.isBackground || 
           (!this.state.networkRestoredAfterBackground && this.state.backgroundDuration > 10000);
  }
  
  /**
   * Update user context
   */
  setUser(userId: string | null): void {
    this.state.userId = userId;
  }
  
  /**
   * Get current state for debugging
   */
  getState(): SkoolMobileState & { 
    isMobile: boolean; 
    shouldUseCacheFirst: boolean;
    shouldDelayRequests: boolean;
  } {
    return {
      ...this.state,
      isMobile: this.isMobileDevice(),
      shouldUseCacheFirst: this.shouldUseCacheFirst(),
      shouldDelayRequests: this.shouldDelayNetworkRequests()
    };
  }
  
  /**
   * Get current status summary
   */
  getCurrentStatus(): string {
    const state = this.getState();
    
    if (state.isBackground) {
      return 'Backgrounded (patient mode)';
    }
    
    if (!state.networkRestoredAfterBackground && state.backgroundDuration > this.SIGNIFICANT_BACKGROUND) {
      return `Restoring network (${Math.round((Date.now() - state.lastBackgroundTime)/1000)}s)`;
    }
    
    if (state.shouldUseCacheFirst) {
      return 'Cache-first mode (post-background)';
    }
    
    return 'Normal operation';
  }
  
  /**
   * Simulate background return for testing
   */
  private simulateBackgroundReturn(): void {
    this.state.isBackground = true;
    this.state.lastBackgroundTime = Date.now() - 30000; // Simulate 30s background
    
    setTimeout(() => {
      this.state.isBackground = false;
      this.state.backgroundDuration = 30000;
      this.scheduleGracefulNetworkRecovery();
    }, 1000);
    
    console.log('🍎 [SkoolMobile] Simulated 30s background return');
  }
  
  /**
   * Cleanup timers
   */
  destroy(): void {
    if (this.networkRestorationTimer) {
      clearTimeout(this.networkRestorationTimer);
      this.networkRestorationTimer = null;
    }
  }
}

// Export singleton instance
export const skoolMobileHandler = SkoolStyleMobileHandler.getInstance();

// Auto-initialize and expose for debugging
if (typeof window !== 'undefined') {
  (window as any).skoolMobileHandler = skoolMobileHandler;
  
  console.log('🍎 [SkoolMobile] Skool-style mobile handler initialized');
  console.log('🍎 Debug: window.skoolMobileHandler.getCurrentStatus()');
} 