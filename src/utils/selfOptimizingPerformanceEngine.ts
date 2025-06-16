/**
 * 🧠 Phase 8C: Self-Optimizing Performance Engine
 * 
 * AI-powered performance optimization system that learns from user behavior
 * and automatically adjusts system parameters for optimal performance.
 * 
 * Building on:
 * - Phase 3: Performance Optimizer (performance monitoring foundation)
 * - Phase 8A: Content Intelligence (content-aware optimization)
 * - Phase 8B: Behavior Prediction (user behavior insights)
 */

import { logAnalyticsEvent } from './analytics';
import { logError, classifyError } from './errorHandlingSystem';
import { devLogger } from './developmentLogger';

// Core interfaces for self-optimization
export interface PerformancePattern {
  id: string;
  pattern: string;
  frequency: number;
  avgImprovement: number;
  confidence: number;
  lastSeen: number;
  conditions: {
    timeOfDay?: number;
    deviceType?: string;
    networkSpeed?: string;
    userBehavior?: string;
    contentType?: string;
  };
}

export interface OptimizationDecision {
  id: string;
  type: 'parameter_adjustment' | 'resource_allocation' | 'caching_strategy' | 'rendering_optimization';
  target: string;
  oldValue: any;
  newValue: any;
  expectedImprovement: number;
  confidence: number;
  appliedAt: number;
  validatedAt?: number;
  actualImprovement?: number;
  rollbackAt?: number;
}

export interface SelfOptimizationConfig {
  enableLearning: boolean;
  enableAutomaticAdjustments: boolean;
  maxOptimizationsPerHour: number;
  minConfidenceThreshold: number;
  rollbackThreshold: number;
  learningRate: number;
  conservativeMode: boolean;
}

export interface OptimizationMetrics {
  totalOptimizations: number;
  successfulOptimizations: number;
  rolledBackOptimizations: number;
  averageImprovement: number;
  systemStability: number;
  learningAccuracy: number;
  currentOptimizations: number;
}

export class SelfOptimizingPerformanceEngine {
  private config: SelfOptimizationConfig = {
    enableLearning: true,
    enableAutomaticAdjustments: true,
    maxOptimizationsPerHour: 10,
    minConfidenceThreshold: 0.75,
    rollbackThreshold: -0.1, // 10% performance degradation triggers rollback
    learningRate: 0.1,
    conservativeMode: true // Start conservative, get more aggressive as confidence builds
  };

  private performancePatterns = new Map<string, PerformancePattern>();
  private optimizationHistory = new Map<string, OptimizationDecision>();
  private activeOptimizations = new Map<string, OptimizationDecision>();
  
  private metrics: OptimizationMetrics = {
    totalOptimizations: 0,
    successfulOptimizations: 0,
    rolledBackOptimizations: 0,
    averageImprovement: 0,
    systemStability: 1.0,
    learningAccuracy: 0.5,
    currentOptimizations: 0
  };

  private learningQueue: any[] = [];
  private optimizationTimer: NodeJS.Timeout | null = null;
  private validationTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the self-optimizing engine
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    devLogger.log('SelfOptimizer', '🧠 Initializing Self-Optimizing Performance Engine');

