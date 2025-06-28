/**
 * 🛡️ Supabase Load Failed Error Blocker
 * 
 * Prevents "TypeError: Load failed" errors from Supabase JS library
 * from triggering React error boundaries and page reloads on mobile browsers.
 * 
 * This addresses the specific issue where mobile browsers block network requests
 * during app backgrounding, causing Supabase to throw "Load failed" errors
 * that trigger error boundary reloads.
 */

class SupabaseLoadFailedBlocker {
  private static instance: SupabaseLoadFailedBlocker;
  private isInitialized = false;
  
  private constructor() {
    this.initializeErrorBlocking();
  }
  
  static getInstance(): SupabaseLoadFailedBlocker {
    if (!SupabaseLoadFailedBlocker.instance) {
      SupabaseLoadFailedBlocker.instance = new SupabaseLoadFailedBlocker();
    }
    return SupabaseLoadFailedBlocker.instance;
  }
  
  private initializeErrorBlocking(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    console.log('🛡️ [SupabaseLoadFailedBlocker] Initializing comprehensive protection...');
    
    // 1. BLOCK GLOBAL ERROR EVENTS FROM SUPABASE
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(type: string, listener: any, options?: any) {
      if (type === 'error') {
        const wrappedListener = (event: ErrorEvent) => {
          if (SupabaseLoadFailedBlocker.isSupabaseLoadError(event.error || event.message)) {
            console.log('🛡️ [SupabaseLoadFailedBlocker] Blocked Supabase Load failed error event');
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
        console.warn('📱 [SupabaseLoadFailedBlocker] This is expected on mobile during backgrounding');
        return;
      }
      
      return originalConsoleError.apply(console, args);
    };
    
    // 4. BLOCK WINDOW.ONERROR FOR SUPABASE ERRORS
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (SupabaseLoadFailedBlocker.isSupabaseLoadError(error || message)) {
        console.log('🛡️ [SupabaseLoadFailedBlocker] Blocked Supabase Load failed window.onerror');
        return true; // Prevent default handling
      }
      
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };
    
    // 5. INTERCEPT REACT ERROR BOUNDARY TRIGGERS
    this.interceptReactErrorBoundaries();
    
    // 6. DISABLE ERROR BOUNDARY RELOADS ON MOBILE
    this.disableMobileErrorBoundaryReloads();
    
    this.isInitialized = true;
    console.log('✅ [SupabaseLoadFailedBlocker] Comprehensive protection active');
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
              return; // Don't trigger error boundary
            }
            
            return originalComponentDidCatch.call(this, error, errorInfo);
          };
        }
        
        return originalDefineProperty.call(this, obj, prop, descriptor);
      };
    }
  }
  
  private disableMobileErrorBoundaryReloads(): void {
    if (typeof window === 'undefined') return;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      console.log('🛡️ [SupabaseLoadFailedBlocker] Setting up mobile-safe reload protection...');
      
      // SAFE APPROACH: Override history instead of location.reload (readonly in Safari)
      let reloadAttempts = 0;
      
      // Intercept navigation-based reloads
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      // Track reload attempts through navigation
      history.pushState = function(...args) {
        const stack = new Error().stack || '';
        
        // Block navigation reloads from error boundaries
        if (stack.includes('ErrorBoundary') || 
            stack.includes('componentDidCatch') ||
            stack.includes('handleReload') ||
            stack.includes('handleRetry')) {
          
          console.log('🛡️ [SupabaseLoadFailedBlocker] Blocked error boundary navigation reload on mobile');
          console.log('📱 [SupabaseLoadFailedBlocker] Mobile browsers handle network recovery naturally');
          return;
        }
        
        return originalPushState.apply(this, args);
      };
      
      // Set global flag to indicate reload protection is active
      (window as any).MOBILE_RELOAD_PROTECTION_ACTIVE = true;
      (window as any).MOBILE_ERROR_BOUNDARY_RELOAD_DISABLED = true;
      
      // Also override document methods that might trigger reloads
      const originalWrite = document.write;
      document.write = function(...args) {
        const stack = new Error().stack || '';
        if (stack.includes('ErrorBoundary')) {
          console.log('🛡️ [SupabaseLoadFailedBlocker] Blocked error boundary document.write on mobile');
          return;
        }
        return originalWrite.apply(this, args);
      };
      
      console.log('✅ [SupabaseLoadFailedBlocker] Mobile-safe reload protection active');
      console.log('🛡️ [SupabaseLoadFailedBlocker] Using navigation interception instead of readonly override');
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
    }
  }
}

// Create and export singleton instance
const supabaseLoadFailedBlocker = SupabaseLoadFailedBlocker.getInstance();

// Global access for debugging
if (typeof window !== 'undefined') {
  (window as any).supabaseLoadFailedBlocker = supabaseLoadFailedBlocker;
}

export { supabaseLoadFailedBlocker }; 