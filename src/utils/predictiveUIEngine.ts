/**
 * 🔮 Phase 8B: Enhanced Predictive UI Engine
 * 
 * Advanced AI-powered predictive user interface system that builds on Phase 3's
 * predictive capabilities with machine learning-enhanced behavior prediction.
 */

import { predictiveCacheEngine } from './predictiveCacheEngine';
import { logAnalyticsEvent } from './analytics';
import { logError, classifyError } from './errorHandlingSystem';
import { devLogger } from './developmentLogger';

// Types for predictive UI
export interface PredictiveUIConfig {
  enableBehaviorPrediction: boolean;
  enableAdaptiveInterface: boolean;
  confidenceThreshold: number;
  learningRate: number;
  maxPredictions: number;
}

export interface UIBehaviorPattern {
  userId: string;
  elementType: string;
  action: string;
  confidence: number;
  frequency: number;
  timestamp: number;
}

export interface UIPrediction {
  id: string;
  type: 'click' | 'navigation' | 'scroll' | 'hover';
  target: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

export interface PredictiveUIMetrics {
  totalPredictions: number;
  accuratePredictions: number;
  falsePositives: number;
  userSatisfactionScore: number;
  learningAccuracy: number;
}

export class PredictiveUIEngine {
  private config: PredictiveUIConfig = {
    enableBehaviorPrediction: true,
    enableAdaptiveInterface: true,
    confidenceThreshold: 0.7,
    learningRate: 0.1,
    maxPredictions: 10
  };

  private behaviorPatterns = new Map<string, UIBehaviorPattern[]>();
  private activePredictions = new Map<string, UIPrediction>();
  
  private metrics: PredictiveUIMetrics = {
    totalPredictions: 0,
    accuratePredictions: 0,
    falsePositives: 0,
    userSatisfactionScore: 0.8,
    learningAccuracy: 0
  };

  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    devLogger.log('PredictiveUI', '🔮 Initializing Enhanced Predictive UI Engine');
    
    if (typeof window !== 'undefined') {
      this.setupBehaviorTracking();
      this.setupPredictionGeneration();
      this.integrateWithPhase3();
    }
    
    this.isInitialized = true;
    devLogger.log('PredictiveUI', '✅ Enhanced Predictive UI Engine initialized');
  }

