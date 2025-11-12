import { log } from '@/utils/logger';
/**
 * 🛡️ Supabase Load Failed Error Blocker
 * 
 * Prevents "TypeError: Load failed" errors from Supabase JS library
 * from triggering React error boundaries and implements intelligent 
 * session refresh recovery instead of page reloads.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { globalRealtimeService } from '@/services/GlobalRealtimeService';
import { MOBILE_SAFE_RELOAD_DELAY_MS, MAX_REFRESH_RETRIES } from '@/constants/mobile';

// ✅ FIXED: Add configuration interface for better control
interface BlockerConfig {
  enabled: boolean;
  developmentMode: boolean;
  logBlockedErrors: boolean;
  allowConsoleErrors: boolean;
  strictMode: boolean;
}

class SupabaseLoadFailedBlocker {
  private static instance: SupabaseLoadFailedBlocker;
  private isInitialized = false;
  private backgroundStartTime = 0;
  private consecutiveFailedRefreshes = 0;
  private isRefreshing = false;
  
  // ✅ FIXED: Add configuration with sensible defaults
  private config: BlockerConfig = {
    enabled: true,
    developmentMode: process.env.NODE_ENV === 'development',
    logBlockedErrors: true,
    allowConsoleErrors: process.env.NODE_ENV === 'development',
    strictMode: false // When true, only blocks exact matches
  };
  
  private constructor() {
    this.initializeErrorBlocking();
    this.setupBackgroundTracking();
  }
  
  static getInstance(): SupabaseLoadFailedBlocker {
    if (!SupabaseLoadFailedBlocker.instance) {
      SupabaseLoadFailedBlocker.instance = new SupabaseLoadFailedBlocker();
    }
    return SupabaseLoadFailedBlocker.instance;
  }

  private setupBackgroundTracking(): void {
    if (typeof window === 'undefined') return;
    
    // Track when app goes to background
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.backgroundStartTime = Date.now();
        log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] App backgrounded at', new Date().toLocaleTimeString());
      } else {
        const backgroundDuration = Date.now() - this.backgroundStartTime;
        log.debug('Utils', `🛡️ [SupabaseLoadFailedBlocker] App foregrounded after ${backgroundDuration}ms`);
      }
    });
  }

  private async handleLoadFailed(): Promise<void> {
    // Check if we've been in background for less than the safe delay
    const timeSinceBackground = Date.now() - this.backgroundStartTime;
    
    if (timeSinceBackground < MOBILE_SAFE_RELOAD_DELAY_MS) {
      log.debug('Utils', `🛡️ [SupabaseLoadFailedBlocker] Ignoring load failed - only ${timeSinceBackground}ms since background (< ${MOBILE_SAFE_RELOAD_DELAY_MS}ms)`);
      return;
    }

    // Prevent concurrent refresh attempts
    if (this.isRefreshing) {
      log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Refresh already in progress, ignoring');
      return;
    }

    this.isRefreshing = true;
    
    try {
      log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Attempting session refresh...');
      
      const supabaseClient = getSupabaseClient();
      if (!supabaseClient) {
        throw new Error('Supabase client not available');
      }
      const { data, error } = await supabaseClient.auth.refreshSession();
      
      if (error) {
        throw error;
      }
      
      if (data?.session) {
        log.debug('Utils', '✅ [SupabaseLoadFailedBlocker] Session refresh successful');
        this.consecutiveFailedRefreshes = 0;
        
        // Reconnect all real-time subscriptions
        log.debug('Utils', '🔔 [SupabaseLoadFailedBlocker] Reconnecting real-time subscriptions...');
        globalRealtimeService.reconnectAll();
        
        log.debug('Utils', '✅ [SupabaseLoadFailedBlocker] Recovery complete');
      } else {
        throw new Error('No session returned from refresh');
      }
      
    } catch (error) {
      this.consecutiveFailedRefreshes++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      log.error('Utils', `❌ [SupabaseLoadFailedBlocker] Session refresh failed (attempt ${this.consecutiveFailedRefreshes}/${MAX_REFRESH_RETRIES}):`, new Error(errorMessage));
      
      if (this.consecutiveFailedRefreshes >= MAX_REFRESH_RETRIES) {
        // Show toast asking user to manually reload
        this.showManualReloadToast();
        // Reset counter to prevent spam
        this.consecutiveFailedRefreshes = 0;
      } else {
        // Schedule retry with exponential backoff
        this.scheduleRetryWithBackoff();
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  private scheduleRetryWithBackoff(): void {
    const baseDelay = 5000; // 5 seconds
    const maxDelay = 180000; // 3 minutes
    const delay = Math.min(baseDelay * Math.pow(2, this.consecutiveFailedRefreshes - 1), maxDelay);
    
    log.debug('Utils', `🔄 [SupabaseLoadFailedBlocker] Scheduling retry in ${delay}ms (attempt ${this.consecutiveFailedRefreshes}/${MAX_REFRESH_RETRIES})`);
    
    setTimeout(() => {
      this.handleLoadFailed();
    }, delay);
  }

  private showManualReloadToast(): void {
    // Dispatch custom event for the app to handle (no dynamic import needed)
    const event = new CustomEvent('supabase-manual-reload-needed', {
      detail: {
        title: 'Connection Issue',
        description: 'Please refresh the page to restore connection.',
        variant: 'destructive'
      }
    });
    
    window.dispatchEvent(event);
  }
  
  private initializeErrorBlocking(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Initializing intelligent recovery protection...');
    
    // ✅ FIXED: Type-safe error event handling
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(type: string, listener: any, options?: any) {
      if (type === 'error') {
        const wrappedListener = (event: Event) => {
          const errorEvent = event as ErrorEvent;
          if (SupabaseLoadFailedBlocker.isSupabaseLoadError(errorEvent.error || errorEvent.message)) {
            log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Blocked Supabase Load failed error event');
            SupabaseLoadFailedBlocker.getInstance().handleLoadFailed();
            errorEvent.preventDefault();
            errorEvent.stopPropagation();
            return false;
          }
          return (listener as EventListener)(event);
        };
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    // 2. BLOCK UNHANDLED PROMISE REJECTIONS FROM SUPABASE
    window.addEventListener('unhandledrejection', (event) => {
      if (SupabaseLoadFailedBlocker.isSupabaseLoadError(event.reason)) {
        log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Blocked Supabase Load failed promise rejection');
        SupabaseLoadFailedBlocker.getInstance().handleLoadFailed();
        event.preventDefault();
        return false;
      }
    }, true);
    
    // ✅ FIXED: Preserve developer experience with configuration respect
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const errorMessage = args.join(' ');
      const instance = SupabaseLoadFailedBlocker.getInstance();
      
      if (instance.shouldBlockError(errorMessage)) {
        // ✅ FIXED: Log the blocked error based on configuration
        if (instance.config.logBlockedErrors) {
          if (instance.config.developmentMode) {
            log.warn('Utils', '🛡️ [SupabaseLoadFailedBlocker] BLOCKED Supabase Load failed error (dev mode):', ...args);
            log.warn('Utils', '📱 [SupabaseLoadFailedBlocker] Triggering intelligent session recovery');
          } else {
            log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Blocked Supabase Load failed error (prod mode)');
          }
        }
        
        instance.handleLoadFailed();
        
        // ✅ FIXED: Still call original console.error if configured to allow it
        if (instance.config.allowConsoleErrors) {
          return originalConsoleError.apply(console, args);
        }
        return;
      }
      
      return originalConsoleError.apply(console, args);
    };
    
    // ✅ FIXED: Preserve developer experience in window.onerror handler
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (SupabaseLoadFailedBlocker.isSupabaseLoadError(error || message)) {
        // ✅ FIXED: Log blocked error for developers
        if (process.env.NODE_ENV === 'development') {
          log.warn('Utils', '🛡️ [SupabaseLoadFailedBlocker] BLOCKED window.onerror (dev mode):', { message, source, lineno, colno, error });
        } else {
          log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Blocked Supabase Load failed window.onerror');
        }
        
        SupabaseLoadFailedBlocker.getInstance().handleLoadFailed();
        return true; // Prevent default handling
      }
      
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };
    
    // 5. INTERCEPT REACT ERROR BOUNDARY TRIGGERS
    this.interceptReactErrorBoundaries();
    
    this.isInitialized = true;
    log.debug('Utils', '✅ [SupabaseLoadFailedBlocker] Intelligent recovery protection active');
  }
  
  private static isSupabaseLoadError(error: any): boolean {
    if (!error) return false;
    
    const errorString = typeof error === 'string' ? error : 
                       error.message || error.toString() || '';
    
    // ✅ FIXED: More specific error detection - only block exact Supabase load failed errors
    return (
      // Primary: Exact TypeError: Load failed from Supabase library
      (errorString === 'TypeError: Load failed' && 
       this.isFromSupabaseLibrary(error)) ||
      
      // Secondary: Specific Supabase fetch failures with exact patterns
      (errorString.includes('TypeError: Load failed') && 
       errorString.includes('supabase-js') &&
       this.isFromSupabaseLibrary(error)) ||
      
      // Mobile-specific: Load failed errors on mobile devices from Supabase
      (errorString.includes('Load failed') && 
       /iPhone|iPad|iPod|Android|webOS|BlackBerry/i.test(navigator.userAgent) &&
       this.isFromSupabaseLibrary(error))
    );
  }

  // ✅ FIXED: Add stack trace analysis to ensure error is from Supabase library
  private static isFromSupabaseLibrary(error: any): boolean {
    if (!error) return false;
    
    // Check stack trace for Supabase library indicators
    const stack = error.stack || error.error?.stack || '';
    const errorString = typeof error === 'string' ? error : 
                       error.message || error.toString() || '';
    
    return (
      // Stack trace indicators
      stack.includes('supabase-js') ||
      stack.includes('@supabase') ||
      stack.includes('supabase.co') ||
      
      // Error message indicators (more specific)
      (errorString.includes('supabase-js') && errorString.includes('Load failed')) ||
      (errorString.includes('@supabase') && errorString.includes('Load failed')) ||
      
      // Network error indicators from Supabase
      (errorString.includes('Failed to fetch') && 
       errorString.includes('supabase.co') &&
       errorString.includes('Load failed'))
    );
  }

  // ✅ FIXED: Add strict mode error detection for exact matches only
  private static isExactSupabaseLoadError(error: any): boolean {
    if (!error) return false;
    
    const errorString = typeof error === 'string' ? error : 
                       error.message || error.toString() || '';
    
    // Only block exact "TypeError: Load failed" from Supabase library
    return (
      errorString === 'TypeError: Load failed' && 
      this.isFromSupabaseLibrary(error)
    );
  }
  
  private interceptReactErrorBoundaries(): void {
    // ✅ FIXED: Type-safe React error boundary interception
    if (typeof window !== 'undefined') {
      const originalDefineProperty = Object.defineProperty;
      
      Object.defineProperty = function<T>(obj: T, prop: string, descriptor: PropertyDescriptor & ThisType<any>): T {
        if (prop === 'componentDidCatch' && descriptor.value) {
          const originalComponentDidCatch = descriptor.value;
          
          descriptor.value = function(error: Error, errorInfo: any) {
            if (SupabaseLoadFailedBlocker.isSupabaseLoadError(error)) {
              log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Blocked Supabase error from React boundary');
              SupabaseLoadFailedBlocker.getInstance().handleLoadFailed();
              return; // Don't trigger error boundary
            }
            
            return originalComponentDidCatch.call(this, error, errorInfo);
          };
        }
        
        return originalDefineProperty.call(this, obj, prop, descriptor) as T;
      };
    }
  }
  
  // ✅ FIXED: Check if an error should be blocked with configuration respect
  public shouldBlockError(error: any): boolean {
    if (!this.config.enabled) {
      return false;
    }
    
    if (this.config.strictMode) {
      // In strict mode, only block exact matches
      return SupabaseLoadFailedBlocker.isExactSupabaseLoadError(error);
    }
    
    return SupabaseLoadFailedBlocker.isSupabaseLoadError(error);
  }
  
  // Public method to manually suppress an error
  public suppressError(error: any): void {
    if (this.shouldBlockError(error)) {
      log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Manually suppressed Supabase Load failed error');
      this.handleLoadFailed();
    }
  }

  // Public method to manually trigger recovery (for testing)
  public triggerRecovery(): void {
    log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Manual recovery triggered');
    this.handleLoadFailed();
  }

  // Public method to reset retry counter (for testing)
  public resetRetryCounter(): void {
    this.consecutiveFailedRefreshes = 0;
    log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Retry counter reset');
  }

  // Public getter for testing
  public getRetryCount(): number {
    return this.consecutiveFailedRefreshes;
  }

  // ✅ FIXED: Add configuration control methods
  public configure(newConfig: Partial<BlockerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Configuration updated:', this.config);
  }

  public getConfig(): BlockerConfig {
    return { ...this.config };
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public enable(): void {
    this.config.enabled = true;
    log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Blocker enabled');
  }

  public disable(): void {
    this.config.enabled = false;
    log.debug('Utils', '🛡️ [SupabaseLoadFailedBlocker] Blocker disabled');
  }

  public setStrictMode(strict: boolean): void {
    this.config.strictMode = strict;
    log.debug('Utils', `🛡️ [SupabaseLoadFailedBlocker] Strict mode ${strict ? 'enabled' : 'disabled'}`);
  }
}

// Create and export singleton instance
const supabaseLoadFailedBlocker = SupabaseLoadFailedBlocker.getInstance();

/**
 * Check if an error should be intercepted as a Supabase load error
 * Useful for handling errors in try-catch blocks before they reach global handlers
 * 
 * @param error - The error to check
 * @returns True if the error should be intercepted
 */
