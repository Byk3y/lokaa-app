/**
 * Safety Mechanisms for IndexedDB Refactoring
 * 
 * Provides rollback capabilities, monitoring, and safety nets
 */

// Feature flag for system switching
export const FEATURE_FLAGS = {
  USE_NEW_INDEXEDDB_SYSTEM: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_ERROR_TRACKING: true,
  ENABLE_ROLLBACK_PROTECTION: true
};

/**
 * Emergency Rollback System
 */
export class EmergencyRollback {
  private static instance: EmergencyRollback;
  
  static getInstance(): EmergencyRollback {
    if (!EmergencyRollback.instance) {
      EmergencyRollback.instance = new EmergencyRollback();
    }
    return EmergencyRollback.instance;
  }

  /**
   * Force rollback to legacy system
   */
  async forceLegacyMode(reason: string = 'manual_rollback'): Promise<void> {
    console.warn('🚨 [EmergencyRollback] Initiating emergency rollback...');
    
    // Store rollback flags
    this.setRollbackFlags(reason);
    
    // Clear potentially corrupted cache
    await this.clearCorruptedCache();
    
    // Reload application
    this.reloadApplication();
  }

  /**
   * Check if rollback is active
   */
  isRollbackActive(): boolean {
    return localStorage.getItem('FORCE_LEGACY_INDEXEDDB') === 'true';
  }

  /**
   * Get rollback status
   */
  getRollbackStatus() {
    const active = this.isRollbackActive();
    const timestamp = localStorage.getItem('ROLLBACK_TIMESTAMP');
    const reason = localStorage.getItem('ROLLBACK_REASON');
    
    if (!active) return { active: false };
    
    const rollbackTime = timestamp ? parseInt(timestamp) : Date.now();
    const ageInMinutes = (Date.now() - rollbackTime) / 60000;
    
    return {
      active: true,
      timestamp: rollbackTime,
      reason: reason || 'unknown',
      ageInMinutes: Math.round(ageInMinutes)
    };
  }

  /**
   * Clear rollback flags
   */
  clearRollback(): void {
    localStorage.removeItem('FORCE_LEGACY_INDEXEDDB');
    localStorage.removeItem('ROLLBACK_TIMESTAMP');
    localStorage.removeItem('ROLLBACK_REASON');
    console.log('✅ [EmergencyRollback] Rollback cleared');
  }

  private setRollbackFlags(reason: string): void {
    localStorage.setItem('FORCE_LEGACY_INDEXEDDB', 'true');
    localStorage.setItem('ROLLBACK_TIMESTAMP', Date.now().toString());
    localStorage.setItem('ROLLBACK_REASON', reason);
  }

  private async clearCorruptedCache(): Promise<void> {
    try {
      await indexedDB.deleteDatabase('lokaa-supabase-cache');
      console.log('🧹 [EmergencyRollback] Cache cleared');
    } catch (error) {
      console.warn('⚠️ [EmergencyRollback] Cache clear failed:', error);
    }
  }

  private reloadApplication(): void {
    window.location.reload();
  }
}

/**
 * Performance Monitor for Migration
 */
export class MigrationPerformanceMonitor {
  private metrics = {
    legacySystem: {
      responseTime: [] as number[],
      cacheHitRate: 0,
      errorRate: 0
    },
    newSystem: {
      responseTime: [] as number[],
      cacheHitRate: 0,
      errorRate: 0
    }
  };

