/**
 * Production-Safe Logger Utility
 * 
 * This utility provides comprehensive logging controls that:
 * - Completely disable logging in production builds
 * - Provide controlled logging in development
 * - Offer performance monitoring for logging overhead
 * - Support categorized logging with fine-grained control
 * - Include automatic log level management
 */

import { devLogger } from './developmentLogger';
import type { LogCategory, LoggableValue, LoggingMetrics, LoggerStatus } from '@/types/logging';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Production safety check
const PRODUCTION_LOGGING_ENABLED = false; // NEVER set to true in production

// Use imported LoggingMetrics type

class ProductionSafeLogger {
  private metrics: LoggingMetrics = {
    totalLogs: 0,
    totalTime: 0,
    averageTime: 0,
    logsByLevel: {},
    logsByCategory: {}
  };

  private isEnabled: boolean;
  private startTime: number = 0;

  constructor() {
    // Production safety: completely disable logging in production
    this.isEnabled = !isProduction || PRODUCTION_LOGGING_ENABLED;
    
    // Show initialization message only in development
    if (isDevelopment && this.isEnabled) {
      console.log('🔧 [Logger] Production-safe logger initialized');
    }
  }

  /**
   * Debug level logging - most verbose, disabled in production
   */
  debug(category: LogCategory, message: string, ...args: LoggableValue[]): void {
    if (!this.isEnabled || isProduction) return;
    
    this.trackLog('debug', category);
    
    if (isDevelopment) {
      devLogger.log(category, message, ...args);
    }
  }

  /**
   * Info level logging - general information
   */
  info(category: LogCategory, message: string, ...args: LoggableValue[]): void {
    if (!this.isEnabled || isProduction) return;
    
    this.trackLog('info', category);
    
    if (isDevelopment) {
      devLogger.log(category, message, ...args);
    }
  }

  /**
   * Warning level logging - important issues
   */
  warn(category: LogCategory, message: string, ...args: LoggableValue[]): void {
    if (!this.isEnabled) return;
    
    this.trackLog('warn', category);
    
    if (isDevelopment) {
      devLogger.warn(category, message, ...args);
    } else if (isProduction && PRODUCTION_LOGGING_ENABLED) {
      // In production, only show warnings if explicitly enabled
      console.warn(`⚠️ [${category}] ${message}`, ...args);
    }
  }

  /**
   * Error level logging - critical issues, always shown
   */
  error(category: LogCategory, message: string, error?: Error, ...args: LoggableValue[]): void {
    this.trackLog('error', category);
    
    if (isDevelopment) {
      devLogger.warn(category, `ERROR: ${message}`, error, ...args);
    } else {
      // Errors are always logged, even in production
      console.error(`❌ [${category}] ${message}`, error, ...args);
    }
  }

  /**
   * Critical level logging - always shown regardless of environment
   */
  critical(category: LogCategory, message: string, error?: Error, ...args: LoggableValue[]): void {
    this.trackLog('critical', category);
    
    // Critical logs are always shown
    console.error(`🚨 [CRITICAL][${category}] ${message}`, error, ...args);
  }

  /**
   * Performance logging - track performance metrics
   */
  performance(category: string, operation: string, duration: number, ...args: any[]): void {
    if (!this.isEnabled || isProduction) return;
    
    this.trackLog('performance', category);
    
    if (isDevelopment) {
      devLogger.log(category, `⏱️ ${operation}: ${duration}ms`, ...args);
    }
  }

  /**
   * Startup logging - one-time initialization logs
   */
  startup(category: string, message: string, ...args: any[]): void {
    if (!this.isEnabled || isProduction) return;
    
    this.trackLog('startup', category);
    
    if (isDevelopment) {
      devLogger.startup(category, message, ...args);
    }
  }

