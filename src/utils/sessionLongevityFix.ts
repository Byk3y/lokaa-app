/**
 * 🛡️ Session Longevity Fix
 * 
 * Prevents 401 errors during short app backgrounds by:
 * 1. Extending session validity timeframe
 * 2. Proactive session refresh before backgrounding
 * 3. Silent session maintenance
 * 4. Reducing visual reload artifacts
 */

import { getSupabaseClient } from '@/integrations/supabase/client';

interface SessionLongevityConfig {
  backgroundThreshold: number;
  proactiveRefreshWindow: number; 
  maxBackgroundDuration: number;
  silentRefresh: boolean;
}

class SessionLongevityManager {
  private static instance: SessionLongevityManager;
  
  private config: SessionLongevityConfig = {
    backgroundThreshold: 30000,      // 30 seconds (was 17s)
    proactiveRefreshWindow: 900000,  // Refresh if expires in 15 minutes (was 5 min)
    maxBackgroundDuration: 300000,   // 5 minutes max background 
    silentRefresh: true              // No loading states during refresh
  };
  
  private lastRefreshTime = 0;
  private refreshInProgress = false;
  private backgroundStartTime = 0;
  
  private visibilityHandler: (() => void) | null = null;
  private blurHandler: (() => void) | null = null;
  private focusHandler: (() => void) | null = null;
  
  static getInstance(): SessionLongevityManager {
    if (!SessionLongevityManager.instance) {
      SessionLongevityManager.instance = new SessionLongevityManager();
    }
    return SessionLongevityManager.instance;
  }
  
  /**
   * Initialize session longevity improvements
   */
  initialize(): void {
    // OPTION C INTEGRATION: Only initialize if Mobile Event Coordinator allows
    if (typeof window !== 'undefined' && (window as any).MOBILE_EVENT_COORDINATOR_ACTIVE) {
      console.log('🛡️ [SessionLongevity] Integrating with Mobile Event Coordinator...');
      this.integrateWithCoordinator();
    } else {
      console.log('🛡️ [SessionLongevity] Mobile Event Coordinator not active, using standalone mode');
      this.setupStandaloneListeners();
    }
    
    // Proactive session health monitoring
    this.startSessionHealthMonitor();
    
    console.log('🛡️ [SessionLongevity] Session longevity improvements active');
  }
  
  /**
   * Integrate with Mobile Event Coordinator for unified event handling
   */
  private integrateWithCoordinator(): void {
    const coordinator = (window as any).MobileEventCoordinator;
    if (!coordinator) return;
    
    // Subscribe to coordinator events with high priority
    coordinator.subscribe({
      name: 'SessionLongevityManager',
      priority: 8, // High priority for session management
      handler: async (eventData: any) => {
        if (eventData.isBackground) {
          await this.handleAppBackgrounded();
        } else {
          await this.handleAppForegrounded(eventData.backgroundDuration || 0);
        }
      }
    });
    
    console.log('🛡️ [SessionLongevity] Integrated with Mobile Event Coordinator');
  }
  
