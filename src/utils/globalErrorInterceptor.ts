import { log } from '@/utils/logger';
/**
 * Global Error Interceptor for 401 Session Recovery
 * 
 * Intercepts 401 errors from API calls and automatically triggers
 * session refresh when sessions expire after mobile backgrounding
 */

import { getSupabaseClient } from '@/integrations/supabase/client';

class GlobalErrorInterceptor {
  private static instance: GlobalErrorInterceptor;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  
  // Production-specific rate limiting
  private requestQueue = new Map<string, number>();
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private lastCleanup = Date.now();
  
  private constructor() {
    this.initializeErrorInterception();
  }
  
  static getInstance(): GlobalErrorInterceptor {
    if (!GlobalErrorInterceptor.instance) {
      GlobalErrorInterceptor.instance = new GlobalErrorInterceptor();
    }
    return GlobalErrorInterceptor.instance;
  }
  
  private initializeErrorInterception(): void {
    // Intercept fetch requests to catch 401 errors
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      
      window.fetch = async (...args) => {
        // Apply rate limiting in production
        if (import.meta.env.PROD && this.shouldRateLimit(args[0]?.toString())) {
          throw new Error('Rate limit exceeded - request blocked');
        }
        
        const response = await originalFetch(...args);
        
        // Check for 401 errors from Supabase API
        if (response.status === 401 && 
            args[0]?.toString().includes('supabase.co/rest/v1/')) {
          
          log.debug('Utils', '🚨 [GlobalErrorInterceptor] 401 detected from Supabase API');
          
          // Attempt automatic session refresh
          const refreshSuccess = await this.handleSessionExpiry();
          
          if (refreshSuccess) {
            log.debug('Utils', '✅ [GlobalErrorInterceptor] Session refreshed, retrying request');
            
            // Retry the original request with fresh session
            return originalFetch(...args);
          } else {
            log.warn('Utils', '❌ [GlobalErrorInterceptor] Session refresh failed');
          }
        }
        
        return response;
      };
      
      // ENHANCED: Override log.error('Utils', to prevent React error boundaries from triggering
      const originalError = console.error;
      console.error = (...args) => {
        const errorMessage = args.join(' ');
        
        // Block ALL React errors that might trigger error boundaries and cause reloads
        if (errorMessage.includes('React') || 
            errorMessage.includes('Component') ||
            errorMessage.includes('render') ||
            errorMessage.includes('boundary') ||
            errorMessage.includes('componentDidCatch')) {
          log.warn('Utils', '🛡️ [GlobalErrorInterceptor] Suppressed React error to prevent boundary trigger:', ...args);
          return;
        }
        
        // Only intercept if it's specifically a 401 authentication error from Supabase
        if (errorMessage.includes('401') && 
            errorMessage.includes('supabase.co') &&
            !errorMessage.includes('timeout') &&
            !errorMessage.includes('fallback')) {
          
          log.debug('Utils', '🚨 [GlobalErrorInterceptor] 401 authentication error detected');
          this.handleSessionExpiry();
        }
        
        return originalError(...args);
      };
      
      // ENHANCED: Global error handler for unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        const errorMessage = error?.message || error?.toString() || '';
        
        // Prevent React-related promise rejections from triggering boundaries
        if (errorMessage.includes('React') || 
            errorMessage.includes('Component') ||
            errorMessage.includes('render') ||
            errorMessage.includes('boundary')) {
          log.warn('Utils', '🛡️ [GlobalErrorInterceptor] Suppressed React promise rejection to prevent boundary trigger:', errorMessage);
          event.preventDefault();
          return;
        }
        
        // Handle 401 errors
        if ((errorMessage.includes('401') || errorMessage.includes('unauthorized')) &&
            errorMessage.includes('supabase') &&
            !errorMessage.includes('timeout') &&
            !errorMessage.includes('fallback') &&
            errorMessage.includes('JWT')) {
          
          log.debug('Utils', '🚨 [GlobalErrorInterceptor] 401 authentication error in unhandled rejection');
          this.handleSessionExpiry();
          event.preventDefault(); // Prevent default error handling
        }
      });
      
      // ENHANCED: Prevent error events from triggering React error boundaries
      window.addEventListener('error', (event) => {
        const errorMessage = event.message || event.error?.message || '';
        
        // Block error events that might trigger React error boundaries
        if (errorMessage.includes('React') || 
            errorMessage.includes('Component') ||
            errorMessage.includes('render') ||
            errorMessage.includes('boundary') ||
            event.filename?.includes('react') ||
            event.filename?.includes('React')) {
          log.warn('Utils', '🛡️ [GlobalErrorInterceptor] Suppressed React error event to prevent boundary trigger:', errorMessage);
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
        
        // Handle network/auth errors gracefully
        if (errorMessage.includes('401') || errorMessage.includes('Load failed') || errorMessage.includes('Fetch API')) {
          log.debug('Utils', '🛡️ [GlobalErrorInterceptor] Handled network error gracefully:', errorMessage);
          event.preventDefault();
          return false;
        }
      }, true);
      
      log.debug('Utils', '🛡️ [GlobalErrorInterceptor] Initialized session recovery protection with React boundary protection');
    }
  }
  
  private shouldRateLimit(url?: string): boolean {
    if (!url || !url.includes('supabase.co/rest/v1/')) {
      return false; // Only rate limit Supabase API calls
    }
    
    const now = Date.now();
    
    // Clean up old entries periodically
    if (now - this.lastCleanup > this.RATE_LIMIT_WINDOW) {
      this.cleanupRateLimitQueue();
    }
    
    // Extract endpoint from URL for more granular rate limiting
    const endpoint = this.extractEndpoint(url);
    const currentCount = this.requestQueue.get(endpoint) || 0;
    
    // Check if we're over the limit
    if (currentCount >= this.MAX_REQUESTS_PER_MINUTE) {
      log.warn('Utils', `[GlobalErrorInterceptor] Rate limit exceeded for ${endpoint}: ${currentCount}/${this.MAX_REQUESTS_PER_MINUTE}`);
      return true;
    }
    
    // Increment counter
    this.requestQueue.set(endpoint, currentCount + 1);
    
    // Schedule cleanup of this entry
    setTimeout(() => {
      const count = this.requestQueue.get(endpoint) || 0;
      if (count > 0) {
        this.requestQueue.set(endpoint, count - 1);
      }
    }, this.RATE_LIMIT_WINDOW);
    
    return false;
  }
  
  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      // Extract table name and basic query parameters
      const pathParts = urlObj.pathname.split('/');
      const table = pathParts[pathParts.length - 1];
      
      // Create a simplified endpoint identifier
      return `${table}${urlObj.search ? '_with_params' : ''}`;
    } catch {
      return 'unknown_endpoint';
    }
  }
  
  private cleanupRateLimitQueue(): void {
    // Clear all entries older than the rate limit window
    this.requestQueue.clear();
    this.lastCleanup = Date.now();
  }
  
  private async handleSessionExpiry(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      log.debug('Utils', '📱 [GlobalErrorInterceptor] Session refresh already in progress, waiting...');
      return this.refreshPromise;
    }
    
    this.isRefreshing = true;
    
    this.refreshPromise = this.performSessionRefresh();
    const result = await this.refreshPromise;
    
    this.isRefreshing = false;
    this.refreshPromise = null;
    
    return result;
  }
  
  private async performSessionRefresh(): Promise<boolean> {
    try {
      log.debug('Utils', '🔄 [GlobalErrorInterceptor] Attempting session refresh for 401 error');
      
      // Get current session first
      const { data: currentSession } = await getSupabaseClient().auth.getSession();
      
      if (!currentSession.session) {
        log.debug('Utils', '⚠️ [GlobalErrorInterceptor] No current session found');
        return false;
      }
      
      // Attempt refresh
      const { data: refreshData, error: refreshError } = await getSupabaseClient().auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        log.warn('Utils', '❌ [GlobalErrorInterceptor] Session refresh failed:', refreshError?.message);
        
        // Trigger Phase 1 mobile recovery if available
        if ((window as any).phase1Recovery) {
          log.debug('Utils', '📱 [GlobalErrorInterceptor] Triggering Phase 1 recovery');
          try {
            await (window as any).phase1Recovery.performComprehensiveRecovery();
          } catch (phase1Error) {
            log.warn('Utils', '❌ [GlobalErrorInterceptor] Phase 1 recovery failed:', phase1Error);
          }
        }
        
        return false;
      }
      
      log.debug('Utils', '✅ [GlobalErrorInterceptor] Session refreshed successfully');
      
      // FIXED: Safely notify mobile session manager if available and not blocked
      try {
        if ((window as any).mobileSessionManager && 
            typeof (window as any).mobileSessionManager === 'object' &&
            (window as any).mobileSessionManager.state) {
          const manager = (window as any).mobileSessionManager;
          manager.state.authState = 'verified';
          if (typeof manager.persistState === 'function') {
            manager.persistState();
          }
          log.debug('Utils', '✅ [GlobalErrorInterceptor] Mobile session manager updated');
        } else {
          log.debug('Utils', 'ℹ️ [GlobalErrorInterceptor] Mobile session manager not available (may be blocked for protection)');
        }
      } catch (mobileError) {
        log.debug('Utils', 'ℹ️ [GlobalErrorInterceptor] Mobile session manager access blocked (protection active)');
        // Don't throw error - this is expected when protection is active
      }
      
      return true;
      
    } catch (error) {
      log.error('Utils', '❌ [GlobalErrorInterceptor] Session refresh exception:', error);
      return false;
    }
  }
  
  // Method to manually trigger session refresh
  public async refreshSession(): Promise<boolean> {
    return this.handleSessionExpiry();
  }
  
  // Check if currently refreshing
  public isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }
}

// Initialize the global error interceptor
const globalErrorInterceptor = GlobalErrorInterceptor.getInstance();

// Export for manual use
export { globalErrorInterceptor };

// Auto-initialize on import
if (typeof window !== 'undefined') {
  (window as any).globalErrorInterceptor = globalErrorInterceptor;
} 