  /**
   * Group logging - create collapsible log groups
   */
  group(category: string, title: string, collapsed: boolean = false): void {
    if (!this.isEnabled || isProduction) return;
    
    this.trackLog('group', category);
    
    if (isDevelopment) {
      if (collapsed) {
        console.groupCollapsed(`📂 [${category}] ${title}`);
      } else {
        console.group(`📂 [${category}] ${title}`);
      }
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (!this.isEnabled || isProduction) return;
    
    if (isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * Table logging - display data in table format
   */
  table(category: string, data: any, title?: string): void {
    if (!this.isEnabled || isProduction) return;
    
    this.trackLog('table', category);
    
    if (isDevelopment) {
      if (title) {
        console.log(`📊 [${category}] ${title}`);
      }
      console.table(data);
    }
  }

  /**
   * Time measurement utilities
   */
  time(label: string): void {
    if (!this.isEnabled || isProduction) return;
    
    if (isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (!this.isEnabled || isProduction) return;
    
    if (isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Conditional logging - only log if condition is true
   */
  assert(condition: boolean, category: string, message: string, ...args: any[]): void {
    if (!condition) {
      this.error(category, `Assertion failed: ${message}`, undefined, ...args);
    }
  }

  /**
   * Track logging metrics
   */
  private trackLog(level: string, category: string): void {
    if (!this.isEnabled) return;
    
    const now = performance.now();
    const duration = this.startTime ? now - this.startTime : 0;
    
    this.metrics.totalLogs++;
    this.metrics.totalTime += duration;
    this.metrics.averageTime = this.metrics.totalTime / this.metrics.totalLogs;
    
    this.metrics.logsByLevel[level] = (this.metrics.logsByLevel[level] || 0) + 1;
    this.metrics.logsByCategory[category] = (this.metrics.logsByCategory[category] || 0) + 1;
    
    this.startTime = now;
  }

  /**
   * Get logging performance metrics
   */
  getMetrics(): LoggingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalLogs: 0,
      totalTime: 0,
      averageTime: 0,
      logsByLevel: {},
      logsByCategory: {}
    };
  }

  /**
   * Enable/disable logging (development only)
   */
  setEnabled(enabled: boolean): void {
    if (isProduction) {
      console.warn('🚨 [Logger] Cannot enable logging in production mode');
      return;
    }
    
    this.isEnabled = enabled;
    
    if (isDevelopment) {
      console.log(`🔧 [Logger] Logging ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get current logging status
   */
  getStatus(): {
    isEnabled: boolean;
    environment: string;
    productionSafe: boolean;
    devLoggerStatus: any;
  } {
    return {
      isEnabled: this.isEnabled,
      environment: process.env.NODE_ENV || 'unknown',
      productionSafe: !isProduction || !PRODUCTION_LOGGING_ENABLED,
      devLoggerStatus: isDevelopment ? devLogger.getStats() : null
    };
  }
}

// Create singleton instance
export const logger = new ProductionSafeLogger();

// Expose debugging interface in development
if (isDevelopment && typeof window !== 'undefined') {
  (window as any).logger = logger;
  (window as any).loggingMetrics = () => logger.getMetrics();
  (window as any).loggerStatus = () => logger.getStatus();
}

// Create convenient aliases for different log levels
export const log = {
  debug: (category: string, message: string, ...args: any[]) => logger.debug(category, message, ...args),
  info: (category: string, message: string, ...args: any[]) => logger.info(category, message, ...args),
  warn: (category: string, message: string, ...args: any[]) => logger.warn(category, message, ...args),
  error: (category: string, message: string, error?: Error, ...args: any[]) => logger.error(category, message, error, ...args),
  critical: (category: string, message: string, error?: Error, ...args: any[]) => logger.critical(category, message, error, ...args),
  performance: (category: string, operation: string, duration: number, ...args: any[]) => logger.performance(category, operation, duration, ...args),
  startup: (category: string, message: string, ...args: any[]) => logger.startup(category, message, ...args),
  group: (category: string, title: string, collapsed?: boolean) => logger.group(category, title, collapsed),
  groupEnd: () => logger.groupEnd(),
  table: (category: string, data: any, title?: string) => logger.table(category, data, title),
  time: (label: string) => logger.time(label),
  timeEnd: (label: string) => logger.timeEnd(label),
  assert: (condition: boolean, category: string, message: string, ...args: any[]) => logger.assert(condition, category, message, ...args)
};

// Export for legacy compatibility
export default logger;

// Production safety verification
if (isProduction && PRODUCTION_LOGGING_ENABLED) {
  console.warn('🚨 [Logger] WARNING: Production logging is enabled - this should not happen in production builds');
}