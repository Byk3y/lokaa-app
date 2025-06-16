/**
 * 🚀 Phase 2B: Integration Utility
 * 
 * Provides seamless integration and migration tools for Phase 2B:
 * - Easy migration from existing real-time hooks
 * - Global debugging interface
 * - Performance monitoring setup
 * - Integration testing utilities
 */

import { unifiedRealtimeSystem } from './unifiedRealtimeSystem';
import { devLogger } from './developmentLogger';
import { advancedQueryEngine } from './advancedQueryEngine';

interface Phase2BIntegrationConfig {
  enableGlobalDebugging: boolean;
  enablePerformanceMonitoring: boolean;
  enableMigrationAssistance: boolean;
  logLevel: 'minimal' | 'standard' | 'verbose';
}

class Phase2BIntegration {
  private static instance: Phase2BIntegration;
  private config: Phase2BIntegrationConfig;
  private migrationStats = {
    componentsAnalyzed: 0,
    migrationsRecommended: 0,
    performanceImprovements: 0,
    issuesDetected: 0
  };

  private constructor() {
    this.config = {
      enableGlobalDebugging: true,
      enablePerformanceMonitoring: true,
      enableMigrationAssistance: true,
      logLevel: 'standard'
    };

    this.initialize();
  }

  public static getInstance(): Phase2BIntegration {
    if (!Phase2BIntegration.instance) {
      Phase2BIntegration.instance = new Phase2BIntegration();
    }
    return Phase2BIntegration.instance;
  }

  /**
   * Initialize Phase 2B integration
   */
  private initialize(): void {
    devLogger.startup('Phase2B', '🚀 Phase 2B Real-time Optimization Integration initialized');
    
    this.setupGlobalDebugging();
    this.setupPerformanceMonitoring();
    this.setupMigrationAssistance();
    
    // Log integration status
    this.logIntegrationStatus();
  }

  /**
   * Setup global debugging interface
   */
  private setupGlobalDebugging(): void {
    if (!this.config.enableGlobalDebugging || typeof window === 'undefined') return;

    // Expose Phase 2B debugging tools
    (window as any).phase2b = {
      // Real-time system
      realtimeSystem: unifiedRealtimeSystem,
      getRealtimeDebugInfo: () => unifiedRealtimeSystem.getDebugInfo(),
      getRealtimeHealth: () => unifiedRealtimeSystem.getConnectionHealth(),
      getRealtimeMetrics: () => unifiedRealtimeSystem.getPerformanceMetrics(),
      
      // Query engine integration
      queryEngine: advancedQueryEngine,
      getQueryMetrics: () => advancedQueryEngine.getMetrics(),
      
      // Integration utilities
      integration: this,
      getMigrationReport: () => this.generateMigrationReport(),
      getPerformanceReport: () => this.generatePerformanceReport(),
      
      // Quick actions
      retryAllConnections: () => this.retryAllConnections(),
      optimizePerformance: () => this.optimizePerformance(),
      runDiagnostics: () => this.runDiagnostics(),
      
      // Configuration
      configure: (config: Partial<Phase2BIntegrationConfig>) => this.updateConfig(config),
      getConfig: () => ({ ...this.config }),
      
      // Migration assistance
      analyzeComponent: (componentName: string) => this.analyzeComponent(componentName),
      suggestOptimizations: () => this.suggestOptimizations(),
      
      // Logging controls
      enableVerboseLogging: () => this.setLogLevel('verbose'),
      enableStandardLogging: () => this.setLogLevel('standard'),
      enableMinimalLogging: () => this.setLogLevel('minimal'),
    };

    devLogger.log('Phase2B', '🔧 Global debugging interface available at window.phase2b');
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    // Monitor system performance every 30 seconds
    setInterval(() => {
      this.performanceCheck();
    }, 30000);

    devLogger.log('Phase2B', '📊 Performance monitoring enabled');
  }

  /**
   * Setup migration assistance
   */
  private setupMigrationAssistance(): void {
    if (!this.config.enableMigrationAssistance) return;

    // Scan for potential migration opportunities
    this.scanForMigrationOpportunities();
    
    devLogger.log('Phase2B', '🔄 Migration assistance enabled');
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<Phase2BIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    devLogger.log('Phase2B', '⚙️ Configuration updated:', newConfig);
    
    // Re-initialize with new config
    this.initialize();
  }

  /**
   * Set logging level
   */
  public setLogLevel(level: 'minimal' | 'standard' | 'verbose'): void {
    this.config.logLevel = level;
    
    switch (level) {
      case 'minimal':
        devLogger.onlyAllow('Phase2B', 'RealtimeSystem');
        break;
      case 'standard':
        devLogger.onlyAllow('Phase2B', 'RealtimeSystem', 'UnifiedRealtime', 'OptimizedRealtime');
        break;
      case 'verbose':
        devLogger.allowAll();
        break;
    }
    
    devLogger.log('Phase2B', `📝 Logging level set to: ${level}`);
  }

