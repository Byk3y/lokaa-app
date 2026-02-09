import { log } from '@/utils/logger';
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
import { useAppStore } from '@/stores/useAppStore';

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
    // DESKTOP GUARD: Only initialize on mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) {
      log.debug('Utils', '🖥️ [SessionLongevity] Desktop detected - session longevity management disabled');
      return;
    }

    // INTEGRATION: Use the new useAppStore to monitor visibility
    log.debug('Utils', '🛡️ [SessionLongevity] Integrating with useAppStore...');
    this.setupStoreSubscription();

    // Proactive session health monitoring
    this.startSessionHealthMonitor();

    log.debug('Utils', '🛡️ [SessionLongevity] Session longevity improvements active');
  }

  /**
   * Integrate with useAppStore for unified event handling
   */
  private setupStoreSubscription(): void {
    // We subscribe to the store to catch background/foreground transitions
    useAppStore.subscribe(
      (state, prevState) => {
        // Only trigger on actual status changes
        if (state.isBackground === prevState.isBackground) return;

        if (state.isBackground) {
          this.handleAppBackgrounded();
        } else if (!state.isBackground && prevState.isBackground) {
          const duration = state.lastBackgroundTime ? Date.now() - state.lastBackgroundTime : 0;
          this.handleAppForegrounded(duration);
        }
      }
    );

    log.debug('Utils', '🛡️ [SessionLongevity] Integrated with useAppStore');
  }

  /**
   * Handle app going to background
   */
  private async handleAppBackgrounded(): Promise<void> {
    this.backgroundStartTime = Date.now();

    log.debug('Utils', '🛡️ [SessionLongevity] App backgrounded - preparing session protection');

    // Proactively refresh session if it expires soon
    await this.proactiveSessionRefresh();
  }

  /**
   * Handle app returning from background
   */
  private async handleAppForegrounded(backgroundDuration: number): Promise<void> {
    log.debug('Utils', `🛡️ [SessionLongevity] App returned after ${Math.round(backgroundDuration / 1000)}s`);

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
        log.debug('Utils', '🛡️ [SessionLongevity] Proactively refreshing session before background');
        await this.performSilentRefresh('proactive_background');
      }

    } catch (error) {
      log.warn('Utils', '🛡️ [SessionLongevity] Proactive refresh check failed:', error);
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
        log.debug('Utils', `🛡️ [SessionLongevity] No valid session found (${reason})`);
        return;
      }

      const session = data.session;
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();

      // Check if session expired or expires soon
      if (expiresAt <= now || expiresAt - now < 300000) { // 5 minutes buffer
        log.debug('Utils', `🛡️ [SessionLongevity] Session needs refresh (${reason})`);
        await this.performSilentRefresh(reason);
      } else {
        log.debug('Utils', `🛡️ [SessionLongevity] Session valid for ${Math.round((expiresAt - now) / 60000)} minutes`);
      }

    } catch (error) {
      log.warn('Utils', `🛡️ [SessionLongevity] Session validation failed (${reason}):`, error);
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
      log.debug('Utils', `🛡️ [SessionLongevity] Performing silent refresh (${reason})`);

      const { data, error } = await getSupabaseClient().auth.refreshSession();

      if (error || !data.session) {
        log.warn('Utils', `🛡️ [SessionLongevity] Silent refresh failed (${reason}):`, error);
        return false;
      }

      log.debug('Utils', `✅ [SessionLongevity] Silent refresh successful (${reason})`);
      return true;

    } catch (error) {
      log.error('Utils', `🛡️ [SessionLongevity] Silent refresh error (${reason}):`, error instanceof Error ? error : new Error(String(error)));
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

    log.debug('Utils', '🛡️ [SessionLongevity] Session health monitoring started');
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
    log.debug('Utils', '🛡️ [SessionLongevity] Configuration updated:', this.config);
  }

  /**
   * Cleanup resources and remove event listeners
   */
  cleanup(): void {
    log.debug('Utils', '🛡️ [SessionLongevity] Cleaning up...');

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
      if (import.meta.env.DEV) {
        delete (window as any).sessionLongevityManager;
        delete (window as any).debugSessionLongevity;
      }
    }

    log.debug('Utils', '✅ [SessionLongevity] Cleanup complete');
  }
}

// Export singleton instance
export const sessionLongevityManager = SessionLongevityManager.getInstance();

// Debug helpers - ONLY ON MOBILE DEVICES
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // DESKTOP GUARD: Only expose debug helpers on mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    (window as any).sessionLongevityManager = sessionLongevityManager;
    (window as any).debugSessionLongevity = () => {
      log.debug('Utils', '🛡️ [SessionLongevity] Status:', sessionLongevityManager.getStatus());
    };
    log.debug('Utils', '🔧 [SessionLongevity] Debug helpers exposed for mobile development');
  } else {
    log.debug('Utils', '🖥️ [SessionLongevity] Desktop detected - debug helpers disabled');
  }
} 