  async measureOperation<T>(
    operation: () => Promise<T>,
    system: 'legacy' | 'new'
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      this.metrics[system].responseTime.push(duration);
      return { result, duration };
    } catch (error) {
      this.metrics[system].errorRate++;
      throw error;
    }
  }

  getPerformanceComparison() {
    const legacy = this.calculateStats(this.metrics.legacySystem);
    const newSys = this.calculateStats(this.metrics.newSystem);
    
    return {
      legacy,
      new: newSys,
      improvement: {
        responseTime: legacy.avgResponseTime > 0 ? 
          ((legacy.avgResponseTime - newSys.avgResponseTime) / legacy.avgResponseTime) * 100 : 0,
        errorRate: legacy.errorRate - newSys.errorRate
      }
    };
  }

  private calculateStats(metrics: any) {
    const responseTime = metrics.responseTime;
    return {
      avgResponseTime: responseTime.length ? 
        responseTime.reduce((a: number, b: number) => a + b, 0) / responseTime.length : 0,
      minResponseTime: responseTime.length ? Math.min(...responseTime) : 0,
      maxResponseTime: responseTime.length ? Math.max(...responseTime) : 0,
      errorRate: metrics.errorRate,
      cacheHitRate: metrics.cacheHitRate
    };
  }
}

/**
 * Health Check System
 */
export class SystemHealthChecker {
  async performHealthCheck() {
    const checks = {
      indexedDBAvailable: this.checkIndexedDBAvailability(),
      cacheIntegrity: await this.checkCacheIntegrity(),
      v2SystemHealth: await this.checkV2SystemHealth(),
      performanceBaseline: await this.checkPerformanceBaseline()
    };

    const healthScore = Object.values(checks).filter(Boolean).length / Object.keys(checks).length;
    
    return {
      overall: healthScore >= 0.8 ? 'healthy' : healthScore >= 0.6 ? 'degraded' : 'unhealthy',
      score: healthScore,
      checks
    };
  }

  private checkIndexedDBAvailability(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private async checkCacheIntegrity(): Promise<boolean> {
    try {
      // Use V2 system for cache integrity check
      const migrationAdapter = (window as any).migrationAdapter;
      if (migrationAdapter) {
        const metrics = await migrationAdapter.getMetrics();
        return metrics.totalRequests >= 0 && metrics.cacheHits >= 0;
      }
      return true; // Default to true if adapter not available
    } catch {
      return false;
    }
  }

  private async checkV2SystemHealth(): Promise<boolean> {
    try {
      // Use V2 system for health check
      const indexedDBBridgeV2 = (window as any).indexedDBBridgeV2;
      if (indexedDBBridgeV2) {
        const health = await indexedDBBridgeV2.checkHealth();
        return health.status !== 'unhealthy';
      }
      return true; // Default to true if V2 not available yet
    } catch {
      return false;
    }
  }

  private async checkPerformanceBaseline(): Promise<boolean> {
    try {
      const start = performance.now();
      const migrationAdapter = (window as any).migrationAdapter;
      if (migrationAdapter) {
        await migrationAdapter.getMetrics();
      }
      const duration = performance.now() - start;
      return duration < 100; // Less than 100ms
    } catch {
      return false;
    }
  }
}

// Global Safety Interface
export const safetySystem = {
  rollback: EmergencyRollback.getInstance(),
  monitor: new MigrationPerformanceMonitor(),
  healthChecker: new SystemHealthChecker(),
  
  async emergencyStop(): Promise<void> {
    console.error('🛑 [SafetySystem] EMERGENCY STOP INITIATED');
    await this.rollback.forceLegacyMode('emergency_stop');
  },

  async validateMigration(): Promise<boolean> {
    const health = await this.healthChecker.performHealthCheck();
    const performance = this.monitor.getPerformanceComparison();
    
    const isHealthy = health.overall !== 'unhealthy';
    const isPerformant = performance.improvement.responseTime >= -20; // No more than 20% slower
    
    if (!isHealthy || !isPerformant) {
      console.warn('⚠️ [SafetySystem] Migration validation failed', { health, performance });
      return false;
    }
    
    return true;
  }
};

// Setup global interface
if (typeof window !== 'undefined') {
  (window as any).safetySystem = safetySystem;
  
  // Check for active rollback on startup
  const rollbackStatus = safetySystem.rollback.getRollbackStatus();
  if (rollbackStatus.active) {
    console.warn('🚨 [SafetySystem] Active rollback detected!', rollbackStatus);
  }
} 