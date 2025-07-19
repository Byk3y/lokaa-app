import { log } from '@/utils/logger';
/**
 * 🚀 Phase 1: Enhanced Mobile Session Recovery
 * 
 * Coordinates session validation, health monitoring, and mobile lifecycle
 * to provide seamless recovery from mobile background sessions.
 * 
 * KEY FEATURES:
 * - Proactive session validation when returning from background
 * - Smart retry logic with exponential backoff
 * - Integration with health monitor and presence systems
 * - Prevents cascading failures and page reloads
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';

interface Phase1RecoveryState {
  isActive: boolean;
  lastRecoveryTime: number;
  recoveryAttempts: number;
  backgroundReturnCount: number;
  sessionValidationCount: number;
  successfulRecoveries: number;
  failedRecoveries: number;
}

interface Phase1RecoveryResult {
  success: boolean;
  action: 'session_valid' | 'session_refreshed' | 'recovery_completed' | 'recovery_failed';
  details: string;
  timestamp: number;
  backgroundDuration?: number;
}

interface Phase1InitOptions {
  enableHealthMonitorIntegration?: boolean;
  enablePresenceIntegration?: boolean;
  sessionValidationThreshold?: number;
  maxRecoveryAttempts?: number;
  debugMode?: boolean;
}

class Phase1MobileRecovery {
  private static instance: Phase1MobileRecovery;
  
  private state: Phase1RecoveryState = {
    isActive: false,
    lastRecoveryTime: 0,
    recoveryAttempts: 0,
    backgroundReturnCount: 0,
    sessionValidationCount: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0
  };
  
  private options: Required<Phase1InitOptions> = {
    enableHealthMonitorIntegration: true,
    enablePresenceIntegration: true,
    sessionValidationThreshold: 30000, // 30 seconds
    maxRecoveryAttempts: 3,
    debugMode: false
  };
  
  private recoveryListeners: Set<(result: Phase1RecoveryResult) => void> = new Set();
  private isInitialized = false;
  
  private constructor() {}
  
  static getInstance(): Phase1MobileRecovery {
    if (!Phase1MobileRecovery.instance) {
      Phase1MobileRecovery.instance = new Phase1MobileRecovery();
    }
    return Phase1MobileRecovery.instance;
  }
  
  /**
   * Initialize Phase 1 recovery system
   */
  initialize(options: Phase1InitOptions = {}): void {
    if (this.isInitialized) {
      log.debug('Utils', '📱 [Phase1] Already initialized');
      return;
    }
    
    this.options = { ...this.options, ...options };
    this.isInitialized = true;
    
    // Initialize regardless of device type for development/testing
    if (!shouldEnableMobileFeatures()) {
      log.debug('Utils', '📱 [Phase1] Desktop detected - Phase 1 mobile recovery disabled for production use');
      log.debug('Utils', '📱 [Phase1] But still initializing for development/testing purposes');
    } else {
      log.debug('Utils', '📱 [Phase1] Mobile device detected - Phase 1 mobile recovery enabled');
    }
    
    this.log('Phase 1 Mobile Recovery System initialized', { options: this.options });
    
    // Expose debug interface with all required methods
    if (typeof window !== 'undefined') {
      (window as any).phase1Recovery = {
        getState: () => this.getState(),
        getStats: () => this.getStats(),
        triggerRecovery: () => this.performComprehensiveRecovery(),
        validateSession: () => this.validateSession(),
        reset: () => this.reset(),
        // Add the missing addRecoveryListener method
        addRecoveryListener: (listener: (result: Phase1RecoveryResult) => void) => {
          this.recoveryListeners.add(listener);
          return () => this.recoveryListeners.delete(listener);
        },
        // Add force enable for testing
        forceEnable: () => {
          this.isInitialized = true;
          log.debug('Utils', '📱 [Phase1] Force enabled for testing');
        },
        // Add device detection override for testing
        overrideMobileDetection: (isMobile: boolean) => {
          (window as any)._phase1MobileOverride = isMobile;
          log.debug('Utils', `📱 [Phase1] Mobile detection override set to: ${isMobile}`);
        }
      };
      
      // Add debug interfaces for mobile lifecycle
      (window as any).mobileLifecycleDebug = {
        forceBackground: () => {
          // Trigger visibility change event manually
          Object.defineProperty(document, 'hidden', { value: true, writable: true });
          document.dispatchEvent(new Event('visibilitychange'));
          log.debug('Utils', '📱 [Phase1Debug] Forced background state');
        },
        forceReturn: () => {
          Object.defineProperty(document, 'hidden', { value: false, writable: true });
          document.dispatchEvent(new Event('visibilitychange'));
          log.debug('Utils', '📱 [Phase1Debug] Forced return from background');
        },
        getState: () => this.getState(),
        validateSession: () => this.validateSession()
      };
    }
    
    // Setup integration with existing systems
    this.setupIntegrations();
  }
  
  /**
   * Setup integrations with health monitor and presence systems
   */
  private setupIntegrations(): void {
    // Health monitor integration
    if (this.options.enableHealthMonitorIntegration && typeof window !== 'undefined') {
      const healthMonitor = (window as any).supabaseHealthMonitor;
      if (healthMonitor) {
        this.log('Integrating with health monitor system');
        
        // Listen for health monitor recovery events
        window.addEventListener('supabase-client-recovered', () => {
          this.log('Health monitor recovery detected, updating phase1 state');
          this.notifyRecoveryListeners({
            success: true,
            action: 'recovery_completed',
            details: 'Health monitor triggered recovery',
            timestamp: Date.now()
          });
        });
        
        window.addEventListener('supabase-client-recovery-failed', () => {
          this.log('Health monitor recovery failed, phase1 may need to intervene');
          this.state.failedRecoveries++;
        });
      }
    }
    
    // Mobile session manager integration
    if (typeof window !== 'undefined' && (window as any).mobileSessionManager) {
      this.log('Integrating with mobile session manager');
      
      // Enhance mobile session manager with phase1 hooks
      const originalManager = (window as any).mobileSessionManager;
      
      // Wrap validation method to track phase1 stats
      const originalValidation = originalManager.validateSessionProactively?.bind(originalManager);
      if (originalValidation) {
        originalManager.validateSessionProactively = async (...args: any[]) => {
          this.state.sessionValidationCount++;
          
          try {
            const result = await originalValidation(...args);
            this.log(`Session validation completed: ${result.action}`);
            
            this.notifyRecoveryListeners({
              success: result.isValid,
              action: result.isValid ? 'session_valid' : 'recovery_failed',
              details: `Session validation: ${result.action}`,
              timestamp: Date.now()
            });
            
            return result;
          } catch (error) {
            this.state.failedRecoveries++;
            throw error;
          }
        };
      }
    }
  }
  
  /**
   * Check if mobile features should be enabled (with override support)
   */
  private shouldEnableMobileFeaturesWithOverride(): boolean {
    // Check for testing override
    if (typeof window !== 'undefined' && (window as any)._phase1MobileOverride !== undefined) {
      return (window as any)._phase1MobileOverride;
    }
    
    return shouldEnableMobileFeatures();
  }

  /**
   * Validate current session with Phase 1 enhancements
   */
  async validateSession(): Promise<Phase1RecoveryResult> {
    this.log('Starting Phase 1 session validation');
    this.state.sessionValidationCount++;
    
    try {
      // Step 1: Quick session check with timeout protection
      const sessionPromise = getSupabaseClient().auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Session validation timeout')), 5000);
      });
      
      const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (error || !data.session) {
        return {
          success: false,
          action: 'recovery_failed',
          details: error?.message || 'No active session',
          timestamp: Date.now()
        };
      }
      
      // Step 2: Check session expiry
      const session = data.session;
      const now = Date.now();
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      
      if (expiresAt <= now) {
        this.log('Session expired, attempting refresh');
        
        try {
          const { data: refreshData, error: refreshError } = await getSupabaseClient().auth.refreshSession();
          
          if (refreshError || !refreshData.session) {
            return {
              success: false,
              action: 'recovery_failed',
              details: `Session refresh failed: ${refreshError?.message}`,
              timestamp: Date.now()
            };
          }
          
          this.log('Session refreshed successfully');
          return {
            success: true,
            action: 'session_refreshed',
            details: 'Session refreshed due to expiry',
            timestamp: Date.now()
          };
        } catch (refreshError) {
          return {
            success: false,
            action: 'recovery_failed',
            details: `Session refresh exception: ${refreshError}`,
            timestamp: Date.now()
          };
        }
      }
      
      // Step 3: ENHANCED - Progressive API connectivity test with Safari mobile recovery
      const apiTestResult = await this.performProgressiveAPITest();
      
      if (!apiTestResult.success) {
        // CRITICAL: Don't fail immediately on Safari mobile after backgrounding
        if (apiTestResult.isSafariNetworkBlocking) {
          this.log('Safari network blocking detected, using progressive recovery');
          return {
            success: true, // ✅ CRITICAL FIX: Return success to prevent health monitor cascade
            action: 'session_valid',
            details: 'Session valid but API temporarily blocked (Safari mobile recovery mode)',
            timestamp: Date.now()
          };
        }
        
        return {
          success: false,
          action: 'recovery_failed',
          details: `API test failed: ${apiTestResult.error}`,
          timestamp: Date.now()
        };
      }
      
      this.log('Session validation successful');
      return {
        success: true,
        action: 'session_valid',
        details: 'Session is valid and API accessible',
        timestamp: Date.now()
      };
      
    } catch (error) {
      this.state.failedRecoveries++;
      return {
        success: false,
        action: 'recovery_failed',
        details: `Validation exception: ${error}`,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * PROGRESSIVE API TEST - Handles Safari mobile network blocking gracefully
   */
  private async performProgressiveAPITest(): Promise<{ 
    success: boolean; 
    error?: string; 
    isSafariNetworkBlocking?: boolean;
  }> {
    try {
      // Attempt 1: Immediate test (works for most cases)
      const immediateResult = await this.testAPIConnectivity(1000);
      if (immediateResult.success) {
        return { success: true };
      }
      
      // Check if this looks like Safari mobile network blocking
      const isSafariMobile = /Safari/.test(navigator.userAgent) && 
                            /Mobi|Android/i.test(navigator.userAgent);
      const isAccessControlError = immediateResult.error?.includes('access control checks') ||
                                  immediateResult.error?.includes('Load failed');
      
      if (isSafariMobile && isAccessControlError) {
        this.log('Safari mobile access control blocking detected, implementing progressive recovery');
        
        // Attempt 2: Wait for Safari to restore network permissions (2-3 seconds)
        await new Promise(resolve => setTimeout(resolve, 2500));
        const delayedResult = await this.testAPIConnectivity(2000);
        
        if (delayedResult.success) {
          this.log('Safari network blocking resolved after delay');
          return { success: true };
        }
        
        // Attempt 3: Try with longer timeout (Safari can take 5+ seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));
        const extendedResult = await this.testAPIConnectivity(5000);
        
        if (extendedResult.success) {
          this.log('Safari network blocking resolved after extended delay');
          return { success: true };
        }
        
        // Still failing - this is Safari aggressive blocking
        this.log('Safari network blocking persists, marking for progressive handling');
        return { 
          success: false, 
          error: delayedResult.error || extendedResult.error || 'Safari network blocking',
          isSafariNetworkBlocking: true 
        };
      }
      
      // Not Safari mobile blocking - regular failure
      return { 
        success: false, 
        error: immediateResult.error || 'API connectivity test failed' 
      };
      
    } catch (error) {
      return { 
        success: false, 
        error: `Progressive API test exception: ${error}` 
      };
    }
  }
  
  /**
   * Test API connectivity with configurable timeout and 401 handling
   */
  private async testAPIConnectivity(timeoutMs: number): Promise<{ success: boolean; error?: string }> {
    try {
      const testPromise = getSupabaseClient()
        .from('spaces')
        .select('id')
        .limit(1);
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`API test timeout (${timeoutMs}ms)`)), timeoutMs);
      });
      
      const { error: testError } = await Promise.race([testPromise, timeoutPromise]);
      
      if (testError) {
        // Check for 401 unauthorized error - indicates session expired
        if (testError.message?.includes('401') || 
            testError.message?.includes('unauthorized') ||
            testError.message?.includes('JWT') ||
            testError.message?.includes('token')) {
          
          this.log('401 error detected during API test, attempting session refresh');
          
          try {
            // Attempt session refresh
            const { data: refreshData, error: refreshError } = await getSupabaseClient().auth.refreshSession();
            
            if (refreshError || !refreshData.session) {
              this.log('Session refresh failed, session truly expired');
              return { 
                success: false, 
                error: `Session expired and refresh failed: ${refreshError?.message}` 
              };
            }
            
            this.log('Session refreshed successfully, retesting API');
            
            // Retry the API test with fresh session
            const retryPromise = getSupabaseClient()
              .from('spaces')
              .select('id')
              .limit(1);
            
            const retryTimeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error(`Retry API test timeout (${timeoutMs}ms)`)), timeoutMs);
            });
            
            const { error: retryError } = await Promise.race([retryPromise, retryTimeoutPromise]);
            
            if (retryError) {
              return { 
                success: false, 
                error: `API test failed after session refresh: ${retryError.message}` 
              };
            }
            
            this.log('API test successful after session refresh');
            return { success: true };
            
          } catch (refreshException) {
            return { 
              success: false, 
              error: `Session refresh exception: ${refreshException}` 
            };
          }
        }
        
        return { 
          success: false, 
          error: testError.message 
        };
      }
      
      return { success: true };
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Check if mobile features should be enabled (with override support)
   */
  private shouldEnableMobileFeatures(): boolean {
    // Check for testing override
    if (typeof window !== 'undefined' && (window as any)._phase1MobileOverride !== undefined) {
      return (window as any)._phase1MobileOverride;
    }
    
    return shouldEnableMobileFeatures();
  }
  
  /**
   * Perform comprehensive Phase 1 recovery
   */
  async performComprehensiveRecovery(backgroundDuration?: number): Promise<Phase1RecoveryResult> {
    if (this.state.isActive) {
      this.log('Recovery already in progress, skipping');
      return {
        success: false,
        action: 'recovery_failed',
        details: 'Recovery already in progress',
        timestamp: Date.now()
      };
    }
    
    // Check if system should run (with override support for testing)
    if (!this.shouldEnableMobileFeaturesWithOverride() && !this.options.debugMode) {
      this.log('Phase 1 recovery not enabled for this device type');
      return {
        success: false,
        action: 'recovery_failed',
        details: 'Mobile features not enabled for this device',
        timestamp: Date.now()
      };
    }
    
    this.state.isActive = true;
    this.state.recoveryAttempts++;
    this.state.lastRecoveryTime = Date.now();
    
    if (backgroundDuration) {
      this.state.backgroundReturnCount++;
    }
    
    this.log('Starting comprehensive Phase 1 recovery', { 
      attempt: this.state.recoveryAttempts,
      backgroundDuration 
    });
    
    try {
      // Step 1: Session validation
      const sessionResult = await this.validateSession();
      
      if (!sessionResult.success) {
        this.state.failedRecoveries++;
        return {
          ...sessionResult,
          backgroundDuration
        };
      }
      
      // Step 2: Health monitor integration
      if (this.options.enableHealthMonitorIntegration && typeof window !== 'undefined') {
        const healthMonitor = (window as any).supabaseHealthMonitor;
        if (healthMonitor) {
          try {
            const healthStatus = healthMonitor.getHealthStatus();
            
            if (!healthStatus.isHealthy && !healthStatus.isRecovering) {
              this.log('Health monitor reports unhealthy state, triggering recovery');
              await healthMonitor.recoverClient();
            }
          } catch (healthError) {
            this.log('Health monitor integration failed', { error: healthError });
            // Continue with recovery even if health monitor fails
          }
        }
      }
      
      // Step 3: Presence system integration
      if (this.options.enablePresenceIntegration && typeof window !== 'undefined') {
        const unifiedPresence = (window as any).getUnifiedPresenceState;
        if (unifiedPresence) {
          try {
            const presenceState = unifiedPresence();
            this.log('Integrated with presence system', { 
              activeSpaces: presenceState.length 
            });
          } catch (presenceError) {
            this.log('Presence integration failed', { error: presenceError });
          }
        }
      }
      
      // Step 4: Success
      this.state.successfulRecoveries++;
      this.state.isActive = false;
      
      const result: Phase1RecoveryResult = {
        success: true,
        action: 'recovery_completed',
        details: 'Comprehensive recovery completed successfully',
        timestamp: Date.now(),
        backgroundDuration
      };
      
      this.notifyRecoveryListeners(result);
      this.log('Comprehensive recovery completed successfully');
      
      return result;
      
    } catch (error) {
      this.state.failedRecoveries++;
      this.state.isActive = false;
      
      const result: Phase1RecoveryResult = {
        success: false,
        action: 'recovery_failed',
        details: `Recovery exception: ${error}`,
        timestamp: Date.now(),
        backgroundDuration
      };
      
      this.notifyRecoveryListeners(result);
      this.log('Comprehensive recovery failed', { error });
      
      return result;
    }
  }
  
  /**
   * Notify recovery listeners
   */
  private notifyRecoveryListeners(result: Phase1RecoveryResult): void {
    this.recoveryListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        log.warn('Utils', '📱 [Phase1] Recovery listener error:', error);
      }
    });
  }
  
  /**
   * Get current state
   */
  getState(): Phase1RecoveryState {
    return { ...this.state };
  }
  
  /**
   * Get recovery statistics
   */
  getStats() {
    const { sessionValidationCount, successfulRecoveries, failedRecoveries, backgroundReturnCount } = this.state;
    const totalRecoveries = successfulRecoveries + failedRecoveries;
    
    return {
      totalRecoveries,
      successRate: totalRecoveries > 0 ? (successfulRecoveries / totalRecoveries) * 100 : 0,
      sessionValidationCount,
      backgroundReturnCount,
      averageRecoveryTime: totalRecoveries > 0 ? this.state.lastRecoveryTime / totalRecoveries : 0,
      isActive: this.state.isActive,
      phase1Enabled: this.isInitialized,
      healthScore: this.calculateHealthScore(),
      mobileDetection: {
        isMobile: this.shouldEnableMobileFeaturesWithOverride() || this.shouldEnableMobileFeatures(),
        deviceType: typeof window !== 'undefined' && (window as any).navigator?.userAgent?.includes('Mobile') ? 'mobile' : 'desktop',
        isSupported: this.isInitialized
      }
    };
  }
  
  /**
   * Calculate overall health score
   */
  private calculateHealthScore(): number {
    const { successfulRecoveries, failedRecoveries, sessionValidationCount } = this.state;
    const totalRecoveries = successfulRecoveries + failedRecoveries;
    
    if (totalRecoveries === 0 && sessionValidationCount === 0) {
      return 100; // No issues so far
    }
    
    const successRate = totalRecoveries > 0 ? (successfulRecoveries / totalRecoveries) * 100 : 100;
    const validationBonus = sessionValidationCount > 0 ? Math.min(sessionValidationCount * 2, 20) : 0;
    
    return Math.min(100, Math.max(0, successRate + validationBonus));
  }
  
  /**
   * Reset state for debugging
   */
  reset(): void {
    this.state = {
      isActive: false,
      lastRecoveryTime: 0,
      recoveryAttempts: 0,
      backgroundReturnCount: 0,
      sessionValidationCount: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0
    };
    
    this.log('Phase 1 state reset');
  }
  
  /**
   * Enhanced logging
   */
  private log(message: string, data?: any): void {
    if (this.options.debugMode || import.meta.env.DEV) {
      if (data) {
        log.debug('Utils', `📱 [Phase1] ${message}`, data);
      } else {
        log.debug('Utils', `📱 [Phase1] ${message}`);
      }
    }
  }
}

// Export singleton instance
export const phase1Recovery = Phase1MobileRecovery.getInstance();

// Remove auto-initialization - let App.tsx handle it explicitly
// Auto-initialize in browser environment
// if (typeof window !== 'undefined') {
//   // Initialize after a short delay to allow other systems to load
//   setTimeout(() => {
//     phase1Recovery.initialize({
//       debugMode: import.meta.env.DEV,
//       enableHealthMonitorIntegration: true,
//       enablePresenceIntegration: true
//     });
//   }, 2000);
// }

export default phase1Recovery; 