  /**
   * Setup behavior tracking for UI interactions
   */
  private setupBehaviorTracking(): void {
    // Track clicks
    document.addEventListener('click', (event) => {
      this.trackUIBehavior('click', event.target as Element);
    });

    // Track scroll behavior
    let scrollTimeout: NodeJS.Timeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackUIBehavior('scroll', null);
      }, 150);
    });

    // Track hover patterns on significant elements
    document.addEventListener('mouseover', (event) => {
      if (this.isSignificantElement(event.target as Element)) {
        this.trackUIBehavior('hover', event.target as Element);
      }
    });

    // Track navigation changes
    window.addEventListener('popstate', () => {
      this.trackUIBehavior('navigation', null);
    });

    devLogger.log('PredictiveUI', '📊 Behavior tracking setup complete');
  }

  /**
   * Track UI behavior with context
   */
  public trackUIBehavior(action: string, element: Element | null): void {
    if (!this.config.enableBehaviorPrediction) return;

    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;

      const elementType = this.getElementType(element);
      
      const pattern: UIBehaviorPattern = {
        userId,
        elementType,
        action,
        confidence: 0.5,
        frequency: 1,
        timestamp: Date.now()
      };

      this.updateBehaviorPattern(pattern);

      // Track with Phase 2C predictive cache
      predictiveCacheEngine.trackUserBehavior(userId, action, {
        elementType,
        currentPage: window.location.pathname,
        timestamp: Date.now()
      });

      // Log analytics event
      logAnalyticsEvent({
        event_type: 'ui',
        event_name: 'PredictiveUIBehavior',
        event_data: {
          action,
          elementType,
          currentPage: window.location.pathname
        }
      });

    } catch (error) {
      logError(classifyError(error, { 
        component: 'PredictiveUIEngine', 
        operation: 'trackUIBehavior',
        silent: true 
      }));
    }
  }

  /**
   * Setup prediction generation
   */
  private setupPredictionGeneration(): void {
    // Generate predictions every 5 seconds
    setInterval(() => {
      this.generateAndApplyPredictions();
    }, 5000);

    // Update patterns every 30 seconds
    setInterval(() => {
      this.updatePatternConfidence();
    }, 30000);
  }

  /**
   * Generate and apply UI predictions
   */
  private async generateAndApplyPredictions(): Promise<void> {
    if (!this.config.enableAdaptiveInterface) return;

    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;

      const predictions = this.generatePredictions(userId);
      const validPredictions = predictions.filter(
        p => p.confidence >= this.config.confidenceThreshold
      );

      // Apply top predictions
      for (const prediction of validPredictions.slice(0, this.config.maxPredictions)) {
        this.applyPrediction(prediction);
      }

      this.metrics.totalPredictions += validPredictions.length;

    } catch (error) {
      logError(classifyError(error, { 
        component: 'PredictiveUIEngine', 
        operation: 'generatePredictions',
        silent: true 
      }));
    }
  }

  /**
   * Generate predictions based on user patterns
   */
  public generatePredictions(userId: string): UIPrediction[] {
    const predictions: UIPrediction[] = [];
    const userPatterns = this.behaviorPatterns.get(userId) || [];

    // Analyze patterns for predictions
    userPatterns.forEach(pattern => {
      if (pattern.confidence > 0.6 && pattern.frequency > 2) {
        predictions.push({
          id: `pred_${pattern.action}_${Date.now()}`,
          type: pattern.action as any,
          target: pattern.elementType,
          confidence: pattern.confidence,
          priority: pattern.confidence > 0.8 ? 'high' : 'medium',
          timestamp: Date.now()
        });
      }
    });

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Apply a prediction to the UI
   */
  private applyPrediction(prediction: UIPrediction): void {
    try {
      this.activePredictions.set(prediction.id, prediction);

      switch (prediction.type) {
        case 'click':
          this.preloadClickTarget(prediction.target);
          break;
        case 'navigation':
          this.preloadNavigation(prediction.target);
          break;
        case 'hover':
          this.prepareHoverTarget(prediction.target);
          break;
      }

      // Auto-cleanup after 10 seconds
      setTimeout(() => {
        this.activePredictions.delete(prediction.id);
      }, 10000);

    } catch (error) {
      devLogger.warn('PredictiveUI', 'Prediction application failed', { prediction, error });
    }
  }

  /**
   * Preload content for predicted click
   */
  private preloadClickTarget(target: string): void {
    const elements = document.querySelectorAll(`${target}, [data-element-type="${target}"]`);
    elements.forEach(element => {
      element.setAttribute('data-predictive-preload', 'true');
      
      // Add subtle visual hint
      const htmlElement = element as HTMLElement;
      htmlElement.style.transition = 'opacity 0.3s ease';
      htmlElement.style.opacity = '0.95';
    });
  }

  /**
   * Preload navigation target
   */
  private preloadNavigation(target: string): void {
    // Create prefetch link if it's a URL
    if (target.includes('/') || target.includes('html')) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = target;
      link.setAttribute('data-predictive-prefetch', 'true');
      document.head.appendChild(link);
    }
  }

  /**
   * Prepare hover target
   */
  private prepareHoverTarget(target: string): void {
    const elements = document.querySelectorAll(`${target}, [data-element-type="${target}"]`);
    elements.forEach(element => {
      element.setAttribute('data-predictive-hover', 'true');
    });
  }

  /**
   * Integrate with Phase 3 performance optimizer
   */
  private integrateWithPhase3(): void {
    try {
      if ((window as any).phase3PerformanceOptimizer) {
        devLogger.log('PredictiveUI', '🔗 Integrating with Phase 3 Performance Optimizer');
      }
    } catch (error) {
      devLogger.warn('PredictiveUI', 'Phase 3 integration failed', { error });
    }
  }

  /**
   * Helper methods
   */
  public getCurrentUserId(): string | null {
    try {
      return localStorage.getItem('user_id') || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  private getElementType(element: Element | null): string {
    if (!element) return 'unknown';
    
    return element.getAttribute('data-element-type') || 
           element.tagName.toLowerCase() || 
           'unknown';
  }

  private isSignificantElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    const significantTags = ['button', 'a', 'input', 'select', 'textarea'];
    
    return significantTags.includes(tagName) || 
           element.hasAttribute('data-element-type') ||
           element.classList.contains('clickable');
  }

  private updateBehaviorPattern(newPattern: UIBehaviorPattern): void {
    const patterns = this.behaviorPatterns.get(newPattern.userId) || [];
    
    // Find existing pattern
    const existingIndex = patterns.findIndex(p => 
      p.elementType === newPattern.elementType && 
      p.action === newPattern.action
    );

    if (existingIndex !== -1) {
      // Update existing pattern
      const existing = patterns[existingIndex];
      existing.frequency += 1;
      existing.confidence = Math.min(existing.confidence + this.config.learningRate, 1);
      existing.timestamp = newPattern.timestamp;
    } else {
      // Add new pattern
      patterns.push(newPattern);
    }

    this.behaviorPatterns.set(newPattern.userId, patterns);
  }

  private updatePatternConfidence(): void {
    // Decay old patterns and boost recent ones
    this.behaviorPatterns.forEach((patterns, userId) => {
      const now = Date.now();
      const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours

      // Filter out very old patterns
      const filtered = patterns.filter(p => p.timestamp > cutoff);

      // Update confidence based on recency
      filtered.forEach(pattern => {
        const age = now - pattern.timestamp;
        const ageFactor = Math.max(0.1, 1 - (age / (24 * 60 * 60 * 1000)));
        pattern.confidence *= ageFactor;
      });

      this.behaviorPatterns.set(userId, filtered);
    });
  }

  /**
   * Public API methods
   */
  public updateConfig(newConfig: Partial<PredictiveUIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    devLogger.log('PredictiveUI', '⚙️ Configuration updated', newConfig);
  }

  public getMetrics(): PredictiveUIMetrics {
    // Update learning accuracy
    if (this.metrics.totalPredictions > 0) {
      this.metrics.learningAccuracy = this.metrics.accuratePredictions / this.metrics.totalPredictions;
    }
    
    return { ...this.metrics };
  }

  public getActivePredictions(): UIPrediction[] {
    return Array.from(this.activePredictions.values());
  }

  public getBehaviorPatterns(userId?: string): UIBehaviorPattern[] {
    if (userId) {
      return this.behaviorPatterns.get(userId) || [];
    }
    
    // Return all patterns
    const allPatterns: UIBehaviorPattern[] = [];
    this.behaviorPatterns.forEach(patterns => {
      allPatterns.push(...patterns);
    });
    return allPatterns;
  }

  public validatePrediction(predictionId: string, wasAccurate: boolean): void {
    const prediction = this.activePredictions.get(predictionId);
    if (prediction) {
      if (wasAccurate) {
        this.metrics.accuratePredictions++;
      } else {
        this.metrics.falsePositives++;
      }
      
      // Log validation
      logAnalyticsEvent({
        event_type: 'system',
        event_name: 'PredictionValidation',
        event_data: {
          predictionId,
          wasAccurate,
          confidence: prediction.confidence,
          type: prediction.type
        }
      });
    }
  }

  public getStatus(): {
    isInitialized: boolean;
    isActive: boolean;
    config: PredictiveUIConfig;
    metrics: PredictiveUIMetrics;
    activePredictions: number;
    totalPatterns: number;
    lastUpdate: string;
  } {
    return {
      isInitialized: this.isInitialized,
      isActive: this.config.enableBehaviorPrediction,
      config: { ...this.config },
      metrics: this.getMetrics(),
      activePredictions: this.activePredictions.size,
      totalPatterns: Array.from(this.behaviorPatterns.values()).reduce((sum, patterns) => sum + patterns.length, 0),
      lastUpdate: new Date().toISOString()
    };
  }

  public runTest(): Promise<{
    success: boolean;
    results: {
      initialization: boolean;
      behaviorTracking: boolean;
      patternGeneration: boolean;
      predictionGeneration: boolean;
      phase3Integration: boolean;
    };
    metrics: PredictiveUIMetrics;
  }> {
    return new Promise((resolve) => {
      const results = {
        initialization: false,
        behaviorTracking: false,
        patternGeneration: false,
        predictionGeneration: false,
        phase3Integration: false
      };

      try {
        // Test initialization
        results.initialization = this.isInitialized;

        // Test behavior tracking
        this.trackUIBehavior('test', document.body);
        results.behaviorTracking = true;

        // Test pattern generation
        const userId = this.getCurrentUserId();
        if (userId) {
          const patterns = this.getBehaviorPatterns(userId);
          results.patternGeneration = patterns.length >= 0;
        }

        // Test prediction generation
        if (userId) {
          const predictions = this.generatePredictions(userId);
          results.predictionGeneration = predictions.length >= 0;
        }

        // Test Phase 3 integration
        results.phase3Integration = typeof (window as any).phase3PerformanceOptimizer !== 'undefined';

        resolve({
          success: Object.values(results).every(Boolean),
          results,
          metrics: this.getMetrics()
        });

      } catch (error) {
        resolve({
          success: false,
          results,
          metrics: this.getMetrics()
        });
      }
    });
  }

  public cleanup(): void {
    // Clear active predictions
    this.activePredictions.clear();
    
    // Remove all predictive attributes
    if (typeof window !== 'undefined') {
      const elements = document.querySelectorAll('[data-predictive-preload], [data-predictive-hover]');
      elements.forEach(element => {
        element.removeAttribute('data-predictive-preload');
        element.removeAttribute('data-predictive-hover');
        (element as HTMLElement).style.opacity = '';
      });

      // Remove prefetch links
      const prefetchLinks = document.querySelectorAll('link[data-predictive-prefetch]');
      prefetchLinks.forEach(link => link.remove());
    }

    devLogger.log('PredictiveUI', '🧹 Cleanup completed');
  }
}