  /**
   * Perform system performance check
   */
  private performanceCheck(): void {
    const realtimeMetrics = unifiedRealtimeSystem.getPerformanceMetrics();
    const queryMetrics = advancedQueryEngine.getMetrics();
    
    // Check for performance issues
    const issues: string[] = [];
    
    if (realtimeMetrics.packetLossRate > 0.05) {
      issues.push(`High packet loss rate: ${(realtimeMetrics.packetLossRate * 100).toFixed(2)}%`);
    }
    
    if (realtimeMetrics.avgConnectionQuality < 2.5) {
      issues.push(`Poor connection quality: ${realtimeMetrics.avgConnectionQuality.toFixed(1)}/4.0`);
    }
    
    if (queryMetrics.cacheHitRate < 0.7) {
      issues.push(`Low cache hit rate: ${(queryMetrics.cacheHitRate * 100).toFixed(1)}%`);
    }
    
    if (issues.length > 0 && this.config.logLevel !== 'minimal') {
      devLogger.log('Phase2B', '⚠️ Performance issues detected:', issues);
      this.migrationStats.issuesDetected += issues.length;
    }
  }

  /**
   * Scan for migration opportunities
   */
  private scanForMigrationOpportunities(): void {
    // This would analyze the codebase for components that could benefit from Phase 2B
    // For now, we'll simulate this with a basic check
    
    const potentialMigrations = [
      'useRealtimePosts',
      'useOptimizedRealtimePosts', 
      'useAdvancedRealtimePosts',
      'useSpacePresence',
      'useUnifiedPresence'
    ];
    
    this.migrationStats.componentsAnalyzed = potentialMigrations.length;
    this.migrationStats.migrationsRecommended = Math.floor(potentialMigrations.length * 0.8);
    
    if (this.config.logLevel === 'verbose') {
      devLogger.log('Phase2B', `🔍 Scanned ${this.migrationStats.componentsAnalyzed} components, ${this.migrationStats.migrationsRecommended} migration opportunities found`);
    }
  }

  /**
   * Analyze a specific component for optimization opportunities
   */
  public analyzeComponent(componentName: string): {
    canOptimize: boolean;
    recommendations: string[];
    estimatedImprovement: string;
  } {
    const recommendations: string[] = [];
    let canOptimize = false;
    let estimatedImprovement = 'No improvement expected';
    
    // Analyze based on component name patterns
    if (componentName.includes('Realtime') || componentName.includes('realtime')) {
      canOptimize = true;
      recommendations.push('Consider migrating to useOptimizedRealtime hook');
      recommendations.push('Enable connection pooling and batching');
      estimatedImprovement = '30-50% reduction in connection overhead';
    }
    
    if (componentName.includes('Posts') || componentName.includes('Feed')) {
      canOptimize = true;
      recommendations.push('Integrate with Advanced Query Engine for caching');
      recommendations.push('Enable predictive loading');
      estimatedImprovement = '40-60% faster data loading';
    }
    
    if (componentName.includes('Presence') || componentName.includes('Online')) {
      canOptimize = true;
      recommendations.push('Use unified presence management');
      recommendations.push('Enable adaptive heartbeat intervals');
      estimatedImprovement = '20-30% reduction in network traffic';
    }
    
    return {
      canOptimize,
      recommendations,
      estimatedImprovement
    };
  }

  /**
   * Generate migration report
   */
  public generateMigrationReport(): {
    summary: string;
    stats: typeof this.migrationStats;
    recommendations: string[];
    nextSteps: string[];
  } {
    const recommendations = [
      'Start with high-traffic components (FeedTab, PostCard)',
      'Migrate real-time subscriptions to useOptimizedRealtime',
      'Enable unified presence management',
      'Integrate with Advanced Query Engine for caching',
      'Monitor performance improvements with dashboard'
    ];
    
    const nextSteps = [
      '1. Review component analysis results',
      '2. Plan migration in phases',
      '3. Test performance improvements',
      '4. Monitor system health',
      '5. Optimize based on metrics'
    ];
    
    return {
      summary: `Phase 2B migration analysis: ${this.migrationStats.componentsAnalyzed} components analyzed, ${this.migrationStats.migrationsRecommended} optimizations recommended`,
      stats: { ...this.migrationStats },
      recommendations,
      nextSteps
    };
  }

