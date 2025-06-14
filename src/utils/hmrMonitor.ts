/**
 * HMR Monitor - Development Only
 * Lightweight monitoring for React Fast Refresh in development
 */

interface HMRFailure {
  timestamp: number;
  module: string;
  reason: string;
}

class HMRMonitor {
  private failures: HMRFailure[] = [];
  private isEnabled = import.meta.env.DEV;
  private failureThreshold = 3;
  private timeWindow = 15000; // 15 seconds

  constructor() {
    if (this.isEnabled) {
      this.initialize();
    }
  }

  private initialize() {
    if (!import.meta.hot) return;

    // Monitor HMR failures only
    const originalWarn = console.warn;
    
    console.warn = (...args) => {
      const message = args.join(' ');
      
      // Only capture React Fast Refresh failures
      if (message.includes('Could not Fast Refresh') && message.includes('export is incompatible')) {
        this.recordFailure(this.parseFailureMessage(message));
      }
      
      originalWarn.apply(console, args);
    };

    // Monitor HMR errors
    import.meta.hot.on('vite:error', (error) => {
      this.recordFailure({
        timestamp: Date.now(),
        module: 'unknown',
        reason: 'HMR Error: ' + String(error).substring(0, 100)
      });
    });

    console.log('🔥 [HMR Monitor] Development monitoring enabled');
  }

  private parseFailureMessage(message: string): HMRFailure {
    const moduleMatch = message.match(/hmr invalidate ([^\s]+)/);
    
    return {
      timestamp: Date.now(),
      module: moduleMatch ? moduleMatch[1] : 'unknown',
      reason: 'Fast Refresh incompatible export'
    };
  }

  private recordFailure(failure: HMRFailure) {
    this.failures.push(failure);

    // Keep only recent failures
    const cutoff = Date.now() - this.timeWindow;
    this.failures = this.failures.filter(f => f.timestamp > cutoff);

    // Alert on cascade failures
    if (this.failures.length >= this.failureThreshold) {
      this.alertCascadeFailure();
    }
  }

  private alertCascadeFailure() {
    console.error(`🚨 [HMR Monitor] Cascade failure detected!`);
    console.error(`   - ${this.failures.length} failures in ${this.timeWindow/1000}s`);
    console.error(`   - Consider restarting dev server: npm run dev`);
    
    // Clear failures to prevent spam
    this.failures = [];
  }

  public isHealthy(): boolean {
    const cutoff = Date.now() - this.timeWindow;
    const recentFailures = this.failures.filter(f => f.timestamp > cutoff);
    return recentFailures.length < this.failureThreshold;
  }

  public getStats() {
    return {
      totalFailures: this.failures.length,
      isHealthy: this.isHealthy(),
      enabled: this.isEnabled
    };
  }
}

// Development-only instance
const hmrMonitor = import.meta.env.DEV ? new HMRMonitor() : null;

// Development debugging
if (import.meta.env.DEV && hmrMonitor) {
  (window as any).hmrMonitor = hmrMonitor;
}

export default hmrMonitor; 