import { log } from '@/utils/logger';
/**
 * 🚨 Phase 4A: Error Tracking & Reporting - System Integration
 * 
 * Comprehensive integration of error tracking system with existing infrastructure:
 * - Initialize error tracking on app startup
 * - Integrate with performance monitoring
 * - Setup global error boundaries
 * - Enable development debugging tools
 * - Coordinate with existing systems
 */

import { errorTracker } from './errorTrackingSystem';
import { devLogger } from './developmentLogger';
import { performanceMonitor } from './performanceMonitor';

/**
 * Initialize Phase 4A Error Tracking System
 */
export function initializePhase4A(): void {
  try {
    // Error tracking is auto-initialized, just verify it's working
    const metrics = errorTracker.getMetrics();
    
    devLogger.startup('Phase4A', '🚨 Error tracking system initialized');
    devLogger.log('Phase4A', 'Initial metrics:', metrics);

    // Test error tracking
    if (process.env.NODE_ENV === 'development') {
      // Add test command to global interface
      if (typeof window !== 'undefined') {
        (window as any).phase4a = {
          testError: () => {
            errorTracker.captureError({
              message: 'Phase 4A Test Error - Everything is working!',
              type: 'user',
              severity: { level: 'low', priority: 1, autoReport: false }
            });
            log.debug('Utils', '✅ Phase 4A test error captured successfully!');
          },
          getMetrics: () => errorTracker.getMetrics(),
          getErrors: () => (window as any).errorTracker?.getErrors() || [],
          showDashboard: () => {
            log.debug('Utils', '🚨 Error Dashboard: Look for floating button in bottom-right corner');
            log.debug('Utils', '💡 Or add <ErrorAnalyticsDashboard /> component to your JSX');
          }
        };
      }
    }

    // Integrate with performance monitoring
    if (performanceMonitor) {
      // Enhanced thresholds for development vs production
      const thresholds = {
        longTask: process.env.NODE_ENV === 'development' ? 200 : 100, // Increased for dev
        memoryUsage: 200 * 1024 * 1024, // 200MB in bytes, increased from 150MB
        networkTimeout: 10000, // 10 seconds
        errorRate: 10 // errors per minute
      };

      // Monitor long tasks
      if ('PerformanceObserver' in window) {
        try {
          const longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > thresholds.longTask) {
                errorTracker.capturePerformanceError(
                  'Long Task',
                  entry.duration,
                  thresholds.longTask
                );
              }
            }
          });
          
          longTaskObserver.observe({ entryTypes: ['longtask'] });
        } catch (error) {
          devLogger.warn('Phase4A', 'Long task monitoring setup failed:', error);
        }
      }

      // Monitor memory usage with proper validation
      if ((performance as any).memory) {
        setInterval(() => {
          const memory = (performance as any).memory;
          const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
          const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
          const thresholdMB = Math.round(thresholds.memoryUsage / 1024 / 1024);
          
          // Validate measurements to prevent false alarms
          if (usedMB > 0 && usedMB < 2000 && totalMB > 0 && totalMB < 4000) {
            if (usedMB > thresholdMB) {
              // Use a custom error capture for memory since the standard function assumes milliseconds
              errorTracker.captureError({
                message: `Performance Issue: High Memory Usage (${usedMB}MB) exceeded threshold (${thresholdMB}MB)`,
                type: 'performance',
                severity: { level: usedMB > thresholdMB * 2 ? 'high' : 'medium', priority: usedMB > thresholdMB * 2 ? 3 : 2, autoReport: false }
              });
            }
          } else {
            // Log invalid measurements without reporting as errors
            if (process.env.NODE_ENV === 'development') {
              devLogger.warn('Phase4A', `Invalid memory measurement: ${usedMB}MB used, ${totalMB}MB total`);
            }
          }
        }, 30000); // Check every 30 seconds
      }
    }

    // Setup network error monitoring
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const startTime = performance.now();
      
      try {
        const response = await originalFetch.apply(this, args);
        const duration = performance.now() - startTime;
        
        // Log slow requests
        if (duration > 5000) {
          errorTracker.captureNetworkError(
            args[0] as string,
            response.status,
            'Slow Response',
            duration
          );
        }
        
        // Log failed requests
        if (!response.ok) {
          errorTracker.captureNetworkError(
            args[0] as string,
            response.status,
            response.statusText,
            duration
          );
        }
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        errorTracker.captureNetworkError(
          args[0] as string,
          0,
          error instanceof Error ? error.message : 'Network Error',
          duration
        );
        throw error;
      }
    };

    // Setup React error boundary integration
    setupReactErrorBoundaryIntegration();

    devLogger.log('Phase4A', '✅ Phase 4A integration complete');

  } catch (error) {
    log.error('Utils', '🚨 [Phase4A] Initialization failed:', error);
  }
}

/**
 * Setup React Error Boundary integration
 */
