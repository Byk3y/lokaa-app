/**
 * 🧹 Phase 10: Enhanced Console Cleanup & Organization
 * 
 * Advanced console management system that:
 * - Filters repetitive debug messages
 * - Organizes console logs by priority
 * - Reduces development noise
 * - Maintains important error tracking
 */

import { devLogger } from './developmentLogger';

// Cache for recent log messages to prevent spam
const logCache = new Map<string, { count: number; lastSeen: number; firstSeen: number }>();
const LOG_CACHE_TTL = 5000; // 5 seconds
const MAX_REPEATED_LOGS = 3; // Show max 3 of the same message

// Categories that should be throttled
const THROTTLED_CATEGORIES = [
  'CacheDebug',
  'UnifiedPresence', 
  'ServiceWorker',
  'PredictiveCache',
  'GlobalPresence',
  'FastPath',
  'AuthFlowStateManager'
];

// Critical patterns that should never be throttled
const NEVER_THROTTLE_PATTERNS = [
  /error/i,
  /failed/i,
  /warning/i,
  /❌/,
  /⚠️/,
  /🚨/,
  /critical/i
];

interface ConsoleConfig {
  enableThrottling: boolean;
  maxRepeatedLogs: number;
  throttleDuration: number;
  categories: {
    [key: string]: {
      enabled: boolean;
      maxRepeat: number;
      throttle: number;
    }
  };
}

class ConsoleOptimizer {
  private config: ConsoleConfig;
  private originalConsole: Console;
  private messageCache = new Map<string, { count: number; lastSeen: number }>();

  constructor() {
    this.originalConsole = { ...console };
    this.config = {
      enableThrottling: process.env.NODE_ENV === 'development',
      maxRepeatedLogs: 3,
      throttleDuration: 5000,
      categories: {
        CacheDebug: { enabled: true, maxRepeat: 2, throttle: 2000 },
        UnifiedPresence: { enabled: true, maxRepeat: 3, throttle: 3000 },
        ServiceWorker: { enabled: false, maxRepeat: 1, throttle: 5000 }, // Heavily throttled
        PredictiveCache: { enabled: true, maxRepeat: 2, throttle: 3000 },
        GlobalPresence: { enabled: true, maxRepeat: 2, throttle: 3000 },
        FastPath: { enabled: true, maxRepeat: 2, throttle: 2000 },
        AuthFlowStateManager: { enabled: true, maxRepeat: 2, throttle: 2000 }
      }
    };

    this.initializeOptimization();
  }

  private initializeOptimization(): void {
    if (!this.config.enableThrottling) return;

    // Override console.log with throttled version
    console.log = this.createThrottledLogger('log');
    
    // Keep original console methods for critical logs
    (console as any).originalLog = this.originalConsole.log;
    (console as any).originalWarn = this.originalConsole.warn;
    (console as any).originalError = this.originalConsole.error;
  }

  private createThrottledLogger(level: 'log' | 'warn' | 'error') {
    return (...args: any[]) => {
      const message = args.join(' ');
      const messageKey = this.generateMessageKey(message);
      
      // Never throttle critical messages
      if (this.isCriticalMessage(message)) {
        this.originalConsole[level](...args);
        return;
      }

      // Check if message should be throttled
      const category = this.extractCategory(message);
      const categoryConfig = this.config.categories[category];
      
      if (categoryConfig && !categoryConfig.enabled) {
        return; // Category disabled
      }

      // Check throttling
      const cached = this.messageCache.get(messageKey);
      const now = Date.now();
      
      if (cached) {
        const timeSinceLastSeen = now - cached.lastSeen;
        const maxRepeat = categoryConfig?.maxRepeat || this.config.maxRepeatedLogs;
        const throttleDuration = categoryConfig?.throttle || this.config.throttleDuration;
        
        if (timeSinceLastSeen < throttleDuration && cached.count >= maxRepeat) {
          // Update cache but don't log
          cached.count++;
          cached.lastSeen = now;
          return;
        }
      }

      // Log the message
      this.originalConsole[level](...args);
      
      // Update cache
      if (cached) {
        cached.count++;
        cached.lastSeen = now;
      } else {
        this.messageCache.set(messageKey, { count: 1, lastSeen: now });
      }

      // Clean old cache entries
      this.cleanCache();
    };
  }

  private generateMessageKey(message: string): string {
    // Create a key that captures the essence of the message without exact details
    return message
      .replace(/\d+/g, 'NUM') // Replace numbers
      .replace(/[a-f0-9-]{36}/g, 'UUID') // Replace UUIDs
      .replace(/\d{13}/g, 'TIMESTAMP') // Replace timestamps
      .substring(0, 100); // Limit key length
  }

  private extractCategory(message: string): string {
    for (const category of THROTTLED_CATEGORIES) {
      if (message.includes(`[${category}]`)) {
        return category;
      }
    }
    return 'default';
  }

  private isCriticalMessage(message: string): boolean {
    return NEVER_THROTTLE_PATTERNS.some(pattern => pattern.test(message));
  }

  private cleanCache(): void {
    const now = Date.now();
    const cutoff = now - (this.config.throttleDuration * 2);
    
    for (const [key, value] of this.messageCache.entries()) {
      if (value.lastSeen < cutoff) {
        this.messageCache.delete(key);
      }
    }
  }

  // Public methods for configuration
  public enableCategory(category: string, enabled: boolean = true): void {
    if (this.config.categories[category]) {
      this.config.categories[category].enabled = enabled;
    }
  }

  public setThrottleConfig(category: string, maxRepeat: number, throttle: number): void {
    if (!this.config.categories[category]) {
      this.config.categories[category] = { enabled: true, maxRepeat, throttle };
    } else {
      this.config.categories[category].maxRepeat = maxRepeat;
      this.config.categories[category].throttle = throttle;
    }
  }

  public getStats(): Record<string, any> {
    return {
      totalCachedMessages: this.messageCache.size,
      categories: this.config.categories,
      throttlingEnabled: this.config.enableThrottling
    };
  }

  public reset(): void {
    this.messageCache.clear();
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
  }
}

// Create global instance
const consoleOptimizer = new ConsoleOptimizer();

// Legacy filtering function (kept for backward compatibility)
export function filterConsoleNoise(): void {
  // This is now handled automatically by ConsoleOptimizer
  devLogger.log('ConsoleCleanup', '🧹 Enhanced console optimization active');
}

// Export for global access and debugging
if (typeof window !== 'undefined') {
  (window as any).consoleOptimizer = consoleOptimizer;
}

export { consoleOptimizer }; 