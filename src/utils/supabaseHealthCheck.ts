import { log } from '@/utils/logger';
/**
 * Supabase Client Health Check and Auto-Recovery System
 * 
 * This utility monitors the health of the Supabase client and automatically
 * recovers from corruption issues that can occur after hard refreshes.
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Database } from '@/types/database.types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface HealthCheckResult {
  isHealthy: boolean;
  latency: number;
  error?: string;
  timestamp: number;
}

class SupabaseHealthMonitor {
  private static instance: SupabaseHealthMonitor;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: HealthCheckResult | null = null;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 3;
  private isRecovering = false;
  private lastMobileBrowserBlocking = 0;
  private consecutiveFailures = 0;

  private constructor() {}

  public static getInstance(): SupabaseHealthMonitor {
    if (!SupabaseHealthMonitor.instance) {
      SupabaseHealthMonitor.instance = new SupabaseHealthMonitor();
    }
    return SupabaseHealthMonitor.instance;
  }

  /**
   * Start monitoring the Supabase client health
   */
  public startMonitoring(): void {
    // Don't start multiple monitors
    if (this.healthCheckInterval) {
      return;
    }

    log.debug('Utils', '🏥 [HealthMonitor] Starting Supabase client health monitoring');

    // Initial health check
    this.performHealthCheck();

    // Set up periodic health checks (every 30 seconds)
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Expose health check function to window for manual testing
    if (typeof window !== 'undefined') {
      (window as any).checkSupabaseHealth = () => this.performHealthCheck();
      (window as any).recoverSupabaseClient = () => this.recoverClient();
      
      // Mobile browser blocking test utility
      (window as any).testMobileBrowserBlocking = () => {
        log.debug('Utils', '🧪 [Mobile Browser Blocking Test]');
        log.debug('Utils', '================================');
        log.debug('Utils', 'Mobile Detection:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768);
        log.debug('Utils', 'Recent Background Activity:', this.hasRecentMobileBackgroundActivity());
        log.debug('Utils', 'Last Visibility Change:', (window as any).__lastVisibilityChange ? new Date((window as any).__lastVisibilityChange).toLocaleTimeString() : 'None');
        log.debug('Utils', 'Last Mobile Browser Blocking:', this.lastMobileBrowserBlocking ? new Date(this.lastMobileBrowserBlocking).toLocaleTimeString() : 'None');
        log.debug('Utils', 'Health Monitor Status:', {
          isRecovering: this.isRecovering,
          recoveryAttempts: this.recoveryAttempts,
          consecutiveFailures: this.consecutiveFailures,
          lastHealthy: this.lastHealthCheck?.isHealthy
        });
        
        // Test manual blocking detection
        const mockError = { error: 'Fetch API cannot load due to access control checks', latency: 1000 };
        log.debug('Utils', 'Would Detect Mobile Blocking:', this.isMobileBrowserBlocking(mockError));
        
        return {
          mobileDetected: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768,
          recentBackgroundActivity: this.hasRecentMobileBackgroundActivity(),
          healthMonitorStatus: this.getHealthStatus()
        };
      };
      
      // Track page visibility changes for mobile background detection
      if (!(window as any).DISABLE_MOBILE_BROWSER_SERVICE) {
      document.addEventListener('visibilitychange', () => {
        (window as any).__lastVisibilityChange = Date.now();
      });
      } else {
        log.debug('Utils', '🔧 [SupabaseHealthMonitor] Visibility listener DISABLED - Mobile Event Coordinator is managing events');
      }
    }
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      log.debug('Utils', '🏥 [HealthMonitor] Stopped health monitoring');
    }
  }

  /**
   * Perform a health check on the current Supabase client
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Get the current client using the singleton pattern
      const supabase = getSupabaseClient();
      
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // Test with a simple, fast query with timeout
      const healthPromise = Promise.race([
        supabase.from('spaces').select('id').limit(1),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), 3000);
        })
      ]);

      const { data, error } = await healthPromise;
      const latency = Date.now() - startTime;

      if (error) {
        throw error;
      }

      const result: HealthCheckResult = {
        isHealthy: true,
        latency,
        timestamp: Date.now()
      };

      this.lastHealthCheck = result;
      this.recoveryAttempts = 0; // Reset recovery attempts on successful check

      // Only log if latency is high or this is a recovery
      if (latency > 2000 || this.isRecovering) {
        log.debug('Utils', `🏥 [HealthMonitor] Health check passed (${latency}ms)`);
        this.isRecovering = false;
      }

      return result;

    } catch (error) {
      const latency = Date.now() - startTime;
      const result: HealthCheckResult = {
        isHealthy: false,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };

      this.lastHealthCheck = result;
      log.warn('Utils', `🏥 [HealthMonitor] Health check failed (${latency}ms):`, result.error);

      // ENHANCED: Check mobile browser blocking coordination before attempting recovery
      if (!this.isRecovering && this.recoveryAttempts < this.maxRecoveryAttempts) {
        // Check if this is mobile browser network blocking (Chrome/Safari)
        if (this.isMobileBrowserBlocking(result)) {
          log.debug('Utils', '🏥 [HealthMonitor] Mobile browser network blocking detected, implementing progressive recovery');
          
          // Start progressive recovery instead of aggressive recovery
          this.handleMobileBrowserBlocking();
          return result; // Skip normal recovery flow
        }
        
        // Check if Phase 1 is handling mobile recovery
        if (this.isPhase1HandlingSafariBlocking()) {
          log.debug('Utils', '🏥 [HealthMonitor] Phase 1 handling mobile recovery, skipping health monitor recovery');
          return result; // Skip health monitor recovery
        }
        
        this.attemptRecovery();
      }

      return result;
    }
  }

  /**
   * Attempt to recover the Supabase client
   */
  private async attemptRecovery(): Promise<void> {
    if (this.isRecovering) {
      return;
    }

    this.isRecovering = true;
    this.recoveryAttempts++;

    log.debug('Utils', `🏥 [HealthMonitor] Attempting client recovery (attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);

    try {
      await this.recoverClient();
      
      // Test the recovered client
      const healthCheck = await this.performHealthCheck();
      
      if (healthCheck.isHealthy) {
        log.debug('Utils', '✅ [HealthMonitor] Client recovery successful');
        this.isRecovering = false;
        this.recoveryAttempts = 0;
        
        // Notify the application that recovery was successful
        this.notifyRecoverySuccess();
      } else {
        throw new Error('Recovery verification failed');
      }

    } catch (error) {
      log.error('Utils', `❌ [HealthMonitor] Recovery attempt ${this.recoveryAttempts} failed:`, error);
      
      if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
        log.error('Utils', '❌ [HealthMonitor] Max recovery attempts reached. Manual intervention required.');
        this.notifyRecoveryFailure();
      }
      
      this.isRecovering = false;
    }
  }

  /**
   * RESEARCH FIX: Recover the existing client instead of creating new instances
   * Based on research: avoid multiple client creation, focus on session recovery
   */
  public async recoverClient(): Promise<void> {
    log.debug('Utils', '🔧 [HealthMonitor] Attempting client recovery without reinitialization...');

    // Use the singleton client directly
    const existingClient = getSupabaseClient();
    
    if (!existingClient) {
      log.error('Utils', '❌ [HealthMonitor] No existing client found for recovery');
      throw new Error('No client available for recovery');
    }

    try {
      // RESEARCH FIX: Focus on session recovery instead of client recreation
      log.debug('Utils', '🔍 [HealthMonitor] Checking session validity...');
      
      // Check current session
      const { data: sessionData, error: sessionError } = await existingClient.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        log.debug('Utils', '🔄 [HealthMonitor] Invalid session detected, attempting restoration...');
        
        // PHASE 3 FIX: Use Supabase's automatic session management instead of custom localStorage
        // Removed: const authToken = localStorage.getItem('supabase.auth.token');
        // Let Supabase handle session restoration from its own storage
        
        try {
          // Try to refresh the session using Supabase's built-in mechanism
          const { data: refreshData, error: refreshError } = await existingClient.auth.refreshSession();
          
          if (refreshError || !refreshData.session) {
            log.debug('Utils', '⚠️ [HealthMonitor] Session refresh failed, session may be expired');
            await existingClient.auth.signOut({ scope: 'local' });
            // PHASE 3 FIX: Removed manual localStorage.removeItem - Supabase handles cleanup
          } else {
            log.debug('Utils', '✅ [HealthMonitor] Session restored via refresh');
          }
        } catch (e) {
          log.warn('Utils', '⚠️ [HealthMonitor] Session restoration failed:', e);
          await existingClient.auth.signOut({ scope: 'local' });
        }
      } else {
        log.debug('Utils', '✅ [HealthMonitor] Session is valid, checking connectivity...');
      }

      // RESEARCH FIX: Clean up realtime connections without recreating client
      if (existingClient.realtime) {
        try {
          // Disconnect and reconnect realtime to refresh connections
          existingClient.realtime.disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Realtime will auto-reconnect on next subscription
          log.debug('Utils', '🔄 [HealthMonitor] Realtime connections refreshed');
        } catch (realtimeError) {
          log.warn('Utils', '⚠️ [HealthMonitor] Realtime refresh warning:', realtimeError);
        }
      }

      // Test the recovered client with a simple query
      const testResult = await existingClient.from('spaces').select('id').limit(1);
      if (testResult.error) {
        throw new Error(`Recovery test failed: ${testResult.error.message}`);
      }

      log.debug('Utils', '✅ [HealthMonitor] Client recovery successful without reinitialization');
      
    } catch (error) {
      log.error('Utils', '❌ [HealthMonitor] Client recovery failed:', error);
      
      // RESEARCH FIX: As last resort, clear session and prompt re-authentication
      // instead of creating new client instances
      try {
        await existingClient.auth.signOut({ scope: 'local' });
        log.debug('Utils', '🔄 [HealthMonitor] Cleared corrupted session, user will need to re-authenticate');
        
        // Dispatch event for app to handle re-authentication
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('supabase-auth-required', {
            detail: { 
              reason: 'client-recovery-failed',
              timestamp: Date.now() 
            }
          }));
        }
      } catch (signOutError) {
        log.error('Utils', '❌ [HealthMonitor] Failed to clear session:', signOutError);
        throw error;
      }
    }
  }

  /**
   * Notify the application that recovery was successful
   */
  private notifyRecoverySuccess(): void {
    // Dispatch a custom event that components can listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-client-recovered', {
        detail: { timestamp: Date.now() }
      }));
    }

    // Clear any cache that might be stale
    this.clearStaleCache();
  }

  /**
   * Notify the application that recovery failed
   */
  private notifyRecoveryFailure(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-client-recovery-failed', {
        detail: { 
          timestamp: Date.now(),
          attempts: this.recoveryAttempts 
        }
      }));
    }
  }

  /**
   * Check if this is mobile browser network blocking (Chrome/Safari/Firefox mobile)
   */
  private isMobileBrowserBlocking(result: { error?: string; latency?: number }): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check if we're on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth <= 768;
    
    if (!isMobile) return false;
    
    // Check for characteristic mobile browser blocking errors
    const errorMessage = result.error?.toLowerCase() || '';
    const isMobileBlockingError = 
      errorMessage.includes('access control checks') ||
      errorMessage.includes('load failed') ||
      errorMessage.includes('network error') ||
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('cors error');
    
    // Check if user recently returned from background
    const hasRecentBackgroundReturn = this.hasRecentMobileBackgroundActivity();
    
    const isBlocking = isMobileBlockingError && hasRecentBackgroundReturn;
    
    if (isBlocking) {
      log.debug('Utils', '🏥 [HealthMonitor] Mobile browser blocking detected:', {
        isMobile,
        errorMessage: result.error,
        hasRecentBackgroundReturn,
        userAgent: navigator.userAgent.slice(0, 50) + '...'
      });
    }
    
    return isBlocking;
  }

  /**
   * Check if there's recent mobile background activity
   */
  private hasRecentMobileBackgroundActivity(): boolean {
    try {
      // Check mobile session manager
      const mobileSessionManager = (window as any).mobileSessionManager;
      if (mobileSessionManager) {
        const isReturning = mobileSessionManager.isReturningFromBackground();
        if (isReturning) return true;
      }
      
      // Check mobile lifecycle
      const mobileLifecycle = (window as any).mobileLifecycleDebug;
      if (mobileLifecycle) {
        const state = mobileLifecycle.getState();
        const timeSinceReturn = Date.now() - (state.lastReturnTime || 0);
        if (timeSinceReturn < 30000) { // 30 seconds
          return true;
        }
      }
      
      // Check page visibility changes (mobile backgrounding indicator)
      const lastVisibilityChange = (window as any).__lastVisibilityChange || 0;
      const timeSinceVisibilityChange = Date.now() - lastVisibilityChange;
      if (timeSinceVisibilityChange < 30000) { // 30 seconds
        return true;
      }
      
      return false;
    } catch (error) {
      log.warn('Utils', '🏥 [HealthMonitor] Background activity check failed:', error);
      return false;
    }
  }

  /**
   * Handle mobile browser blocking with progressive recovery
   */
  private handleMobileBrowserBlocking(): void {
    log.debug('Utils', '🏥 [HealthMonitor] Starting mobile browser blocking recovery...');
    
    // Mark that we're handling this to prevent recovery loops
    this.lastMobileBrowserBlocking = Date.now();
    
    // Set up progressive recovery attempts
    const progressiveRetries = [
      { delay: 2000, name: 'Initial wait (2s)' },      // Wait for browser to restore
      { delay: 5000, name: 'Extended wait (5s)' },     // Browser needs more time
      { delay: 10000, name: 'Final attempt (10s)' }    // Last chance before giving up
    ];
    
    progressiveRetries.forEach((retry, index) => {
      setTimeout(async () => {
        try {
          log.debug('Utils', `🏥 [HealthMonitor] Mobile recovery attempt ${index + 1}: ${retry.name}`);
          
          // Test if mobile browser has restored network access
          const testResult = await this.quickHealthCheck();
          
          if (testResult.healthy) {
            log.debug('Utils', `✅ [HealthMonitor] Mobile browser blocking resolved after ${retry.name}`);
            this.lastMobileBrowserBlocking = 0; // Clear flag
            this.consecutiveFailures = 0; // Reset failure count
            return;
          }
          
          // If this is the last attempt and still failing, allow normal recovery
          if (index === progressiveRetries.length - 1) {
            log.warn('Utils', '🏥 [HealthMonitor] Mobile browser blocking persists, allowing normal recovery');
            this.lastMobileBrowserBlocking = 0; // Clear flag so normal recovery can proceed
          }
          
        } catch (error) {
          log.warn('Utils', `🏥 [HealthMonitor] Mobile recovery attempt ${index + 1} failed:`, error);
        }
      }, retry.delay);
    });
  }

  /**
   * Quick health check for mobile recovery testing
   */
  private async quickHealthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const startTime = performance.now();
      
      // Get the current client using the singleton pattern
      const supabase = getSupabaseClient();
      
      if (!supabase) {
        return { healthy: false, error: 'Supabase client not available' };
      }
      
      // Use a very simple query that should work quickly
      const { error } = await supabase
        .from('spaces')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      
      const latency = performance.now() - startTime;
      
      if (error) {
        return { healthy: false, error: error.message };
      }
      
      if (latency > 10000) { // 10 seconds is still too slow
        return { healthy: false, error: 'Slow response' };
      }
      
      return { healthy: true };
      
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if Phase 1 is actively handling Safari mobile network blocking
   */
  private isPhase1HandlingSafariBlocking(): boolean {
    if (typeof window === 'undefined') return false;
    
    const phase1Recovery = (window as any).phase1Recovery;
    if (!phase1Recovery) return false;
    
    try {
      const phase1State = phase1Recovery.getState();
      const phase1Stats = phase1Recovery.getStats();
      
      // Check if Phase 1 is active and has recent Safari blocking activity
      const isPhase1Active = phase1State.isActive;
      const hasRecentBackgroundReturn = phase1State.backgroundReturnCount > 0 && 
                                       (Date.now() - phase1State.lastRecoveryTime) < 30000; // 30 seconds
      
      // Check if this is Safari mobile
      const isSafariMobile = /Safari/.test(navigator.userAgent) && 
                            /Mobi|Android/i.test(navigator.userAgent);
      
      // If Phase 1 is handling mobile recovery and we're on Safari mobile
      const isHandlingSafariBlocking = (isPhase1Active || hasRecentBackgroundReturn) && isSafariMobile;
      
      if (isHandlingSafariBlocking) {
        log.debug('Utils', '🏥 [HealthMonitor] Phase 1 Safari blocking detected:', {
          isPhase1Active,
          hasRecentBackgroundReturn,
          isSafariMobile,
          backgroundReturnCount: phase1State.backgroundReturnCount,
          timeSinceLastRecovery: Date.now() - phase1State.lastRecoveryTime
        });
      }
      
      return isHandlingSafariBlocking;
      
    } catch (error) {
      log.warn('Utils', '🏥 [HealthMonitor] Phase 1 coordination check failed:', error);
      return false;
    }
  }

  /**
   * Clear stale cache entries
   */
  private clearStaleCache(): void {
    try {
      // Clear cache functions if available
      if (typeof window !== 'undefined') {
        const clearFunctions = [
          'clearMembersCache',
          'clearPostsCache', 
          'clearCategoriesCache'
        ];

        clearFunctions.forEach(funcName => {
          if ((window as any)[funcName]) {
            (window as any)[funcName]();
          }
        });
      }
    } catch (e) {
      log.warn('Utils', '⚠️ [HealthMonitor] Cache clear warning:', e);
    }
  }

  /**
   * Get the last health check result
   */
  public getLastHealthCheck(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  /**
   * Check if the client is currently healthy
   */
  public isClientHealthy(): boolean {
    return this.lastHealthCheck?.isHealthy ?? false;
  }

  /**
   * Get health status for debugging
   */
  public getHealthStatus(): {
    isHealthy: boolean;
    lastCheck: HealthCheckResult | null;
    isRecovering: boolean;
    recoveryAttempts: number;
  } {
    return {
      isHealthy: this.isClientHealthy(),
      lastCheck: this.lastHealthCheck,
      isRecovering: this.isRecovering,
      recoveryAttempts: this.recoveryAttempts
    };
  }
}

// Export singleton instance
export const supabaseHealthMonitor = SupabaseHealthMonitor.getInstance();

// Auto-start monitoring in browser environment
if (typeof window !== 'undefined') {
  // Start monitoring after a short delay to allow client initialization
  setTimeout(() => {
    supabaseHealthMonitor.startMonitoring();
  }, 2000);

  // Expose to window for debugging
  (window as any).supabaseHealthMonitor = supabaseHealthMonitor;
  
  // ENHANCED: Expose manual recovery functions for immediate fixes
  (window as any).checkSupabaseHealth = async () => {
    log.debug('Utils', '🏥 [Manual] Performing health check...');
    const result = await supabaseHealthMonitor.performHealthCheck();
    log.debug('Utils', '🏥 [Manual] Health check result:', result);
    return result;
  };
  
  (window as any).recoverSupabaseClient = async () => {
    log.debug('Utils', '🔧 [Manual] Starting manual client recovery...');
    try {
      await supabaseHealthMonitor.recoverClient();
      log.debug('Utils', '✅ [Manual] Client recovery completed');
      
      // Verify recovery worked
      const healthCheck = await supabaseHealthMonitor.performHealthCheck();
      if (healthCheck.isHealthy) {
        log.debug('Utils', '🎉 [Manual] Recovery successful - client is now healthy!');
      } else {
        log.debug('Utils', '⚠️ [Manual] Recovery completed but client still unhealthy');
      }
      
      return { success: true, healthy: healthCheck.isHealthy };
    } catch (error) {
      log.error('Utils', '❌ [Manual] Recovery failed:', error);
      return { success: false, error: error.message };
    }
  };
} 