function setupReactErrorBoundaryIntegration(): void {
  // Listen for React errors from our error boundaries
  window.addEventListener('react-error-boundary', ((event: CustomEvent) => {
    const { error, errorInfo, errorBoundary } = event.detail;
    
    errorTracker.captureReactError(
      error,
      errorInfo,
      errorBoundary
    );
  }) as EventListener);

  devLogger.log('Phase4A', 'React error boundary integration setup complete');
}

/**
 * Phase 4A Testing Interface for Development
 */
export const phase4aTestSuite = {
  /**
   * Test different error types
   */
  testErrorTypes: () => {
    log.debug('Utils', '🧪 Testing different error types...');
    
    // JavaScript error
    errorTracker.captureError({
      message: 'Test JavaScript Error',
      type: 'javascript',
      severity: { level: 'medium', priority: 2, autoReport: false }
    });

    // React error
    errorTracker.captureReactError(
      new Error('Test React Error'),
      { componentStack: 'at TestComponent\n  at App' },
      'test-boundary'
    );

    // Network error
    errorTracker.captureNetworkError(
      '/api/test',
      404,
      'Not Found',
      1500
    );

    // Performance error
    errorTracker.capturePerformanceError(
      'Test Performance Issue',
      100,
      50
    );

    log.debug('Utils', '✅ Test errors generated! Check error dashboard.');
  },

  /**
   * Test error severity classification
   */
  testSeverityLevels: () => {
    log.debug('Utils', '🧪 Testing error severity levels...');
    
    const severities = ['low', 'medium', 'high', 'critical'] as const;
    
    severities.forEach((level, index) => {
      errorTracker.captureError({
        message: `Test ${level.toUpperCase()} severity error`,
        type: 'user',
        severity: { level, priority: (index + 1) as 1 | 2 | 3 | 4, autoReport: level === 'critical' }
      });
    });

    log.debug('Utils', '✅ Severity test complete! Check error dashboard.');
  },

  /**
   * Test error deduplication
   */
  testDeduplication: () => {
    log.debug('Utils', '🧪 Testing error deduplication...');
    
    // Generate same error multiple times
    for (let i = 0; i < 5; i++) {
      errorTracker.captureError({
        message: 'Duplicate test error for deduplication testing',
        type: 'javascript',
        severity: { level: 'low', priority: 1, autoReport: false }
      });
    }

    log.debug('Utils', '✅ Deduplication test complete! Should see 1 error with count=5');
  },

  /**
   * Test critical error notifications
   */
  testCriticalError: () => {
    log.debug('Utils', '🧪 Testing critical error notifications...');
    
    errorTracker.captureError({
      message: 'TEST CRITICAL ERROR - This will trigger immediate reporting',
      type: 'system',
      severity: { level: 'critical', priority: 4, autoReport: true }
    });

    log.debug('Utils', '🚨 Critical error test complete! Should trigger immediate notification.');
  },

  /**
   * Get comprehensive test results
   */
  getTestResults: () => {
    const metrics = errorTracker.getMetrics();
    const errors = (window as any).errorTracker?.getErrors() || [];
    
    log.debug('Utils', '📊 Phase 4A Test Results:');
    log.debug('Utils', 'Total Errors:', metrics.totalErrors);
    log.debug('Utils', 'Errors by Type:', metrics.errorsByType);
    log.debug('Utils', 'Errors by Severity:', metrics.errorsBySeverity);
    log.debug('Utils', 'Recent Errors:', metrics.recentErrors.length);
    log.debug('Utils', 'Top Errors:', metrics.topErrors.slice(0, 3));
    
    return {
      metrics,
      errors,
      testsPassed: errors.length > 0,
      deduplicationWorking: errors.some(e => e.count > 1),
      severityClassificationWorking: Object.keys(metrics.errorsBySeverity).length > 1
    };
  },

  /**
   * Test a simulated network error
   */
  testNetworkError: () => {
    log.debug('Utils', '🧪 Testing network error...');
    errorTracker.captureNetworkError(
      '/api/simulated-failure',
      500,
      'Simulated Internal Server Error',
      1200
    );
    log.debug('Utils', '✅ Network error test complete! Check error dashboard.');
  },

  /**
   * Test a simulated performance error
   */
  testPerformanceError: () => {
    log.debug('Utils', '🧪 Testing performance error...');
    errorTracker.capturePerformanceError(
      'Simulated Performance Issue',
      200,
      100
    );
    log.debug('Utils', '✅ Performance error test complete! Check error dashboard.');
  },
};

/**
 * Global debugging interface for Phase 4A
 */
if (typeof window !== 'undefined') {
  (window as any).phase4aTest = phase4aTestSuite;
}

// Auto-initialize when module is imported
if (typeof window !== 'undefined') {
  // Initialize after a brief delay to ensure other systems are ready
  setTimeout(() => {
    initializePhase4A();
  }, 100);
} 