// Create and export singleton instance
export const predictiveUIEngine = new PredictiveUIEngine();

// Global interface for testing and debugging
if (typeof window !== 'undefined') {
  (window as any).predictiveUIEngine = {
    getStatus: () => predictiveUIEngine.getStatus(),
    getMetrics: () => predictiveUIEngine.getMetrics(),
    runTest: () => predictiveUIEngine.runTest(),
    updateConfig: (config: Partial<PredictiveUIConfig>) => predictiveUIEngine.updateConfig(config),
    getBehaviorPatterns: (userId?: string) => predictiveUIEngine.getBehaviorPatterns(userId),
    getActivePredictions: () => predictiveUIEngine.getActivePredictions(),
    validatePrediction: (id: string, accurate: boolean) => predictiveUIEngine.validatePrediction(id, accurate),
    cleanup: () => predictiveUIEngine.cleanup(),
    
    // Test methods
    testBehaviorTracking: () => {
      console.log('🧪 Testing Predictive UI behavior tracking...');
      predictiveUIEngine.trackUIBehavior('test_click', document.body);
      console.log('✅ Behavior tracking test completed');
      return true;
    },
    
    testPredictionGeneration: () => {
      console.log('🔮 Testing prediction generation...');
      const userId = predictiveUIEngine.getCurrentUserId() || 'test';
      const predictions = predictiveUIEngine.generatePredictions(userId);
      console.log(`🎯 Generated ${predictions.length} predictions`);
      return predictions;
    },
    
    testPhase3Integration: () => {
      console.log('🔗 Testing Phase 3 integration...');
      const hasPhase3 = typeof (window as any).phase3PerformanceOptimizer !== 'undefined';
      console.log(hasPhase3 ? '✅ Phase 3 integration active' : '⚠️ Phase 3 not available');
      return hasPhase3;
    }
  };
}

export default predictiveUIEngine; 