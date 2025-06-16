/**
 * 🚨 Phase 4A: Advanced Error Tracking & Reporting System
 * 
 * Comprehensive error monitoring with:
 * - Automatic error capture and classification
 * - User context and session tracking
 * - Performance impact analysis
 * - Real-time error reporting
 * - Integration with existing performance monitoring
 */

import { devLogger } from './developmentLogger';
import { performanceMonitor } from './performanceMonitor';
// import { getSupabaseClient } from './supabase';
import { unifiedRealtimeSystem } from './unifiedRealtimeSystem';

export interface ErrorSeverity {
  level: 'low' | 'medium' | 'high' | 'critical';
  priority: 1 | 2 | 3 | 4;
  autoReport: boolean;
}

export interface ErrorContext {
  userId?: string;
  sessionId: string;
  spaceId?: string;
  route: string;
  userAgent: string;
  timestamp: number;
  stackTrace?: string;
  componentStack?: string;
  errorBoundary?: string;
  performanceMetrics?: {
    memoryUsage: number;
    longTasks: number;
    renderTime: number;
  };
  userActions?: Array<{
    action: string;
    timestamp: number;
    element?: string;
  }>;
}

export interface ErrorReport {
  id: string;
  message: string;
  type: 'javascript' | 'react' | 'network' | 'performance' | 'user' | 'system';
  severity: ErrorSeverity;
  context: ErrorContext;
  fingerprint: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  resolved: boolean;
  tags: string[];
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorRate: number;
  affectedUsers: number;
  avgResolutionTime: number;
  topErrors: ErrorReport[];
  recentErrors: ErrorReport[];
}

class ErrorTrackingSystem {
  private errors: Map<string, ErrorReport> = new Map();
  private userActions: Array<{ action: string; timestamp: number; element?: string }> = [];
  private sessionId: string;
  private isEnabled: boolean;
  private maxUserActions = 50;
  private maxErrors = 1000;
  private batchSize = 10;
  private reportQueue: ErrorReport[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production';
    
    if (this.isEnabled) {
      this.initialize();
      this.clearOldErrors(); // Clear any old cached errors from previous sessions
    }
  }

