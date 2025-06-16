/**
 * Development Logger - Centralized logging control to prevent console spam
 * 
 * This utility provides controlled logging for development mode with:
 * - Deduplication to prevent repetitive logs
 * - Rate limiting for high-frequency logs
 * - Categorized logging levels
 * - Easy enable/disable controls
 */

interface LogEntry {
  message: string;
  timestamp: number;
  count: number;
}

class DevelopmentLogger {
  private logCache = new Map<string, LogEntry>();
  private rateLimitCache = new Map<string, number>();
  private isEnabled = process.env.NODE_ENV === 'development';
  
  // Configuration
  private config = {
    // How long to cache duplicate logs (ms)
    deduplicationWindow: 5000,
    // Maximum logs per category per second
    rateLimit: 5,
    // Categories that are completely disabled
    disabledCategories: new Set<string>(),
    // Only show these categories (if set, others are hidden)
    allowedCategories: new Set<string>(),
  };

  /**
   * Enable/disable all development logging
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      console.log('🔇 [DevLogger] Development logging disabled');
    } else {
      console.log('🔊 [DevLogger] Development logging enabled');
    }
  }

  /**
   * Disable specific logging categories
   */
  disableCategory(...categories: string[]) {
    categories.forEach(cat => this.config.disabledCategories.add(cat));
    console.log(`🔇 [DevLogger] Disabled categories: ${categories.join(', ')}`);
  }

  /**
   * Only allow specific logging categories (hides all others)
   */
  onlyAllow(...categories: string[]) {
    this.config.allowedCategories.clear();
    categories.forEach(cat => this.config.allowedCategories.add(cat));
    console.log(`🎯 [DevLogger] Only allowing categories: ${categories.join(', ')}`);
  }

  /**
   * Clear all logging restrictions
   */
  allowAll() {
    this.config.disabledCategories.clear();
    this.config.allowedCategories.clear();
    console.log('🔊 [DevLogger] All categories allowed');
  }

  /**
   * Controlled logging with deduplication and rate limiting
   */
  log(category: string, message: string, ...args: any[]) {
    if (!this.shouldLog(category, message)) return;

    const logKey = `${category}:${message}`;
    const now = Date.now();
    const existing = this.logCache.get(logKey);

    if (existing && (now - existing.timestamp) < this.config.deduplicationWindow) {
      // Update count for duplicate log
      existing.count++;
      existing.timestamp = now;
      
      // Only show count updates every 5 duplicates to reduce noise
      if (existing.count % 5 === 0) {
        console.log(`🔄 [${category}] ${message} (×${existing.count})`, ...args);
      }
      return;
    }

    // New log entry
    this.logCache.set(logKey, { message, timestamp: now, count: 1 });
    console.log(`🔧 [${category}] ${message}`, ...args);

    // Clean old entries periodically
    if (this.logCache.size > 100) {
      this.cleanOldEntries();
    }
  }

  /**
   * Controlled warning with deduplication
   */
  warn(category: string, message: string, ...args: any[]) {
    if (!this.shouldLog(category, message)) return;

    const logKey = `warn:${category}:${message}`;
    const now = Date.now();
    const existing = this.logCache.get(logKey);

    if (existing && (now - existing.timestamp) < this.config.deduplicationWindow) {
      existing.count++;
      existing.timestamp = now;
      
      // Only show warning count updates every 3 duplicates
      if (existing.count % 3 === 0) {
        console.warn(`⚠️ [${category}] ${message} (×${existing.count})`, ...args);
      }
      return;
    }

    this.logCache.set(logKey, { message, timestamp: now, count: 1 });
    console.warn(`⚠️ [${category}] ${message}`, ...args);
  }

  /**
   * One-time startup logs (only log once per session)
   */
  startup(category: string, message: string, ...args: any[]) {
    const logKey = `startup:${category}:${message}`;
    if (this.logCache.has(logKey)) return;

    this.logCache.set(logKey, { message, timestamp: Date.now(), count: 1 });
    if (this.shouldLog(category, message)) {
      console.log(`🚀 [${category}] ${message}`, ...args);
    }
  }

  private shouldLog(category: string, message: string): boolean {
    if (!this.isEnabled) return false;

    // Check if category is disabled
    if (this.config.disabledCategories.has(category)) return false;

    // Check if only specific categories are allowed
    if (this.config.allowedCategories.size > 0 && !this.config.allowedCategories.has(category)) {
      return false;
    }

    // Rate limiting check
    const rateLimitKey = category;
    const now = Date.now();
    const lastLog = this.rateLimitCache.get(rateLimitKey) || 0;
    
    if (now - lastLog < (1000 / this.config.rateLimit)) {
      return false; // Rate limited
    }
    
    this.rateLimitCache.set(rateLimitKey, now);
    return true;
  }

  private cleanOldEntries() {
    const now = Date.now();
    const cutoff = now - this.config.deduplicationWindow * 2;
    
    for (const [key, entry] of this.logCache.entries()) {
      if (entry.timestamp < cutoff) {
        this.logCache.delete(key);
      }
    }
  }

  /**
   * Get logging statistics
   */
  getStats() {
    const categories = new Map<string, number>();
    
    for (const [key] of this.logCache.keys()) {
      const category = key.split(':')[0];
      categories.set(category, (categories.get(category) || 0) + 1);
    }

    return {
      totalLogs: this.logCache.size,
      categories: Object.fromEntries(categories),
      isEnabled: this.isEnabled,
      disabledCategories: Array.from(this.config.disabledCategories),
      allowedCategories: Array.from(this.config.allowedCategories),
    };
  }
}

// Create singleton instance
export const devLogger = new DevelopmentLogger();

// Initialize Phase 2B categories
devLogger.startup('Phase2B', 'Real-time optimization system initialized');

// Expose debugging interface
if (typeof window !== 'undefined') {
  (window as any).devLogger = devLogger;
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).devLogger = devLogger;
}

// Default configuration for production-like development experience
if (process.env.NODE_ENV === 'development') {
  // Disable noisy categories by default
  devLogger.disableCategory(
    'MediaProcessing',
    'PerformanceMonitor', 
    'BundleOptimizer',
    'MobileOptimization',
    'PresenceDebug'
  );

  console.log('🔧 [DevLogger] Development logger initialized');
  console.log('🔧 Available commands:');
  console.log('  - window.devLogger.allowAll() - Enable all logging');
  console.log('  - window.devLogger.disableCategory("CategoryName") - Disable specific category');
  console.log('  - window.devLogger.onlyAllow("Category1", "Category2") - Only show specific categories');
  console.log('  - window.devLogger.getStats() - Show logging statistics');
  console.log('  - window.devLogger.setEnabled(false) - Disable all dev logging');
}

// Phase 2A: Enable Advanced Query Engine logging categories
if (process.env.NODE_ENV === 'development') {
  devLogger.startup('Phase2A', 'Advanced Query Engine logging enabled');
  // Enable specific categories for Phase 2A
  devLogger.onlyAllow('CacheDebug', 'QueryEngine', 'AdvancedQuery', 'Phase2A');
}

// Phase 2C: Enable Predictive Cache logging categories
if (process.env.NODE_ENV === 'development') {
  devLogger.startup('Phase2C', 'Predictive Cache Engine logging enabled');
  // Add Phase 2C categories to allowed list
  devLogger.onlyAllow('CacheDebug', 'QueryEngine', 'AdvancedQuery', 'Phase2A', 'PredictiveCache', 'PredictiveDashboard', 'Phase2C');
}

export default devLogger; 