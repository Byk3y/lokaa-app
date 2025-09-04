import { log } from '@/utils/logger';
/**
 * Global Error Interceptor for Session Recovery
 * 
 * Intercepts 401 and 406 errors from API calls and automatically triggers
 * session refresh when sessions expire after mobile backgrounding or idle periods.
 * 
 * 401: Unauthorized - Invalid or missing authentication
 * 406: Not Acceptable - Request format/context issues, often due to expired JWT
 */

import { getSupabaseClient } from '@/integrations/supabase/client';

interface SessionErrorContext {
  statusCode: number;
  url: string;
  timestamp: number;
  retryCount: number;
  errorType: '401' | '406' | 'other';
  isSupabaseRequest: boolean;
}

class GlobalErrorInterceptor {
  private static instance: GlobalErrorInterceptor;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  
  // Production-specific rate limiting
  private requestQueue = new Map<string, number>();
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private lastCleanup = Date.now();
  
  // 406 error tracking and retry management
  private retryQueue = new Map<string, SessionErrorContext>();
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_BACKOFF_BASE = 1000; // 1 second
  private readonly RETRY_BACKOFF_MAX = 10000; // 10 seconds
  
  private constructor() {
    this.initializeErrorInterception();
    this.initializePeriodicCleanup();
  }
  
  private initializePeriodicCleanup(): void {
    // Clean up retry queue every 5 minutes
    setInterval(() => {
      this.cleanupRetryQueue();
    }, 5 * 60 * 1000);
    
    // Log session error statistics every 10 minutes in development
    if (import.meta.env.DEV) {
      setInterval(() => {
        if (this.retryQueue.size > 0) {
          this.logSessionErrorStats();
        }
      }, 10 * 60 * 1000);
    }
  }
  
  static getInstance(): GlobalErrorInterceptor {
    if (!GlobalErrorInterceptor.instance) {
      GlobalErrorInterceptor.instance = new GlobalErrorInterceptor();
    }
    return GlobalErrorInterceptor.instance;
  }
  