  /**
   * Initialize error tracking system
   */
  private initialize(): void {
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    // Set up user action tracking
    this.setupUserActionTracking();
    
    // Set up periodic error reporting
    this.startBatchReporting();
    
    // Initialize global interface
    this.setupGlobalInterface();
    
    devLogger.startup('ErrorTracking', '🚨 Error tracking system initialized');
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        type: 'javascript',
        severity: this.classifyJSError(event),
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        type: 'javascript',
        severity: { level: 'high', priority: 3, autoReport: true },
        stack: event.reason?.stack
      });
    });

    // React error boundary integration will be handled by ErrorBoundary components
    devLogger.log('ErrorTracking', 'Global error handlers configured');
  }

  /**
   * Set up user action tracking for error context
   */
  private setupUserActionTracking(): void {
    // TEMPORARY: Disable user action tracking to prevent infinite loops
    // This will be re-enabled on next page load with the fixed code
    if (import.meta.env?.DEV) {
      console.log('🔧 [ErrorTracking] User action tracking temporarily disabled to prevent loops');
      return;
    }

    // Track clicks with error handling to prevent infinite loops
    document.addEventListener('click', (event) => {
      try {
        const target = event.target as Element;
        if (target) {
          this.trackUserAction('click', {
            element: this.getElementSelector(target),
            timestamp: Date.now()
          });
        }
      } catch (error) {
        // Silently ignore errors in user action tracking to prevent loops
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error in click tracking (ignored):', error);
        }
      }
    });

    // Track navigation with error handling
    try {
      let lastUrl = location.href;
      new MutationObserver(() => {
        try {
          const url = location.href;
          if (url !== lastUrl) {
            lastUrl = url;
            this.trackUserAction('navigation', {
              url,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          // Silently ignore navigation tracking errors
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error in navigation tracking (ignored):', error);
          }
        }
      }).observe(document, { subtree: true, childList: true });
    } catch (error) {
      // If MutationObserver setup fails, continue without navigation tracking
      if (process.env.NODE_ENV === 'development') {
        console.warn('Navigation tracking setup failed (ignored):', error);
      }
    }

    devLogger.log('ErrorTracking', 'User action tracking configured with error handling');
  }

  /**
   * Capture and process an error
   */
  public captureError(errorData: {
    message: string;
    type: ErrorReport['type'];
    severity: ErrorSeverity;
    source?: string;
    lineno?: number;
    colno?: number;
    stack?: string;
    componentStack?: string;
    errorBoundary?: string;
    userId?: string;
    spaceId?: string;
  }): string {
    if (!this.isEnabled) return '';

    const fingerprint = this.generateFingerprint(errorData);
    const timestamp = Date.now();

    // Get or create error report
    let errorReport = this.errors.get(fingerprint);
    
    if (errorReport) {
      // Update existing error
      errorReport.count++;
      errorReport.lastSeen = timestamp;
    } else {
      // Create new error report
      errorReport = {
        id: this.generateErrorId(),
        message: errorData.message,
        type: errorData.type,
        severity: errorData.severity,
        context: this.buildErrorContext(errorData),
        fingerprint,
        count: 1,
        firstSeen: timestamp,
        lastSeen: timestamp,
        resolved: false,
        tags: this.generateTags(errorData)
      };

      this.errors.set(fingerprint, errorReport);
    }

    // Add to report queue if auto-reporting is enabled
    if (errorData.severity.autoReport) {
      this.queueErrorReport(errorReport);
    }

    // Log error appropriately
    if (errorData.severity.level === 'critical') {
      console.error(`🚨 [CRITICAL ERROR] ${errorData.message}`, errorReport);
    } else if (errorData.severity.level === 'high') {
      console.warn(`⚠️ [HIGH ERROR] ${errorData.message}`, errorReport);
    } else if (process.env.NODE_ENV === 'development') {
      devLogger.log('ErrorTracking', `Error captured: ${errorData.message}`, errorReport);
    }

    // Record performance impact
    if (performanceMonitor) {
      performanceMonitor.recordMetric('networkRequests', 1);
    }

    return errorReport.id;
  }

  /**
   * Capture React component errors
   */
  public captureReactError(error: Error, errorInfo: { componentStack: string }, errorBoundary: string): string {
    return this.captureError({
      message: error.message,
      type: 'react',
      severity: this.classifyReactError(error),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary
    });
  }

  /**
   * Capture network errors
   */
  public captureNetworkError(url: string, status: number, statusText: string, duration: number): string {
    return this.captureError({
      message: `Network Error: ${status} ${statusText} - ${url}`,
      type: 'network',
      severity: this.classifyNetworkError(status, duration),
      source: url
    });
  }

  /**
   * Capture performance errors
   */
  public capturePerformanceError(metric: string, value: number, threshold: number): string {
    return this.captureError({
      message: `Performance Issue: ${metric} (${value}ms) exceeded threshold (${threshold}ms)`,
      type: 'performance',
      severity: this.classifyPerformanceError(value, threshold)
    });
  }

  /**
   * Track user actions for error context
   */
  private trackUserAction(action: string, details: any): void {
    this.userActions.push({
      action,
      timestamp: Date.now(),
      ...details
    });

    // Keep only recent actions
    if (this.userActions.length > this.maxUserActions) {
      this.userActions = this.userActions.slice(-this.maxUserActions);
    }
  }

  /**
   * Build comprehensive error context
   */
  private buildErrorContext(errorData: any): ErrorContext {
    const performanceMetrics = performanceMonitor?.getPerformanceSummary?.() || {};
    
    return {
      userId: errorData.userId,
      sessionId: this.sessionId,
      spaceId: errorData.spaceId,
      route: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      stackTrace: errorData.stack,
      componentStack: errorData.componentStack,
      errorBoundary: errorData.errorBoundary,
      performanceMetrics: {
        memoryUsage: performanceMetrics.memory?.recent?.[0] || 0,
        longTasks: performanceMetrics.longTasks?.count || 0,
        renderTime: performanceMetrics.componentRenders?.avg || 0
      },
      userActions: [...this.userActions.slice(-10)] // Last 10 actions
    };
  }

  /**
   * Classify JavaScript errors by severity
   */
  private classifyJSError(event: ErrorEvent): ErrorSeverity {
    const message = event.message.toLowerCase();
    
    // Critical errors
    if (message.includes('out of memory') || 
        message.includes('maximum call stack') ||
        message.includes('script error')) {
      return { level: 'critical', priority: 4, autoReport: true };
    }
    
    // High severity errors
    if (message.includes('typeerror') || 
        message.includes('referenceerror') ||
        message.includes('syntaxerror')) {
      return { level: 'high', priority: 3, autoReport: true };
    }
    
    // Medium severity errors
    if (message.includes('network') || 
        message.includes('fetch') ||
        message.includes('load')) {
      return { level: 'medium', priority: 2, autoReport: false };
    }
    
    // Low severity (default)
    return { level: 'low', priority: 1, autoReport: false };
  }

  /**
   * Classify React errors by severity
   */
  private classifyReactError(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    // Critical - errors that break core functionality
    if (message.includes('hydration') || 
        message.includes('cannot read prop') ||
        stack.includes('authcontext') ||
        stack.includes('spacecontext')) {
      return { level: 'critical', priority: 4, autoReport: true };
    }
    
    // High - errors that affect user experience
    if (message.includes('hook') || 
        message.includes('render') ||
        message.includes('state')) {
      return { level: 'high', priority: 3, autoReport: true };
    }
    
    // Medium - component-specific errors
    if (stack.includes('component')) {
      return { level: 'medium', priority: 2, autoReport: false };
    }
    
    return { level: 'low', priority: 1, autoReport: false };
  }

  /**
   * Classify network errors by severity
   */
  private classifyNetworkError(status: number, duration: number): ErrorSeverity {
    // Critical - authentication or core API failures
    if (status === 401 || status === 403 || status === 500) {
      return { level: 'critical', priority: 4, autoReport: true };
    }
    
    // High - server errors or timeouts
    if (status >= 500 || duration > 10000) {
      return { level: 'high', priority: 3, autoReport: true };
    }
    
    // Medium - client errors or slow requests
    if (status >= 400 || duration > 5000) {
      return { level: 'medium', priority: 2, autoReport: false };
    }
    
    return { level: 'low', priority: 1, autoReport: false };
  }

  /**
   * Classify performance errors by severity
   */
  private classifyPerformanceError(value: number, threshold: number): ErrorSeverity {
    const ratio = value / threshold;
    
    if (ratio > 3) {
      return { level: 'critical', priority: 4, autoReport: true };
    } else if (ratio > 2) {
      return { level: 'high', priority: 3, autoReport: true };
    } else if (ratio > 1.5) {
      return { level: 'medium', priority: 2, autoReport: false };
    }
    
    return { level: 'low', priority: 1, autoReport: false };
  }

  /**
   * Generate error fingerprint for deduplication
   */
  private generateFingerprint(errorData: any): string {
    const components = [
      errorData.type,
      errorData.message.replace(/\d+/g, 'N'), // Replace numbers with N
      errorData.source?.split('/').pop(), // Just filename
      errorData.lineno ? `L${errorData.lineno}` : '',
    ].filter(Boolean);
    
    return btoa(components.join('|')).replace(/[+/=]/g, '').substring(0, 16);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
  }

  /**
   * Generate tags for error categorization
   */
  private generateTags(errorData: any): string[] {
    const tags: string[] = [];
    
    // Add type tag
    tags.push(`type:${errorData.type}`);
    
    // Add severity tag
    tags.push(`severity:${errorData.severity.level}`);
    
    // Add source tags
    if (errorData.source) {
      const filename = errorData.source.split('/').pop();
      if (filename) {
        tags.push(`file:${filename}`);
      }
    }
    
    // Add component tags from stack
    if (errorData.componentStack) {
      const components = errorData.componentStack.match(/\w+(?=\s+\()/g) || [];
      components.slice(0, 3).forEach(comp => tags.push(`component:${comp}`));
    }
    
    // Add environment tag
    tags.push(`env:${process.env.NODE_ENV || 'development'}`);
    
    return tags;
  }

  /**
   * Get element selector for user action tracking
   */
  private getElementSelector(element: Element): string {
    if (!element) return 'unknown';
    
    try {
      const tag = element.tagName.toLowerCase();
      const id = element.id ? `#${element.id}` : '';
      
      // Handle className safely - it might be a string or SVGAnimatedString
      let className = '';
      if (element.className) {
        let classNameValue: string = '';
        
        if (typeof element.className === 'string') {
          classNameValue = element.className;
        } else if (element.className && typeof element.className === 'object') {
          // Handle SVGAnimatedString or other object types
          const classObj = element.className as any;
          classNameValue = classObj.baseVal || classObj.animVal || classObj.toString?.() || '';
        }
        
        if (classNameValue && typeof classNameValue === 'string') {
          className = `.${classNameValue.split(' ').filter(c => c.trim()).join('.')}`;
        }
      }
      
      return `${tag}${id}${className}`.substring(0, 100);
    } catch (error) {
      // Fallback if anything goes wrong
      return element.tagName?.toLowerCase() || 'unknown-element';
    }
  }

  /**
   * Queue error report for batch submission
   */
  private queueErrorReport(errorReport: ErrorReport): void {
    this.reportQueue.push(errorReport);
    
    // Immediate flush for critical errors
    if (errorReport.severity.level === 'critical') {
      this.flushReportQueue();
    }
  }

  /**
   * Start batch reporting system
   */
  private startBatchReporting(): void {
    // Flush reports every 30 seconds
    this.flushInterval = setInterval(() => {
      if (this.reportQueue.length > 0) {
        this.flushReportQueue();
      }
    }, 30000);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushReportQueue();
    });
  }

  /**
   * Flush queued error reports
   */
  private async flushReportQueue(): Promise<void> {
    if (this.reportQueue.length === 0) return;
    
    const reportsToFlush = this.reportQueue.splice(0, this.batchSize);
    
    try {
      // Log reports for now (Supabase integration can be added later)
      devLogger.log('ErrorTracking', `Processing ${reportsToFlush.length} error reports:`, reportsToFlush);
      
      // Send real-time notifications for critical errors
      const criticalErrors = reportsToFlush.filter(r => r.severity.level === 'critical');
      if (criticalErrors.length > 0) {
        this.sendRealTimeNotifications(criticalErrors);
      }
      
      devLogger.log('ErrorTracking', `Flushed ${reportsToFlush.length} error reports`);
    } catch (error) {
      // Re-queue reports if sending failed
      this.reportQueue.unshift(...reportsToFlush);
      devLogger.warn('ErrorTracking', 'Failed to flush error reports:', error);
    }
  }

  /**
   * Send error reports to database (to be implemented with Supabase)
   */
  private async sendToDatabase(reports: ErrorReport[]): Promise<void> {
    // TODO: Implement Supabase integration
    // For now, just log the reports
    devLogger.log('ErrorTracking', 'Sending error reports to database:', reports.map(r => ({
      id: r.id,
      message: r.message,
      type: r.type,
      severity: r.severity.level,
      count: r.count
    })));
  }

  /**
   * Send real-time notifications for critical errors
   */
  private sendRealTimeNotifications(criticalErrors: ErrorReport[]): void {
    criticalErrors.forEach(error => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('critical-error-detected', {
          detail: {
            errorId: error.id,
            message: error.message,
            severity: error.severity,
            timestamp: error.lastSeen
          }
        }));
      }
    });
  }

  /**
   * Get error metrics and statistics
   */
  public getMetrics(): ErrorMetrics {
    const errors = Array.from(this.errors.values());
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);
    
    const recentErrors = errors.filter(e => e.lastSeen > last24Hours);
    const totalErrors = errors.reduce((sum, e) => sum + e.count, 0);
    
    const errorsByType = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + error.count;
      return acc;
    }, {} as Record<string, number>);
    
    const errorsBySeverity = errors.reduce((acc, error) => {
      acc[error.severity.level] = (acc[error.severity.level] || 0) + error.count;
      return acc;
    }, {} as Record<string, number>);

    const uniqueUsers = new Set(
      errors.map(e => e.context.userId).filter(Boolean)
    ).size;

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      errorRate: recentErrors.length / Math.max(1, (now - last24Hours) / (60 * 60 * 1000)), // errors per hour
      affectedUsers: uniqueUsers,
      avgResolutionTime: 0, // TODO: Calculate from resolved errors
      topErrors: errors
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recentErrors: errors
        .filter(e => e.lastSeen > now - (60 * 60 * 1000)) // Last hour
        .sort((a, b) => b.lastSeen - a.lastSeen)
        .slice(0, 20)
    };
  }

  /**
   * Get all captured errors
   */
  public getErrors(): ErrorReport[] {
    return Array.from(this.errors.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  }

  /**
   * Get errors by type
   */
  public getErrorsByType(type: ErrorReport['type']): ErrorReport[] {
    return this.getErrors().filter(error => error.type === type);
  }

  /**
   * Get errors by severity
   */
  public getErrorsBySeverity(severity: ErrorSeverity['level']): ErrorReport[] {
    return this.getErrors().filter(error => error.severity.level === severity);
  }

  /**
   * Clear all errors (for testing/debugging)
   */
  public clearErrors(): void {
    this.errors.clear();
    console.log('🧹 All errors cleared');
  }

  /**
   * Setup global interface for debugging
   */
  private setupGlobalInterface(): void {
    if (typeof window !== 'undefined') {
      (window as any).errorTracker = {
        getMetrics: () => this.getMetrics(),
        getErrors: () => this.getErrors(),
        getErrorsByType: (type: ErrorReport['type']) => this.getErrorsByType(type),
        getErrorsBySeverity: (severity: ErrorSeverity['level']) => this.getErrorsBySeverity(severity),
        captureTestError: () => {
          this.captureError({
            message: 'Test error for debugging',
            type: 'user',
            severity: { level: 'low', priority: 1, autoReport: false }
          });
        },
        enable: () => { this.isEnabled = true; },
        disable: () => { this.isEnabled = false; },
        clearErrors: () => this.clearErrors(),
        flushReports: () => this.flushReportQueue(),
        exportData: () => ({
          errors: this.getErrors(),
          metrics: this.getMetrics(),
          sessionId: this.sessionId
        })
      };
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Final flush
    this.flushReportQueue();
    
    devLogger.log('ErrorTracking', 'Error tracking system cleaned up');
  }

  /**
   * Clear old cached errors
   */
  private clearOldErrors(): void {
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);
    
    const oldErrors = Array.from(this.errors.values()).filter(e => e.lastSeen < last24Hours);
    oldErrors.forEach(e => this.errors.delete(e.fingerprint));
    
    console.log(`🧹 Cleared ${oldErrors.length} old cached errors`);
  }
}

// Create and export singleton instance
export const errorTracker = new ErrorTrackingSystem();

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).errorTracker = errorTracker;
} 