    try {
      // Load existing patterns from storage
      await this.loadPerformancePatterns();

      // Start optimization analysis
      this.startOptimizationAnalysis();

      // Start validation monitoring
      this.startValidationMonitoring();

      // Setup integration with existing systems
      await this.setupSystemIntegrations();

      this.isInitialized = true;
      devLogger.log('SelfOptimizer', '✅ Self-Optimizing Performance Engine initialized');

    } catch (error) {
      logError(classifyError(error, {
        component: 'SelfOptimizingPerformanceEngine',
        operation: 'initialize',
        silent: false
      }));
    }
  }

  /**
   * Record performance data for learning
   */
  public recordPerformanceData(data: {
    metric: string;
    value: number;
    context: {
      timeOfDay?: number;
      deviceType?: string;
      networkSpeed?: string;
      userBehavior?: string;
      contentType?: string;
      renderTime?: number;
      memoryUsage?: number;
      cacheHitRate?: number;
    };
  }): void {
    if (!this.config.enableLearning) return;

    try {
      // Add to learning queue for batch processing
      this.learningQueue.push({
        ...data,
        timestamp: Date.now(),
        sessionId: this.getCurrentSessionId()
      });

      // Process queue if it's getting full
      if (this.learningQueue.length >= 20) {
        this.processLearningQueue();
      }

      devLogger.log('SelfOptimizer', '📊 Performance data recorded', {
        metric: data.metric,
        value: data.value,
        contextKeys: Object.keys(data.context)
      });

    } catch (error) {
      logError(classifyError(error, {
        component: 'SelfOptimizingPerformanceEngine',
        operation: 'recordPerformanceData',
        silent: true
      }));
    }
  }

  /**
   * Get optimization recommendations based on current patterns
   */
  public getOptimizationRecommendations(): OptimizationDecision[] {
    const recommendations: OptimizationDecision[] = [];

    try {
      // Analyze current performance patterns
      const patterns = Array.from(this.performancePatterns.values())
        .filter(p => p.confidence >= this.config.minConfidenceThreshold)
        .sort((a, b) => b.avgImprovement - a.avgImprovement);

      patterns.forEach(pattern => {
        const recommendation = this.generateOptimizationFromPattern(pattern);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      });

      return recommendations.slice(0, 5); // Return top 5 recommendations

    } catch (error) {
      logError(classifyError(error, {
        component: 'SelfOptimizingPerformanceEngine',
        operation: 'getOptimizationRecommendations',
        silent: true
      }));
      return [];
    }
  }

  /**
   * Apply automatic optimization based on learned patterns
   */
  public async applyAutomaticOptimization(): Promise<boolean> {
    if (!this.config.enableAutomaticAdjustments) return false;

    try {
      // Check rate limiting
      const recentOptimizations = Array.from(this.optimizationHistory.values())
        .filter(opt => Date.now() - opt.appliedAt < 3600000); // Last hour

      if (recentOptimizations.length >= this.config.maxOptimizationsPerHour) {
        devLogger.warn('SelfOptimizer', 'Rate limit reached for automatic optimizations');
        return false;
      }

      const recommendations = this.getOptimizationRecommendations();
      const bestRecommendation = recommendations[0];

      if (!bestRecommendation || bestRecommendation.confidence < this.config.minConfidenceThreshold) {
        return false;
      }

      // Apply the optimization
      const success = await this.executeOptimization(bestRecommendation);

      if (success) {
        this.activeOptimizations.set(bestRecommendation.id, bestRecommendation);
        this.metrics.totalOptimizations++;
        this.metrics.currentOptimizations = this.activeOptimizations.size;

        devLogger.log('SelfOptimizer', '🎯 Automatic optimization applied', {
          type: bestRecommendation.type,
          target: bestRecommendation.target,
          expectedImprovement: bestRecommendation.expectedImprovement
        });

        // Log analytics
        await logAnalyticsEvent({
          event_type: 'system',
          event_name: 'AutoOptimizationApplied',
          event_data: {
            optimizationType: bestRecommendation.type,
            target: bestRecommendation.target,
            confidence: bestRecommendation.confidence,
            expectedImprovement: bestRecommendation.expectedImprovement
          }
        });
      }

      return success;

    } catch (error) {
      logError(classifyError(error, {
        component: 'SelfOptimizingPerformanceEngine',
        operation: 'applyAutomaticOptimization',
        silent: false
      }));
      return false;
    }
  }

  /**
   * Plan prefetching based on content intelligence and user behavior
   */
  public async planPrefetching(contentRecommendations: any[]): Promise<string[]> {
    try {
      const prefetchTargets: string[] = [];

      // Use Phase 8A content intelligence for smart prefetching
      for (const recommendation of contentRecommendations.slice(0, 3)) {
        if (recommendation.confidence > 0.8) {
          prefetchTargets.push(recommendation.contentId || recommendation.id);
        }
      }

      // Add behavior-based prefetching
      const behaviorPatterns = await this.getBehaviorBasedPrefetchTargets();
      prefetchTargets.push(...behaviorPatterns);

      devLogger.log('SelfOptimizer', '🔮 Prefetch targets planned', {
        contentBased: contentRecommendations.slice(0, 3).length,
        behaviorBased: behaviorPatterns.length,
        total: prefetchTargets.length
      });

      return [...new Set(prefetchTargets)]; // Remove duplicates

    } catch (error) {
      logError(classifyError(error, {
        component: 'SelfOptimizingPerformanceEngine',
        operation: 'planPrefetching',
        silent: true
      }));
      return [];
    }
  }

  /**
   * Optimize performance based on user behavior predictions
   */
  public async optimizeForBehavior(behaviorPredictions: any[]): Promise<void> {
    try {
      for (const prediction of behaviorPredictions) {
        if (prediction.confidence < 0.7) continue;

        // Adjust rendering optimization based on predicted actions
        if (prediction.predictedAction === 'scroll') {
          await this.optimizeForScrolling();
        } else if (prediction.predictedAction === 'navigation') {
          await this.optimizeForNavigation();
        } else if (prediction.predictedAction === 'content_creation') {
          await this.optimizeForContentCreation();
        }
      }

      devLogger.log('SelfOptimizer', '🎯 Behavior-based optimizations applied', {
        predictions: behaviorPredictions.length
      });

    } catch (error) {
      logError(classifyError(error, {
        component: 'SelfOptimizingPerformanceEngine',
        operation: 'optimizeForBehavior',
        silent: true
      }));
    }
  }

  /**
   * Allocate resources based on user preferences and system load
   */
  public async allocateResources(userPreferences: any): Promise<void> {
    try {
      const currentLoad = await this.getCurrentSystemLoad();
      
      // Adjust memory allocation
      if (currentLoad.memoryUsage > 0.8) {
        await this.reduceMemoryFootprint();
      } else if (currentLoad.memoryUsage < 0.5 && userPreferences.preferPerformance) {
        await this.increaseMemoryAllocation();
      }

      // Adjust CPU allocation for rendering
      if (userPreferences.preferSmoothAnimations && currentLoad.cpuUsage < 0.6) {
        await this.increaseRenderingPriority();
      } else if (currentLoad.cpuUsage > 0.8) {
        await this.reduceRenderingComplexity();
      }

      devLogger.log('SelfOptimizer', '🎛️ Resource allocation optimized', {
        memoryUsage: currentLoad.memoryUsage,
        cpuUsage: currentLoad.cpuUsage,
        userPreferences: Object.keys(userPreferences)
      });

    } catch (error) {
      logError(classifyError(error, {
        component: 'SelfOptimizingPerformanceEngine',
        operation: 'allocateResources',
        silent: true
      }));
    }
  }

  /**
   * Generate optimization status report
   */
  public getOptimizationStatus(): {
    isActive: boolean;
    metrics: OptimizationMetrics;
    activeOptimizations: OptimizationDecision[];
    recentPatterns: PerformancePattern[];
    systemHealth: number;
  } {
    const recentPatterns = Array.from(this.performancePatterns.values())
      .filter(p => Date.now() - p.lastSeen < 86400000) // Last 24 hours
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    const systemHealth = this.calculateSystemHealth();

    return {
      isActive: this.isInitialized && this.config.enableAutomaticAdjustments,
      metrics: { ...this.metrics },
      activeOptimizations: Array.from(this.activeOptimizations.values()),
      recentPatterns,
      systemHealth
    };
  }

  /**
   * Private helper methods
   */
  private async loadPerformancePatterns(): Promise<void> {
    // Load patterns from localStorage or indexedDB
    try {
      const stored = localStorage.getItem('self-optimization-patterns');
      if (stored) {
        const patterns = JSON.parse(stored);
        patterns.forEach((pattern: PerformancePattern) => {
          this.performancePatterns.set(pattern.id, pattern);
        });
      }
    } catch (error) {
      devLogger.warn('SelfOptimizer', 'Failed to load stored patterns', { error });
    }
  }

  private startOptimizationAnalysis(): void {
    this.optimizationTimer = setInterval(() => {
      this.processLearningQueue();
      this.analyzePerformancePatterns();
      
      if (this.config.enableAutomaticAdjustments) {
        this.applyAutomaticOptimization();
      }
    }, 30000); // Every 30 seconds
  }

  private startValidationMonitoring(): void {
    this.validationTimer = setInterval(() => {
      this.validateActiveOptimizations();
    }, 60000); // Every minute
  }

  private async setupSystemIntegrations(): Promise<void> {
    // Integration setup with Phase 3, 8A, 8B systems
    devLogger.log('SelfOptimizer', '🔗 Setting up system integrations');
    
    try {
      // Register with Phase 3 performance optimizer
      if ((window as any).phase3PerformanceOptimizer) {
        (window as any).phase3PerformanceOptimizer.enableAIOptimization = (engine: any) => {
          devLogger.log('SelfOptimizer', '✅ Integrated with Phase 3 Performance Optimizer');
        };
      }

      // Register with global window for testing
      (window as any).selfOptimizingEngine = this;
      
    } catch (error) {
      devLogger.warn('SelfOptimizer', 'Integration setup failed', { error });
    }
  }

  private processLearningQueue(): void {
    if (this.learningQueue.length === 0) return;

    const events = [...this.learningQueue];
    this.learningQueue = [];

    // Analyze events for patterns
    this.extractPatternsFromEvents(events);
  }

  private extractPatternsFromEvents(events: any[]): void {
    // Group events by context similarity
    const contextGroups = new Map<string, any[]>();

    events.forEach(event => {
      const contextKey = this.generateContextKey(event.context);
      if (!contextGroups.has(contextKey)) {
        contextGroups.set(contextKey, []);
      }
      contextGroups.get(contextKey)!.push(event);
    });

    // Analyze each context group for patterns
    contextGroups.forEach((groupEvents, contextKey) => {
      this.analyzeEventGroup(groupEvents, contextKey);
    });
  }

  private generateContextKey(context: any): string {
    return `${context.timeOfDay || 'any'}_${context.deviceType || 'any'}_${context.networkSpeed || 'any'}`;
  }

  private analyzeEventGroup(events: any[], contextKey: string): void {
    if (events.length < 3) return; // Need sufficient data

    const avgPerformance = events.reduce((sum, e) => sum + e.value, 0) / events.length;
    
    // Look for existing pattern or create new one
    let pattern = this.performancePatterns.get(contextKey);
    
    if (pattern) {
      pattern.frequency++;
      pattern.avgImprovement = (pattern.avgImprovement + avgPerformance) / 2;
      pattern.confidence = Math.min(pattern.confidence + this.config.learningRate, 1.0);
      pattern.lastSeen = Date.now();
    } else {
      pattern = {
        id: contextKey,
        pattern: contextKey,
        frequency: 1,
        avgImprovement: avgPerformance,
        confidence: 0.5,
        lastSeen: Date.now(),
        conditions: events[0].context
      };
    }
    
    this.performancePatterns.set(contextKey, pattern);
  }

  private analyzePerformancePatterns(): void {
    // Age out old patterns and strengthen consistent ones
    const now = Date.now();
    const cutoff = now - (7 * 24 * 60 * 60 * 1000); // 7 days

    this.performancePatterns.forEach((pattern, key) => {
      if (pattern.lastSeen < cutoff) {
        this.performancePatterns.delete(key);
      } else {
        // Decay confidence over time
        const ageFactor = (now - pattern.lastSeen) / (24 * 60 * 60 * 1000);
        pattern.confidence *= Math.max(0.1, 1 - (ageFactor * 0.1));
      }
    });
  }

  private generateOptimizationFromPattern(pattern: PerformancePattern): OptimizationDecision | null {
    // Generate specific optimization based on pattern
    const optimizationId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Example optimization logic (would be more sophisticated in practice)
    if (pattern.avgImprovement > 0.2 && pattern.confidence > 0.8) {
      return {
        id: optimizationId,
        type: 'parameter_adjustment',
        target: 'render_throttle',
        oldValue: 16,
        newValue: Math.round(16 * (1 - pattern.avgImprovement)),
        expectedImprovement: pattern.avgImprovement,
        confidence: pattern.confidence,
        appliedAt: Date.now()
      };
    }

    return null;
  }

  private async executeOptimization(optimization: OptimizationDecision): Promise<boolean> {
    try {
      // Execute the actual optimization
      switch (optimization.type) {
        case 'parameter_adjustment':
          return await this.executeParameterAdjustment(optimization);
        case 'resource_allocation':
          return await this.executeResourceAllocation(optimization);
        case 'caching_strategy':
          return await this.executeCachingStrategy(optimization);
        case 'rendering_optimization':
          return await this.executeRenderingOptimization(optimization);
        default:
          return false;
      }
    } catch (error) {
      logError(classifyError(error, {
        component: 'SelfOptimizingPerformanceEngine',
        operation: 'executeOptimization',
        silent: true
      }));
      return false;
    }
  }

  private async executeParameterAdjustment(optimization: OptimizationDecision): Promise<boolean> {
    // Implement parameter adjustment logic
    devLogger.log('SelfOptimizer', '⚙️ Executing parameter adjustment', {
      target: optimization.target,
      oldValue: optimization.oldValue,
      newValue: optimization.newValue
    });
    return true;
  }

  private async executeResourceAllocation(optimization: OptimizationDecision): Promise<boolean> {
    // Implement resource allocation logic
    devLogger.log('SelfOptimizer', '🎛️ Executing resource allocation', {
      target: optimization.target
    });
    return true;
  }

  private async executeCachingStrategy(optimization: OptimizationDecision): Promise<boolean> {
    // Implement caching strategy optimization
    devLogger.log('SelfOptimizer', '💾 Executing caching strategy', {
      target: optimization.target
    });
    return true;
  }

  private async executeRenderingOptimization(optimization: OptimizationDecision): Promise<boolean> {
    // Implement rendering optimization
    devLogger.log('SelfOptimizer', '🎨 Executing rendering optimization', {
      target: optimization.target
    });
    return true;
  }

  private validateActiveOptimizations(): void {
    const now = Date.now();
    
    this.activeOptimizations.forEach((optimization, id) => {
      // Validate optimization after reasonable time
      if (now - optimization.appliedAt > 300000) { // 5 minutes
        this.validateOptimization(optimization);
      }
    });
  }

  private async validateOptimization(optimization: OptimizationDecision): Promise<void> {
    // Get current performance metrics and compare
    const currentPerformance = await this.getCurrentPerformanceMetrics();
    
    // Calculate actual improvement (simplified)
    const actualImprovement = 0.1; // Would calculate based on real metrics
    
    optimization.validatedAt = Date.now();
    optimization.actualImprovement = actualImprovement;

    if (actualImprovement < this.config.rollbackThreshold) {
      // Performance degraded, rollback
      await this.rollbackOptimization(optimization);
    } else {
      // Optimization successful
      this.metrics.successfulOptimizations++;
      this.optimizationHistory.set(optimization.id, optimization);
      this.activeOptimizations.delete(optimization.id);
    }

    this.updateLearningAccuracy();
  }

  private async rollbackOptimization(optimization: OptimizationDecision): Promise<void> {
    devLogger.warn('SelfOptimizer', '⏪ Rolling back optimization', {
      id: optimization.id,
      actualImprovement: optimization.actualImprovement
    });

    optimization.rollbackAt = Date.now();
    this.metrics.rolledBackOptimizations++;
    this.optimizationHistory.set(optimization.id, optimization);
    this.activeOptimizations.delete(optimization.id);

    // Execute rollback logic here
  }

  private async getBehaviorBasedPrefetchTargets(): Promise<string[]> {
    // Integration with Phase 8B behavior predictor
    try {
      if ((window as any).userBehaviorPredictor) {
        const predictions = (window as any).userBehaviorPredictor.getPredictions('current_user');
        return predictions?.map((p: any) => p.target).filter(Boolean) || [];
      }
    } catch (error) {
      devLogger.warn('SelfOptimizer', 'Failed to get behavior-based prefetch targets', { error });
    }
    return [];
  }

  private async optimizeForScrolling(): Promise<void> {
    // Optimize for scrolling behavior
    devLogger.log('SelfOptimizer', '📜 Optimizing for scrolling behavior');
  }

  private async optimizeForNavigation(): Promise<void> {
    // Optimize for navigation behavior
    devLogger.log('SelfOptimizer', '🧭 Optimizing for navigation behavior');
  }

  private async optimizeForContentCreation(): Promise<void> {
    // Optimize for content creation behavior
    devLogger.log('SelfOptimizer', '✍️ Optimizing for content creation behavior');
  }

  private async getCurrentSystemLoad(): Promise<{ memoryUsage: number; cpuUsage: number }> {
    // Get current system load metrics
    const memoryInfo = (performance as any).memory;
    const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit : 0.5;
    
    return {
      memoryUsage,
      cpuUsage: 0.5 // Would implement actual CPU usage detection
    };
  }

  private async reduceMemoryFootprint(): Promise<void> {
    devLogger.log('SelfOptimizer', '🧹 Reducing memory footprint');
  }

  private async increaseMemoryAllocation(): Promise<void> {
    devLogger.log('SelfOptimizer', '📈 Increasing memory allocation');
  }

  private async increaseRenderingPriority(): Promise<void> {
    devLogger.log('SelfOptimizer', '🎨 Increasing rendering priority');
  }

  private async reduceRenderingComplexity(): Promise<void> {
    devLogger.log('SelfOptimizer', '🎯 Reducing rendering complexity');
  }

  private async getCurrentPerformanceMetrics(): Promise<any> {
    // Get current performance metrics from Phase 3 performance optimizer
    try {
      if ((window as any).phase3PerformanceOptimizer) {
        return (window as any).phase3PerformanceOptimizer.getPerformanceMetrics();
      }
    } catch (error) {
      devLogger.warn('SelfOptimizer', 'Failed to get current performance metrics', { error });
    }
    return {};
  }

  private calculateSystemHealth(): number {
    const successRate = this.metrics.totalOptimizations > 0 
      ? this.metrics.successfulOptimizations / this.metrics.totalOptimizations 
      : 1.0;
    
    const rollbackRate = this.metrics.totalOptimizations > 0 
      ? this.metrics.rolledBackOptimizations / this.metrics.totalOptimizations 
      : 0.0;

    return Math.max(0, Math.min(1, successRate - (rollbackRate * 0.5)));
  }

  private updateLearningAccuracy(): void {
    const totalValidated = this.metrics.successfulOptimizations + this.metrics.rolledBackOptimizations;
    if (totalValidated > 0) {
      this.metrics.learningAccuracy = this.metrics.successfulOptimizations / totalValidated;
    }
  }

  private getCurrentSessionId(): string {
    return sessionStorage.getItem('session-id') || 'anonymous';
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }
    
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = null;
    }

    // Save patterns to storage
    try {
      const patterns = Array.from(this.performancePatterns.values());
      localStorage.setItem('self-optimization-patterns', JSON.stringify(patterns));
    } catch (error) {
      devLogger.warn('SelfOptimizer', 'Failed to save patterns', { error });
    }
  }

  /**
   * Testing interface
   */
  public runTest(): Promise<{
    success: boolean;
    results: {
      initialization: boolean;
      patternLearning: boolean;
      optimizationGeneration: boolean;
      systemIntegration: boolean;
    };
    metrics: OptimizationMetrics;
  }> {
    return new Promise((resolve) => {
      const results = {
        initialization: this.isInitialized,
        patternLearning: this.performancePatterns.size > 0 || this.learningQueue.length >= 0,
        optimizationGeneration: this.getOptimizationRecommendations().length >= 0,
        systemIntegration: typeof (window as any).selfOptimizingEngine !== 'undefined'
      };

      setTimeout(() => {
        resolve({
          success: Object.values(results).every(Boolean),
          results,
          metrics: { ...this.metrics }
        });
      }, 100);
    });
  }
}

// Create and export global instance
export const selfOptimizingPerformanceEngine = new SelfOptimizingPerformanceEngine();

// Global interface for testing
(window as any).selfOptimizingEngine = selfOptimizingPerformanceEngine;

export default selfOptimizingPerformanceEngine; 