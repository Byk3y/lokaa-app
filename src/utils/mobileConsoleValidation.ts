/**
 * Mobile Console Validation - Phase 6 Critical Error Fix
 * 
 * This utility helps validate that the Phase 6 system is working properly
 * on mobile devices after fixing the performanceMonitor.init() error.
 */

export interface MobileValidationResult {
  timestamp: string;
  phase6Active: boolean;
  unifiedSystemLoaded: boolean;
  mobileOptimizationActive: boolean;
  bundleOptimizerActive: boolean;
  errorsFree: boolean;
  debugCommandsAvailable: string[];
  issues: string[];
}

export class MobileConsoleValidator {
  
  /**
   * Run comprehensive mobile validation
   */
  static validate(): MobileValidationResult {
    const timestamp = new Date().toISOString();
    const issues: string[] = [];
    const debugCommands: string[] = [];
    
    // Check if Phase 6 unified system is loaded
    const unifiedSystemLoaded = typeof window !== 'undefined' && 
      typeof window.getPerformanceSummary === 'function';
    
    // Check mobile optimization layer
    const mobileOptimizationActive = typeof window !== 'undefined' &&
      typeof window.getMobileOptimizationSummary === 'function';
    
    // Check bundle optimizer
    const bundleOptimizerActive = typeof window !== 'undefined' &&
      typeof window.getBundleAnalysis === 'function';
    
    // Check debug commands availability
    const availableCommands = [
      'getPerformanceSummary',
      'getSystemHealth', 
      'getMobileOptimizationSummary',
      'getBundleAnalysis',
      'validatePhase6',
      'getPerformanceComparison'
    ];
    
    availableCommands.forEach(cmd => {
      if (typeof window !== 'undefined' && typeof (window as any)[cmd] === 'function') {
        debugCommands.push(`window.${cmd}()`);
      }
    });
    
    // Check for Phase 6 specific issues
    if (!unifiedSystemLoaded) {
      issues.push('Unified Performance Monitor not loaded');
    }
    
    if (!mobileOptimizationActive) {
      issues.push('Mobile Optimization Layer not active');
    }
    
    if (!bundleOptimizerActive) {
      issues.push('Bundle Optimizer not active');
    }
    
    if (debugCommands.length === 0) {
      issues.push('No debug commands available');
    }
    
    const phase6Active = unifiedSystemLoaded && mobileOptimizationActive && bundleOptimizerActive;
    const errorsFree = issues.length === 0;
    
    return {
      timestamp,
      phase6Active,
      unifiedSystemLoaded,
      mobileOptimizationActive,
      bundleOptimizerActive,
      errorsFree,
      debugCommandsAvailable: debugCommands,
      issues
    };
  }
  