export function shouldInterceptSupabaseError(error: any): boolean {
  return SupabaseLoadFailedBlocker.isSupabaseLoadError(error);
}

/**
 * Check if an error is from the Supabase library
 * 
 * @param error - The error to check
 * @returns True if the error is from Supabase
 */
export function isSupabaseLibraryError(error: any): boolean {
  return SupabaseLoadFailedBlocker['isFromSupabaseLibrary'](error);
}

// ✅ FIXED: Enhanced global access for debugging and testing
if (typeof window !== 'undefined') {
  (window as any).supabaseLoadFailedBlocker = supabaseLoadFailedBlocker;
  
  // ✅ FIXED: Add developer utilities for testing and debugging
  (window as any).SupabaseBlockerUtils = {
    // Test error blocking
    testErrorBlocking: (error: any) => {
      const result = supabaseLoadFailedBlocker.shouldBlockError(error);
      console.log('🧪 [SupabaseBlockerUtils] Error blocking test:', { error, blocked: result });
      return result;
    },
    
    // Get current configuration
    getConfig: () => {
      const config = supabaseLoadFailedBlocker.getConfig();
      console.log('⚙️ [SupabaseBlockerUtils] Current configuration:', config);
      return config;
    },
    
    // Update configuration
    configure: (newConfig: Partial<BlockerConfig>) => {
      supabaseLoadFailedBlocker.configure(newConfig);
      console.log('⚙️ [SupabaseBlockerUtils] Configuration updated:', newConfig);
    },
    
    // Enable/disable blocker
    toggle: () => {
      const isEnabled = supabaseLoadFailedBlocker.isEnabled();
      if (isEnabled) {
        supabaseLoadFailedBlocker.disable();
        console.log('🛡️ [SupabaseBlockerUtils] Blocker disabled');
      } else {
        supabaseLoadFailedBlocker.enable();
        console.log('🛡️ [SupabaseBlockerUtils] Blocker enabled');
      }
    },
    
    // Test strict mode
    testStrictMode: (error: any) => {
      const normal = supabaseLoadFailedBlocker.shouldBlockError(error);
      supabaseLoadFailedBlocker.setStrictMode(true);
      const strict = supabaseLoadFailedBlocker.shouldBlockError(error);
      supabaseLoadFailedBlocker.setStrictMode(false);
      console.log('🧪 [SupabaseBlockerUtils] Strict mode test:', { error, normal, strict });
      return { normal, strict };
    }
  };
}

export { supabaseLoadFailedBlocker }; 