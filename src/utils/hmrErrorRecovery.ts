import { log } from '@/utils/logger';
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

    // Mobile detection utility
    const isMobileBrowser = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    // Handle module loading errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error);
    });

    // Handle unhandled promise rejections (async import failures)
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason);
    });

    if (isMobileBrowser()) {
      log.debug('Utils', '🔧 [HMRErrorRecovery] Global error handlers installed (mobile - recovery disabled)');
    } else {
      log.debug('Utils', '🔧 [HMRErrorRecovery] Global error handlers installed (desktop - recovery enabled)');
    }
  }

  private handleError(error: any) {
    if (!this.isModuleError(error)) {
      return;
    }

    // 🚨 CRITICAL FIX: Don't recover on mobile browsers
    // Mobile browsers block network requests during backgrounding which causes false module errors
    const isMobileBrowser = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };
    
    if (isMobileBrowser()) {
      log.warn('Utils', '🔄 [HMRErrorRecovery] Module error on mobile browser - likely network blocking, ignoring');
      log.warn('Utils', '📱 [HMRErrorRecovery] Mobile browsers block network requests during app backgrounding');
      log.warn('Utils', '🔧 [HMRErrorRecovery] This is NOT an actual HMR error - recovery disabled on mobile');
      return;
    }

    const now = Date.now();
    
    // Reset error count if enough time has passed
    if (now - this.lastErrorTime > 10000) {
      this.errorCount = 0;
    }

    this.errorCount++;
    this.lastErrorTime = now;

    log.warn('Utils', `🔄 [HMRErrorRecovery] Module error detected on desktop (${this.errorCount}/${this.options.maxRetries}):`, error.message);

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
    log.debug('Utils', `🔄 [HMRErrorRecovery] Attempting recovery in ${this.options.retryDelay}ms...`);

    setTimeout(() => {
      // Try to trigger HMR refresh first
      if (this.triggerHMRRefresh()) {
        log.debug('Utils', '🔄 [HMRErrorRecovery] HMR refresh triggered');
        return;
      }

      // Fallback to page reload
      log.debug('Utils', '🔄 [HMRErrorRecovery] HMR refresh failed, reloading page...');
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
      log.warn('Utils', '🔄 [HMRErrorRecovery] HMR refresh failed:', error);
      return false;
    }
  }

  // Manual recovery methods
  public forceRecovery() {
    log.debug('Utils', '🔄 [HMRErrorRecovery] Force recovery triggered');
    this.attemptRecovery();
  }

  public reset() {
    this.errorCount = 0;
    this.lastErrorTime = 0;
    log.debug('Utils', '🔄 [HMRErrorRecovery] Error count reset');
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
    
    log.debug('Utils', '🔧 [HMRErrorRecovery] Initialized with options:', options);
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