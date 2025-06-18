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
      
      // Also intercept console errors for Phase 1 mobile recovery
      const originalError = console.error;
      console.error = (...args) => {
        const errorMessage = args.join(' ');
        
        if (errorMessage.includes('401') && 
            errorMessage.includes('supabase.co')) {
          
          console.log('🚨 [GlobalErrorInterceptor] 401 error detected in console');
          this.handleSessionExpiry();
        }
        
        return originalError(...args);
      };
      
      // Global error handler for unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        const errorMessage = error?.message || error?.toString() || '';
        
        if (errorMessage.includes('401') || 
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('JWT')) {
          
          console.log('🚨 [GlobalErrorInterceptor] 401 error in unhandled rejection');
          this.handleSessionExpiry();
        }
      });
      
      console.log('🛡️ [GlobalErrorInterceptor] Initialized session recovery protection');
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
      
      // Notify mobile session manager if available
      if ((window as any).mobileSessionManager) {
        const manager = (window as any).mobileSessionManager;
        manager.state.authState = 'verified';
        manager.persistState();
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