  /**
   * Log validation results to console with mobile-friendly formatting
   */
  static logValidation(): void {
    const result = this.validate();
    
    console.log('📱 Mobile Console Validation - Phase 6');
    console.log('=====================================');
    console.log(`✅ Phase 6 Active: ${result.phase6Active ? 'YES' : 'NO'}`);
    console.log(`✅ Errors Free: ${result.errorsFree ? 'YES' : 'NO'}`);
    console.log(`✅ Unified System: ${result.unifiedSystemLoaded ? 'LOADED' : 'MISSING'}`);
    console.log(`✅ Mobile Optimization: ${result.mobileOptimizationActive ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`✅ Bundle Optimizer: ${result.bundleOptimizerActive ? 'ACTIVE' : 'INACTIVE'}`);
    
    if (result.debugCommandsAvailable.length > 0) {
      console.log('\n🔧 Available Debug Commands:');
      result.debugCommandsAvailable.forEach(cmd => console.log(`   - ${cmd}`));
    }
    
    if (result.issues.length > 0) {
      console.log('\n⚠️ Issues Found:');
      result.issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    console.log(`\n📊 Validation completed at: ${result.timestamp}`);
  }
  
  /**
   * Quick validation for mobile debugging
   */
  static quickCheck(): boolean {
    const result = this.validate();
    const success = result.phase6Active && result.errorsFree;
    
    console.log(`📱 Quick Check: ${success ? '✅ PASS' : '❌ FAIL'}`);
    if (!success && result.issues.length > 0) {
      console.log('Issues:', result.issues.join(', '));
    }
    
    return success;
  }
}

// Auto-expose for mobile console debugging
if (typeof window !== 'undefined') {
  (window as any).mobileValidator = MobileConsoleValidator;
  (window as any).validateMobile = () => MobileConsoleValidator.logValidation();
  (window as any).quickMobileCheck = () => MobileConsoleValidator.quickCheck();
  
  // 🔧 HMR Module Error Recovery Tools
  (window as any).fixModuleError = () => {
    console.log('🔄 [FixModuleError] Attempting to recover from module import failures...');
    
    // Clear Vite's module cache
    if ((window as any).__vite_plugin_react_preamble_installed__) {
      (window as any).__vite_plugin_react_preamble_installed__ = false;
      console.log('🔄 [FixModuleError] Vite cache cleared');
    }
    
    // Clear localStorage entries that might be corrupted
    const problematicKeys = ['vite:'];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && problematicKeys.some(pattern => key.includes(pattern))) {
        localStorage.removeItem(key);
        console.log(`🗑️ [FixModuleError] Removed: ${key}`);
      }
    }
    
    // Force reload after a brief delay
    console.log('🔄 [FixModuleError] Reloading page in 1 second...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };
  
  (window as any).emergencyReload = () => {
    console.log('🚑 [EmergencyReload] Hard reloading to fix development issues...');
    window.location.href = window.location.href;
  };
  
  // Auto-detect and recover from module errors
  (window as any).enableHMRAutoRecovery = () => {
    console.log('🤖 [HMRAutoRecovery] Enabling automatic recovery for module errors...');
    
    let errorCount = 0;
    const maxErrors = 3;
    
    const handleModuleError = (error: any, source: string) => {
      if (error && typeof error.message === 'string' && 
          error.message.includes('Importing a module script failed')) {
        
        errorCount++;
        console.warn(`🔄 [HMRAutoRecovery] Module error detected from ${source} (${errorCount}/${maxErrors}):`, error.message);
        
        if (errorCount <= maxErrors) {
          console.log(`🔄 [HMRAutoRecovery] Auto-fixing in 2 seconds...`);
          setTimeout(() => {
            (window as any).fixModuleError();
          }, 2000);
        } else {
          console.error(`❌ [HMRAutoRecovery] Too many module errors (${errorCount}). Please restart dev server.`);
        }
        
        return true;
      }
      return false;
    };
    
    // Handle window errors
    const originalError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (handleModuleError(error, 'window.onerror')) {
        return true;
      }
      return originalError ? originalError(message, source, lineno, colno, error) : false;
    };
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (handleModuleError(event.reason, 'unhandledrejection')) {
        event.preventDefault();
      }
    });
    
    console.log('✅ [HMRAutoRecovery] Auto-recovery enabled');
  };
  
  // Enable auto-recovery by default in development
  if (import.meta.env?.DEV) {
    (window as any).enableHMRAutoRecovery();
  }
  
  // Add to console help
  const originalConsoleLog = console.log;
  setTimeout(() => {
    console.log('\n🔧 [Mobile Debug] Additional HMR Recovery Tools:');
    console.log('   - window.fixModuleError() - Fix module import failures');
    console.log('   - window.emergencyReload() - Hard reload for development issues');
    console.log('   - window.enableHMRAutoRecovery() - Auto-fix module errors (already enabled)');
  }, 3000);
}

// Development helper - auto-run validation
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  // Run validation after a short delay to ensure all systems are loaded
  setTimeout(() => {
    console.log('🔧 Auto-running mobile validation...');
    MobileConsoleValidator.logValidation();
  }, 2000);
} 