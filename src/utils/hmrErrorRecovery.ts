/**
 * HMR Error Recovery Utility
 * 
 * Handles "Importing a module script failed" errors that occur during 
 * Hot Module Replacement in development mode.
 */

interface HMRErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  autoRecover?: boolean;
}

class HMRErrorRecovery {
  private errorCount = 0;
  private lastErrorTime = 0;
  private options: Required<HMRErrorRecoveryOptions>;

  constructor(options: HMRErrorRecoveryOptions = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      autoRecover: true,
      ...options
    };

    this.setupGlobalErrorHandler();
  }

  private setupGlobalErrorHandler() {
    if (typeof window === 'undefined' || !import.meta.env?.DEV) {
      return;
    }

    // Handle module loading errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error);
    });

    // Handle unhandled promise rejections (async import failures)
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason);
    });

    console.log('🔧 [HMRErrorRecovery] Global error handlers installed');
  }

  private handleError(error: any) {
    if (!this.isModuleError(error)) {
      return;
    }

    const now = Date.now();
    
    // Reset error count if enough time has passed
    if (now - this.lastErrorTime > 10000) {
      this.errorCount = 0;
    }

    this.errorCount++;
    this.lastErrorTime = now;

    console.warn(`🔄 [HMRErrorRecovery] Module error detected (${this.errorCount}/${this.options.maxRetries}):`, error.message);

    if (this.options.autoRecover && this.errorCount <= this.options.maxRetries) {
      this.attemptRecovery();
    }
  }

  private isModuleError(error: any): boolean {
    if (!error || typeof error.message !== 'string') {
      return false;
    }

    const moduleErrorPatterns = [
      'Importing a module script failed',
      'Loading chunk',
      'Failed to fetch',
      'ChunkLoadError',
      'Loading CSS chunk'
    ];

    return moduleErrorPatterns.some(pattern => 
      error.message.includes(pattern) || error.name?.includes(pattern)
    );
  }

  private attemptRecovery() {
    console.log(`🔄 [HMRErrorRecovery] Attempting recovery in ${this.options.retryDelay}ms...`);

    setTimeout(() => {
      // Try to trigger HMR refresh first
      if (this.triggerHMRRefresh()) {
        console.log('🔄 [HMRErrorRecovery] HMR refresh triggered');
        return;
      }

      // Fallback to page reload
      console.log('🔄 [HMRErrorRecovery] HMR refresh failed, reloading page...');
      window.location.reload();
    }, this.options.retryDelay);
  }

  private triggerHMRRefresh(): boolean {
    try {
      // Try Vite's HMR API
      if ((window as any).import && (window as any).import.meta && (window as any).import.meta.hot) {
        (window as any).import.meta.hot.invalidate();
        return true;
      }

      // Try accessing Vite's internal reload mechanism
      if ((window as any).__vite_reload) {
        (window as any).__vite_reload();
        return true;
      }

      // Try manual HMR update
      if ((window as any).__vite_plugin_react_preamble_installed__) {
        (window as any).__vite_plugin_react_preamble_installed__ = false;
        return true;
      }

      return false;
    } catch (error) {
      console.warn('🔄 [HMRErrorRecovery] HMR refresh failed:', error);
      return false;
    }
  }

  // Manual recovery methods
  public forceRecovery() {
    console.log('🔄 [HMRErrorRecovery] Force recovery triggered');
    this.attemptRecovery();
  }

  public reset() {
    this.errorCount = 0;
    this.lastErrorTime = 0;
    console.log('🔄 [HMRErrorRecovery] Error count reset');
  }

  public getStatus() {
    return {
      errorCount: this.errorCount,
      lastErrorTime: this.lastErrorTime,
      isRecovering: this.errorCount > 0
    };
  }
}

// Create global instance for development
let hmrErrorRecovery: HMRErrorRecovery | null = null;

export function initializeHMRErrorRecovery(options?: HMRErrorRecoveryOptions) {
  if (!import.meta.env?.DEV || typeof window === 'undefined') {
    return null;
  }

  if (!hmrErrorRecovery) {
    hmrErrorRecovery = new HMRErrorRecovery(options);
    
    // Expose to window for debugging
    (window as any).hmrErrorRecovery = hmrErrorRecovery;
    
    console.log('🔧 [HMRErrorRecovery] Initialized with options:', options);
  }

  return hmrErrorRecovery;
}

export function getHMRErrorRecovery() {
  return hmrErrorRecovery;
}

// Auto-initialize in development
if (import.meta.env?.DEV) {
  initializeHMRErrorRecovery();
} 