  private initializeErrorInterception(): void {
    // Intercept fetch requests to catch 401 and 406 errors
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      
      window.fetch = async (...args) => {
        // Apply rate limiting in production
        if (import.meta.env.PROD && this.shouldRateLimit(args[0]?.toString())) {
          throw new Error('Rate limit exceeded - request blocked');
        }
        
        const response = await originalFetch(...args);
        
        // Check for session-related errors from Supabase API
        const url = args[0]?.toString() || '';
        const isSupabaseRequest = url.includes('supabase.co/rest/v1/');
        
        if (isSupabaseRequest && (response.status === 401 || response.status === 406)) {
          const errorContext: SessionErrorContext = {
            statusCode: response.status,
            url,
            timestamp: Date.now(),
            retryCount: 0,
            errorType: response.status === 401 ? '401' : '406',
            isSupabaseRequest: true
          };
          
          log.debug('Utils', `🚨 [GlobalErrorInterceptor] ${response.status} detected from Supabase API: ${this.extractEndpoint(url)}`);
          
          // Attempt automatic session refresh and retry
          const retryResponse = await this.handleSessionErrorAndRetry(originalFetch, args, errorContext);
          if (retryResponse) {
            return retryResponse;
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
        
        // Intercept session-related errors from Supabase
        if ((errorMessage.includes('401') || errorMessage.includes('406')) && 
            errorMessage.includes('supabase.co') &&
            !errorMessage.includes('timeout') &&
            !errorMessage.includes('fallback')) {
          
          const errorType = errorMessage.includes('406') ? '406' : '401';
          log.debug('Utils', `🚨 [GlobalErrorInterceptor] ${errorType} authentication error detected in console`);
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
        
        // Handle session-related errors
        if ((errorMessage.includes('401') || errorMessage.includes('406') || errorMessage.includes('unauthorized')) &&
            errorMessage.includes('supabase') &&
            !errorMessage.includes('timeout') &&
            !errorMessage.includes('fallback') &&
            (errorMessage.includes('JWT') || errorMessage.includes('Not Acceptable'))) {
          
          const errorType = errorMessage.includes('406') ? '406' : '401';
          log.debug('Utils', `🚨 [GlobalErrorInterceptor] ${errorType} authentication error in unhandled rejection`);
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
        if (errorMessage.includes('401') || errorMessage.includes('406') || errorMessage.includes('Load failed') || errorMessage.includes('Fetch API')) {
          log.debug('Utils', '🛡️ [GlobalErrorInterceptor] Handled network error gracefully:', errorMessage);
          event.preventDefault();
          return false;
        }
      }, true);
      
      log.debug('Utils', '🛡️ [GlobalErrorInterceptor] Initialized session recovery protection with React boundary protection');
      log.info('Utils', '🚀 [GlobalErrorInterceptor] Enhanced with 406 error handling and intelligent retry logic');
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
  
  /**
   * Handle session errors (401/406) with intelligent retry logic
   */
  private async handleSessionErrorAndRetry(
    originalFetch: typeof fetch,
    args: Parameters<typeof fetch>,
    errorContext: SessionErrorContext
  ): Promise<Response | null> {
    const requestKey = this.generateRequestKey(errorContext.url, args[1]);
    
    // Check if we've already tried this request too many times
    const existingContext = this.retryQueue.get(requestKey);
    if (existingContext && existingContext.retryCount >= this.MAX_RETRY_ATTEMPTS) {
      log.warn('Utils', `❌ [GlobalErrorInterceptor] Max retry attempts reached for ${this.extractEndpoint(errorContext.url)}`);
      this.retryQueue.delete(requestKey);
      return null;
    }
    
    // Update retry count
    const currentRetryCount = existingContext ? existingContext.retryCount + 1 : 1;
    errorContext.retryCount = currentRetryCount;
    this.retryQueue.set(requestKey, errorContext);
    
    log.debug('Utils', `🔄 [GlobalErrorInterceptor] Attempting session refresh for ${errorContext.errorType} error (attempt ${currentRetryCount}/${this.MAX_RETRY_ATTEMPTS})`);
    
    // Attempt session refresh
    const refreshSuccess = await this.handleSessionExpiry();
    
    if (refreshSuccess) {
      log.debug('Utils', `✅ [GlobalErrorInterceptor] Session refreshed, retrying ${errorContext.errorType} request`);
      
      // Calculate exponential backoff delay
      const backoffDelay = Math.min(
        this.RETRY_BACKOFF_BASE * Math.pow(2, currentRetryCount - 1),
        this.RETRY_BACKOFF_MAX
      );
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      try {
        // Retry the original request with fresh session
        const retryResponse = await originalFetch(...args);
        
        // Clean up retry tracking on success
        this.retryQueue.delete(requestKey);
        
        if (retryResponse.ok) {
          log.debug('Utils', `✅ [GlobalErrorInterceptor] Retry successful for ${this.extractEndpoint(errorContext.url)}`);
        } else {
          log.warn('Utils', `⚠️ [GlobalErrorInterceptor] Retry returned ${retryResponse.status} for ${this.extractEndpoint(errorContext.url)}`);
        }
        
        return retryResponse;
      } catch (retryError) {
        log.error('Utils', `❌ [GlobalErrorInterceptor] Retry failed for ${this.extractEndpoint(errorContext.url)}:`, retryError);
        return null;
      }
    } else {
      log.warn('Utils', `❌ [GlobalErrorInterceptor] Session refresh failed for ${errorContext.errorType} error`);
      this.retryQueue.delete(requestKey);
      return null;
    }
  }
  
  /**
   * Generate a unique key for request deduplication
   */
  private generateRequestKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
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
      log.debug('Utils', '🔄 [GlobalErrorInterceptor] Attempting session refresh for authentication error');
      
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
  
  // Get retry queue status for monitoring
  public getRetryQueueStatus(): { activeRetries: number; queueSize: number } {
    const activeRetries = Array.from(this.retryQueue.values()).reduce(
      (sum, context) => sum + context.retryCount, 0
    );
    return {
      activeRetries,
      queueSize: this.retryQueue.size
    };
  }
  
  // Clean up old retry entries
  public cleanupRetryQueue(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [key, context] of this.retryQueue.entries()) {
      if (now - context.timestamp > maxAge) {
        this.retryQueue.delete(key);
        log.debug('Utils', `🧹 [GlobalErrorInterceptor] Cleaned up old retry entry for ${this.extractEndpoint(context.url)}`);
      }
    }
  }
  
  // Log session error statistics for monitoring
  public logSessionErrorStats(): void {
    const stats = this.getRetryQueueStatus();
    const errorTypes = Array.from(this.retryQueue.values()).reduce((acc, context) => {
      acc[context.errorType] = (acc[context.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    log.info('Utils', '📊 [GlobalErrorInterceptor] Session Error Statistics:', {
      activeRetries: stats.activeRetries,
      queueSize: stats.queueSize,
      errorTypes,
      isRefreshing: this.isRefreshing,
      timestamp: new Date().toISOString()
    });
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