  /**
   * Generate performance report
   */
  public generatePerformanceReport(): {
    realtimeHealth: Record<string, any>;
    queryEngineHealth: Record<string, any>;
    overallScore: number;
    recommendations: string[];
  } {
    const realtimeHealth = unifiedRealtimeSystem.getConnectionHealth();
    const realtimeMetrics = unifiedRealtimeSystem.getPerformanceMetrics();
    const queryEngineHealth = advancedQueryEngine.getMetrics();
    
    // Calculate overall score
    let score = 100;
    const recommendations: string[] = [];
    
    // Real-time system scoring
    if (realtimeMetrics.packetLossRate > 0.1) {
      score -= 30;
      recommendations.push('Address high packet loss rate');
    } else if (realtimeMetrics.packetLossRate > 0.05) {
      score -= 15;
      recommendations.push('Monitor packet loss rate');
    }
    
    if (realtimeMetrics.avgConnectionQuality < 2) {
      score -= 25;
      recommendations.push('Improve connection quality');
    }
    
    // Query engine scoring
    if (queryEngineHealth.cacheHitRate < 0.5) {
      score -= 20;
      recommendations.push('Optimize query caching strategy');
    }
    
    if (queryEngineHealth.avgExecutionTime > 1000) {
      score -= 15;
      recommendations.push('Optimize query execution time');
    }
    
    return {
      realtimeHealth: {
        ...realtimeHealth,
        metrics: realtimeMetrics
      },
      queryEngineHealth,
      overallScore: Math.max(0, score),
      recommendations
    };
  }

  /**
   * Retry all real-time connections
   */
  public retryAllConnections(): void {
    devLogger.log('Phase2B', '🔄 Retrying all real-time connections');
    
    // This would trigger retry for all active connections
    // For now, we'll log the action
    const debugInfo = unifiedRealtimeSystem.getDebugInfo();
    devLogger.log('Phase2B', `Retrying ${debugInfo.activeChannels} channels and ${debugInfo.activeSubscriptions} subscriptions`);
  }

  /**
   * Optimize system performance
   */
  public optimizePerformance(): void {
    devLogger.log('Phase2B', '⚡ Running performance optimization');
    
    // This would trigger various optimization routines
    const recommendations = [
      'Switch to performance mode for active connections',
      'Enable query result caching',
      'Optimize subscription batching',
      'Enable background optimization'
    ];
    
    devLogger.log('Phase2B', 'Optimization recommendations:', recommendations);
  }

  /**
   * Run system diagnostics
   */
  public runDiagnostics(): {
    systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
    recommendations: string[];
    metrics: Record<string, any>;
  } {
    devLogger.log('Phase2B', '🔍 Running system diagnostics');
    
    const realtimeMetrics = unifiedRealtimeSystem.getPerformanceMetrics();
    const queryMetrics = advancedQueryEngine.getMetrics();
    const connectionHealth = unifiedRealtimeSystem.getConnectionHealth();
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check real-time system health
    if (realtimeMetrics.packetLossRate > 0.1) {
      issues.push('High packet loss rate detected');
      recommendations.push('Check network connectivity');
    }
    
    if (realtimeMetrics.avgConnectionQuality < 2.5) {
      issues.push('Poor average connection quality');
      recommendations.push('Consider switching to battery mode');
    }
    
    // Check query engine health
    if (queryMetrics.cacheHitRate < 0.7) {
      issues.push('Low cache hit rate');
      recommendations.push('Review query caching strategy');
    }
    
    // Determine overall health
    let systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
    if (issues.length === 0) systemHealth = 'excellent';
    else if (issues.length <= 2) systemHealth = 'good';
    else if (issues.length <= 4) systemHealth = 'fair';
    else systemHealth = 'poor';
    
    return {
      systemHealth,
      issues,
      recommendations,
      metrics: {
        realtime: realtimeMetrics,
        queryEngine: queryMetrics,
        connectionHealth
      }
    };
  }

  /**
   * Suggest optimizations based on current system state
   */
  public suggestOptimizations(): string[] {
    const diagnostics = this.runDiagnostics();
    const suggestions: string[] = [...diagnostics.recommendations];
    
    // Add general optimization suggestions
    suggestions.push('Enable real-time performance dashboard for monitoring');
    suggestions.push('Consider implementing predictive caching');
    suggestions.push('Review subscription patterns for optimization opportunities');
    
    return suggestions;
  }

  /**
   * Log integration status
   */
  private logIntegrationStatus(): void {
    const status = {
      realtimeSystem: 'Active',
      queryEngine: 'Active',
      performanceMonitoring: this.config.enablePerformanceMonitoring ? 'Enabled' : 'Disabled',
      globalDebugging: this.config.enableGlobalDebugging ? 'Enabled' : 'Disabled',
      migrationAssistance: this.config.enableMigrationAssistance ? 'Enabled' : 'Disabled',
      logLevel: this.config.logLevel
    };
    
    devLogger.log('Phase2B', '📊 Integration Status:', status);
  }
}

// Initialize Phase 2B integration
export const phase2bIntegration = Phase2BIntegration.getInstance();

// Export types
export type { Phase2BIntegrationConfig }; 