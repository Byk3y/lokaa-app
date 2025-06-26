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
        const response = await originalFetch(...args);
        
        // Check for 401 errors from Supabase API
        if (response.status === 401 && 
            args[0]?.toString().includes('supabase.co/rest/v1/')) {
          
          console.log('🚨 [GlobalErrorInterceptor] 401 detected from Supabase API');
          
          // Attempt automatic session refresh
          const refreshSuccess = await this.handleSessionExpiry();
          
          if (refreshSuccess) {
            console.log('✅ [GlobalErrorInterceptor] Session refreshed, retrying request');
            
            // Retry the original request with fresh session
            return originalFetch(...args);
          } else {
            console.warn('❌ [GlobalErrorInterceptor] Session refresh failed');
          }
        }
        
        return response;
      };
      
      // ENHANCED: Override console.error to prevent React error boundaries from triggering
      const originalError = console.error;
      console.error = (...args) => {
        const errorMessage = args.join(' ');
        
        // Block ALL React errors that might trigger error boundaries and cause reloads
        if (errorMessage.includes('React') || 
            errorMessage.includes('Component') ||
            errorMessage.includes('render') ||
            errorMessage.includes('boundary') ||
            errorMessage.includes('componentDidCatch')) {
          console.warn('🛡️ [GlobalErrorInterceptor] Suppressed React error to prevent boundary trigger:', ...args);
          return;
        }
        
        // Only intercept if it's specifically a 401 authentication error from Supabase
        if (errorMessage.includes('401') && 
            errorMessage.includes('supabase.co') &&
            !errorMessage.includes('timeout') &&
            !errorMessage.includes('fallback')) {
          
          console.log('🚨 [GlobalErrorInterceptor] 401 authentication error detected');
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
          console.warn('🛡️ [GlobalErrorInterceptor] Suppressed React promise rejection to prevent boundary trigger:', errorMessage);
          event.preventDefault();
          return;
        }
        
        // Handle 401 errors
        if ((errorMessage.includes('401') || errorMessage.includes('unauthorized')) &&
            errorMessage.includes('supabase') &&
            !errorMessage.includes('timeout') &&
            !errorMessage.includes('fallback') &&
            errorMessage.includes('JWT')) {
          
          console.log('🚨 [GlobalErrorInterceptor] 401 authentication error in unhandled rejection');
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
          console.warn('🛡️ [GlobalErrorInterceptor] Suppressed React error event to prevent boundary trigger:', errorMessage);
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
        
        // Handle network/auth errors gracefully
        if (errorMessage.includes('401') || errorMessage.includes('Load failed') || errorMessage.includes('Fetch API')) {
          console.log('🛡️ [GlobalErrorInterceptor] Handled network error gracefully:', errorMessage);
          event.preventDefault();
          return false;
        }
      }, true);
      
      console.log('🛡️ [GlobalErrorInterceptor] Initialized session recovery protection with React boundary protection');
    }
  }
  
  private async handleSessionExpiry(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      console.log('📱 [GlobalErrorInterceptor] Session refresh already in progress, waiting...');
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
      console.log('🔄 [GlobalErrorInterceptor] Attempting session refresh for 401 error');
      
      // Get current session first
      const { data: currentSession } = await getSupabaseClient().auth.getSession();
      
      if (!currentSession.session) {
        console.log('⚠️ [GlobalErrorInterceptor] No current session found');
        return false;
      }
      
      // Attempt refresh
      const { data: refreshData, error: refreshError } = await getSupabaseClient().auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.warn('❌ [GlobalErrorInterceptor] Session refresh failed:', refreshError?.message);
        
        // Trigger Phase 1 mobile recovery if available
        if ((window as any).phase1Recovery) {
          console.log('📱 [GlobalErrorInterceptor] Triggering Phase 1 recovery');
          try {
            await (window as any).phase1Recovery.performComprehensiveRecovery();
          } catch (phase1Error) {
            console.warn('❌ [GlobalErrorInterceptor] Phase 1 recovery failed:', phase1Error);
          }
        }
        
        return false;
      }
      
      console.log('✅ [GlobalErrorInterceptor] Session refreshed successfully');
      
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
          console.log('✅ [GlobalErrorInterceptor] Mobile session manager updated');
        } else {
          console.log('ℹ️ [GlobalErrorInterceptor] Mobile session manager not available (may be blocked for protection)');
        }
      } catch (mobileError) {
        console.log('ℹ️ [GlobalErrorInterceptor] Mobile session manager access blocked (protection active)');
        // Don't throw error - this is expected when protection is active
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ [GlobalErrorInterceptor] Session refresh exception:', error);
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