  /**
   * Fallback standalone listeners (if coordinator not available)
   */
  private setupStandaloneListeners(): void {
    if (typeof document === 'undefined') return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.handleAppBackgrounded();
      } else {
        const backgroundDuration = Date.now() - this.backgroundStartTime;
        this.handleAppForegrounded(backgroundDuration);
      }
    };
    
    const handleBlur = () => this.handleAppBackgrounded();
    
    const handleFocus = () => {
      const backgroundDuration = Date.now() - this.backgroundStartTime;
      this.handleAppForegrounded(backgroundDuration);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    
    // Store handlers for cleanup
    this.visibilityHandler = handleVisibilityChange;
    this.blurHandler = handleBlur;
    this.focusHandler = handleFocus;
  }
  
  /**
   * Handle app going to background
   */
  private async handleAppBackgrounded(): Promise<void> {
    this.backgroundStartTime = Date.now();
    
    console.log('🛡️ [SessionLongevity] App backgrounded - preparing session protection');
    
    // Proactively refresh session if it expires soon
    await this.proactiveSessionRefresh();
  }
  
  /**
   * Handle app returning from background
   */
  private async handleAppForegrounded(backgroundDuration: number): Promise<void> {
    console.log(`🛡️ [SessionLongevity] App returned after ${Math.round(backgroundDuration/1000)}s`);
    
    // If background was longer than threshold, validate session
    if (backgroundDuration > this.config.backgroundThreshold) {
      await this.validateAndRefreshSession('background_return');
    }
  }
  
  /**
   * Proactive session refresh before potential expiry
   */
  private async proactiveSessionRefresh(): Promise<void> {
    if (this.refreshInProgress) return;
    
    try {
      const { data, error } = await getSupabaseClient().auth.getSession();
      
      if (error || !data.session) return;
      
      const session = data.session;
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      
      // Check if session expires within proactive window
      if (expiresAt - now < this.config.proactiveRefreshWindow) {
        console.log('🛡️ [SessionLongevity] Proactively refreshing session before background');
        await this.performSilentRefresh('proactive_background');
      }
      
    } catch (error) {
      console.warn('🛡️ [SessionLongevity] Proactive refresh check failed:', error);
    }
  }
  
  /**
   * Validate and refresh session if needed
   */
  private async validateAndRefreshSession(reason: string): Promise<void> {
    if (this.refreshInProgress) return;
    
    try {
      const { data, error } = await getSupabaseClient().auth.getSession();
      
      if (error || !data.session) {
        console.log(`🛡️ [SessionLongevity] No valid session found (${reason})`);
        return;
      }
      
      const session = data.session;
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      
      // Check if session expired or expires soon
      if (expiresAt <= now || expiresAt - now < 300000) { // 5 minutes buffer
        console.log(`🛡️ [SessionLongevity] Session needs refresh (${reason})`);
        await this.performSilentRefresh(reason);
      } else {
        console.log(`🛡️ [SessionLongevity] Session valid for ${Math.round((expiresAt - now)/60000)} minutes`);
      }
      
    } catch (error) {
      console.warn(`🛡️ [SessionLongevity] Session validation failed (${reason}):`, error);
    }
  }
  
  /**
   * Perform silent session refresh without loading states
   */
  private async performSilentRefresh(reason: string): Promise<boolean> {
    if (this.refreshInProgress) return false;
    
    this.refreshInProgress = true;
    this.lastRefreshTime = Date.now();
    
    try {
      console.log(`🛡️ [SessionLongevity] Performing silent refresh (${reason})`);
      
      const { data, error } = await getSupabaseClient().auth.refreshSession();
      
      if (error || !data.session) {
        console.warn(`🛡️ [SessionLongevity] Silent refresh failed (${reason}):`, error);
        return false;
      }
      
      console.log(`✅ [SessionLongevity] Silent refresh successful (${reason})`);
      return true;
      
    } catch (error) {
      console.error(`🛡️ [SessionLongevity] Silent refresh error (${reason}):`, error);
      return false;
    } finally {
      this.refreshInProgress = false;
    }
  }
  
  /**
   * Start periodic session health monitoring
   */
  private startSessionHealthMonitor(): void {
    // Check session health every 5 minutes
    setInterval(async () => {
      await this.validateAndRefreshSession('periodic_health_check');
    }, 300000); // 5 minutes
    
    console.log('🛡️ [SessionLongevity] Session health monitoring started');
  }
  
  /**
   * Get session longevity status for debugging
   */
  getStatus(): {
    lastRefreshTime: number;
    refreshInProgress: boolean;
    backgroundStartTime: number;
    config: SessionLongevityConfig;
  } {
    return {
      lastRefreshTime: this.lastRefreshTime,
      refreshInProgress: this.refreshInProgress,
      backgroundStartTime: this.backgroundStartTime,
      config: this.config
    };
  }
  
  /**
   * Force session refresh (for testing)
   */
  async forceRefresh(): Promise<boolean> {
    return this.performSilentRefresh('manual_force');
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SessionLongevityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🛡️ [SessionLongevity] Configuration updated:', this.config);
  }

  /**
   * Cleanup resources and remove event listeners
   */
  cleanup(): void {
    console.log('🛡️ [SessionLongevity] Cleaning up...');
    
    if (typeof document !== 'undefined') {
      if (this.visibilityHandler) {
        document.removeEventListener('visibilitychange', this.visibilityHandler);
        this.visibilityHandler = null;
      }
    }
    
    if (typeof window !== 'undefined') {
      if (this.blurHandler) {
        window.removeEventListener('blur', this.blurHandler);
        this.blurHandler = null;
      }
      if (this.focusHandler) {
        window.removeEventListener('focus', this.focusHandler);
        this.focusHandler = null;
      }
      
      // Remove debug helpers
      if (process.env.NODE_ENV === 'development') {
        delete (window as any).sessionLongevityManager;
        delete (window as any).debugSessionLongevity;
      }
    }
    
    console.log('✅ [SessionLongevity] Cleanup complete');
  }
}

// Export singleton instance
export const sessionLongevityManager = SessionLongevityManager.getInstance();

// Debug helpers
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).sessionLongevityManager = sessionLongevityManager;
  (window as any).debugSessionLongevity = () => {
    console.log('🛡️ [SessionLongevity] Status:', sessionLongevityManager.getStatus());
  };
} 