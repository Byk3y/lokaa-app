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

class SupabaseLoadFailedBlocker {
  private static instance: SupabaseLoadFailedBlocker;
  private isInitialized = false;
  private backgroundStartTime = 0;
  private consecutiveFailedRefreshes = 0;
  private isRefreshing = false;
  
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
        console.log('🛡️ [SupabaseLoadFailedBlocker] App backgrounded at', new Date().toLocaleTimeString());
      } else {
        const backgroundDuration = Date.now() - this.backgroundStartTime;
        console.log(`🛡️ [SupabaseLoadFailedBlocker] App foregrounded after ${backgroundDuration}ms`);
      }
    });
  }

  private async handleLoadFailed(): Promise<void> {
    // Check if we've been in background for less than the safe delay
    const timeSinceBackground = Date.now() - this.backgroundStartTime;
    
    if (timeSinceBackground < MOBILE_SAFE_RELOAD_DELAY_MS) {
      console.log(`🛡️ [SupabaseLoadFailedBlocker] Ignoring load failed - only ${timeSinceBackground}ms since background (< ${MOBILE_SAFE_RELOAD_DELAY_MS}ms)`);
      return;
    }

    // Prevent concurrent refresh attempts
    if (this.isRefreshing) {
      console.log('🛡️ [SupabaseLoadFailedBlocker] Refresh already in progress, ignoring');
      return;
    }

    this.isRefreshing = true;
    
    try {
      console.log('🛡️ [SupabaseLoadFailedBlocker] Attempting session refresh...');
      
      const { data, error } = await getSupabaseClient().auth.refreshSession();
      
      if (error) {
        throw error;
      }
      
      if (data?.session) {
        console.log('✅ [SupabaseLoadFailedBlocker] Session refresh successful');
        this.consecutiveFailedRefreshes = 0;
        
        // Reconnect all real-time subscriptions
        console.log('🔔 [SupabaseLoadFailedBlocker] Reconnecting real-time subscriptions...');
        globalRealtimeService.reconnectAll();
        
        console.log('✅ [SupabaseLoadFailedBlocker] Recovery complete');
      } else {
        throw new Error('No session returned from refresh');
      }
      
    } catch (error) {
      this.consecutiveFailedRefreshes++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ [SupabaseLoadFailedBlocker] Session refresh failed (attempt ${this.consecutiveFailedRefreshes}/${MAX_REFRESH_RETRIES}):`, errorMessage);
      
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
    
    console.log(`🔄 [SupabaseLoadFailedBlocker] Scheduling retry in ${delay}ms (attempt ${this.consecutiveFailedRefreshes}/${MAX_REFRESH_RETRIES})`);
    
    setTimeout(() => {
      this.handleLoadFailed();
    }, delay);
  }

  private showManualReloadToast(): void {
    // Dynamic import to avoid circular dependencies
    import('@/hooks/use-toast').then(({ useToast }) => {
      // Since we can't use hooks in a class, we'll dispatch a custom event
      // that the app can listen for to show the toast
      const event = new CustomEvent('supabase-manual-reload-needed', {
        detail: {
          title: 'Connection Issue',
          description: 'Please refresh the page to restore connection.',
          variant: 'destructive'
        }
      });
      
      window.dispatchEvent(event);
    }).catch(() => {
      // Fallback: show browser alert
      console.error('🛡️ [SupabaseLoadFailedBlocker] Failed to show toast, using alert fallback');
      alert('Connection issue detected. Please refresh the page to restore connection.');
    });
  }
  
  private initializeErrorBlocking(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    console.log('🛡️ [SupabaseLoadFailedBlocker] Initializing intelligent recovery protection...');
    
    // 1. BLOCK GLOBAL ERROR EVENTS FROM SUPABASE
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(type: string, listener: any, options?: any) {
      if (type === 'error') {
        const wrappedListener = (event: ErrorEvent) => {
          if (SupabaseLoadFailedBlocker.isSupabaseLoadError(event.error || event.message)) {
            console.log('🛡️ [SupabaseLoadFailedBlocker] Blocked Supabase Load failed error event');
            SupabaseLoadFailedBlocker.getInstance().handleLoadFailed();
            event.preventDefault();
            event.stopPropagation();
            return false;
          }
          return listener(event);
        };
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    // 2. BLOCK UNHANDLED PROMISE REJECTIONS FROM SUPABASE
    window.addEventListener('unhandledrejection', (event) => {
      if (SupabaseLoadFailedBlocker.isSupabaseLoadError(event.reason)) {
        console.log('🛡️ [SupabaseLoadFailedBlocker] Blocked Supabase Load failed promise rejection');
        SupabaseLoadFailedBlocker.getInstance().handleLoadFailed();
        event.preventDefault();
        return false;
      }
    }, true);
    
    // 3. OVERRIDE CONSOLE.ERROR TO BLOCK SUPABASE ERRORS
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const errorMessage = args.join(' ');
      
      if (SupabaseLoadFailedBlocker.isSupabaseLoadError(errorMessage)) {
        console.warn('🛡️ [SupabaseLoadFailedBlocker] Suppressed Supabase Load failed console error');
        console.warn('📱 [SupabaseLoadFailedBlocker] Triggering intelligent session recovery');
        SupabaseLoadFailedBlocker.getInstance().handleLoadFailed();
        return;
      }
      
      return originalConsoleError.apply(console, args);
    };
    
    // 4. BLOCK WINDOW.ONERROR FOR SUPABASE ERRORS
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (SupabaseLoadFailedBlocker.isSupabaseLoadError(error || message)) {
        console.log('🛡️ [SupabaseLoadFailedBlocker] Blocked Supabase Load failed window.onerror');
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
    console.log('✅ [SupabaseLoadFailedBlocker] Intelligent recovery protection active');
  }
  
  private static isSupabaseLoadError(error: any): boolean {
    if (!error) return false;
    
    const errorString = typeof error === 'string' ? error : 
                       error.message || error.toString() || '';
    
    return (
      // Primary indicators
      (errorString.includes('Load failed') && errorString.includes('supabase')) ||
      (errorString.includes('TypeError: Load failed') && 
       (errorString.includes('supabase-js') || errorString.includes('@supabase'))) ||
      
      // Secondary indicators
      (errorString.includes('Failed to fetch') && errorString.includes('supabase.co')) ||
      (errorString.includes('NetworkError') && errorString.includes('supabase')) ||
      (errorString.includes('fetch request failed') && errorString.includes('supabase')) ||
      
      // Mobile-specific indicators
      (errorString.includes('Load failed') && 
       (/iPhone|iPad|iPod|Android|webOS|BlackBerry/i.test(navigator.userAgent)))
    );
  }
  
  private interceptReactErrorBoundaries(): void {
    // Override componentDidCatch for all error boundaries
    if (typeof window !== 'undefined') {
      const originalDefineProperty = Object.defineProperty;
      
      Object.defineProperty = function(obj: any, prop: string, descriptor: PropertyDescriptor) {
        if (prop === 'componentDidCatch' && descriptor.value) {
          const originalComponentDidCatch = descriptor.value;
          
          descriptor.value = function(error: Error, errorInfo: any) {
            if (SupabaseLoadFailedBlocker.isSupabaseLoadError(error)) {
              console.log('🛡️ [SupabaseLoadFailedBlocker] Blocked Supabase error from React boundary');
              SupabaseLoadFailedBlocker.getInstance().handleLoadFailed();
              return; // Don't trigger error boundary
            }
            
            return originalComponentDidCatch.call(this, error, errorInfo);
          };
        }
        
        return originalDefineProperty.call(this, obj, prop, descriptor);
      };
    }
  }
  
  // Public method to check if an error should be blocked
  public shouldBlockError(error: any): boolean {
    return SupabaseLoadFailedBlocker.isSupabaseLoadError(error);
  }
  
  // Public method to manually suppress an error
  public suppressError(error: any): void {
    if (this.shouldBlockError(error)) {
      console.log('🛡️ [SupabaseLoadFailedBlocker] Manually suppressed Supabase Load failed error');
      this.handleLoadFailed();
    }
  }

  // Public method to manually trigger recovery (for testing)
  public triggerRecovery(): void {
    console.log('🛡️ [SupabaseLoadFailedBlocker] Manual recovery triggered');
    this.handleLoadFailed();
  }

  // Public method to reset retry counter (for testing)
  public resetRetryCounter(): void {
    this.consecutiveFailedRefreshes = 0;
    console.log('🛡️ [SupabaseLoadFailedBlocker] Retry counter reset');
  }

  // Public getter for testing
  public getRetryCount(): number {
    return this.consecutiveFailedRefreshes;
  }
}

// Create and export singleton instance
const supabaseLoadFailedBlocker = SupabaseLoadFailedBlocker.getInstance();

// Global access for debugging and testing
if (typeof window !== 'undefined') {
  (window as any).supabaseLoadFailedBlocker = supabaseLoadFailedBlocker;
}

export { supabaseLoadFailedBlocker }; 