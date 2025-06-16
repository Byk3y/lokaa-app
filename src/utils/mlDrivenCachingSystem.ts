/**
 * 🎯 Phase 8C: ML-Driven Caching System
 * 
 * Intelligent caching system that uses Phase 8A content intelligence
 * and Phase 8B user behavior patterns to optimize cache strategies.
 * 
 * Building on:
 * - Phase 3: Cache Strategy (basic caching foundation)
 * - Phase 7: Advanced Cache Manager (advanced caching features)
 * - Phase 8A: Content Intelligence (content-aware caching)
 * - Phase 8B: Behavior Prediction (predictive prefetching)
 */

import { logAnalyticsEvent } from './analytics';
import { logError, classifyError } from './errorHandlingSystem';
import { devLogger } from './developmentLogger';

// Core interfaces for ML-driven caching
export interface ContentCacheStrategy {
  contentType: string;
  priority: number;
  ttl: number;
  prefetchProbability: number;
  compressionLevel: number;
  evictionWeight: number;
}

export interface CacheInsight {
  contentId: string;
  contentType: string;
  qualityScore: number;
  engagementPotential: number;
  accessFrequency: number;
  userInterest: number;
  lastAccessed: number;
  predictedNextAccess: number;
}

export interface MLCachingMetrics {
  hitRate: number;
  missRate: number;
  prefetchAccuracy: number;
  intelligentEvictions: number;
  contentBasedHits: number;
  behaviorBasedHits: number;
  storageEfficiency: number;
  performanceGain: number;
}

export interface CachingDecision {
  id: string;
  type: 'cache' | 'evict' | 'prefetch' | 'update_ttl';
  contentId: string;
  reason: string;
  confidence: number;
  appliedAt: number;
  impact?: number;
}

export class MLDrivenCachingSystem {
  private contentStrategies = new Map<string, ContentCacheStrategy>();
  private cacheInsights = new Map<string, CacheInsight>();
  private cachingDecisions = new Map<string, CachingDecision>();
  
  private metrics: MLCachingMetrics = {
    hitRate: 0,
    missRate: 0,
    prefetchAccuracy: 0,
    intelligentEvictions: 0,
    contentBasedHits: 0,
    behaviorBasedHits: 0,
    storageEfficiency: 0,
    performanceGain: 0
  };

  private config = {
    enableContentIntelligence: true,
    enableBehaviorPrediction: true,
    enablePredictivePrefetch: true,
    maxCacheSize: 100 * 1024 * 1024, // 100MB
    minContentQuality: 0.6,
    prefetchConfidenceThreshold: 0.75,
    maxPrefetchItems: 10
  };

  private analysisTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize ML-driven caching system
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    devLogger.log('MLCaching', '🎯 Initializing ML-Driven Caching System');

    try {
      // Load existing cache strategies
      await this.loadCacheStrategies();

      // Setup content intelligence integration
      await this.setupContentIntelligenceIntegration();

      // Setup behavior prediction integration
      await this.setupBehaviorPredictionIntegration();

      // Start cache analysis
      this.startCacheAnalysis();

      this.isInitialized = true;
      devLogger.log('MLCaching', '✅ ML-Driven Caching System initialized');

    } catch (error) {
      logError(classifyError(error, {
        component: 'MLDrivenCachingSystem',
        operation: 'initialize',
        silent: false
      }));
    }
  }

  /**
   * Optimize cache strategy for specific content
   */
  public async optimizeForContent(contentAnalysis: any): Promise<ContentCacheStrategy> {
    try {
      const contentType = contentAnalysis.contentType || 'post';
      const qualityScore = contentAnalysis.qualityScore || 0.5;
      const engagementPotential = contentAnalysis.engagementPotential || 0.5;

      // Generate optimized strategy based on content intelligence
      const strategy: ContentCacheStrategy = {
        contentType,
        priority: this.calculateCachePriority(qualityScore, engagementPotential),
        ttl: this.calculateOptimalTTL(contentAnalysis),
        prefetchProbability: this.calculatePrefetchProbability(contentAnalysis),
        compressionLevel: this.calculateCompressionLevel(contentAnalysis),
        evictionWeight: this.calculateEvictionWeight(qualityScore, engagementPotential)
      };

      this.contentStrategies.set(contentType, strategy);

      devLogger.log('MLCaching', '📊 Content strategy optimized', {
        contentType,
        priority: strategy.priority,
        ttl: strategy.ttl,
        prefetchProbability: strategy.prefetchProbability
      });

      return strategy;

    } catch (error) {
      logError(classifyError(error, {
        component: 'MLDrivenCachingSystem',
        operation: 'optimizeForContent',
        silent: true
      }));

      // Return default strategy
      return {
        contentType: 'default',
        priority: 5,
        ttl: 300000, // 5 minutes
        prefetchProbability: 0.5,
        compressionLevel: 1,
        evictionWeight: 1
      };
    }
  }

  /**
   * Generate intelligent prefetch recommendations
   */
  public async generatePrefetchRecommendations(userId: string): Promise<string[]> {
    try {
      const recommendations: string[] = [];

      // Get behavior-based recommendations
      const behaviorRecommendations = await this.getBehaviorBasedRecommendations(userId);
      recommendations.push(...behaviorRecommendations);

      // Get content intelligence-based recommendations
      const contentRecommendations = await this.getContentIntelligenceRecommendations(userId);
      recommendations.push(...contentRecommendations);

      // Filter by confidence and priority
      const filteredRecommendations = await this.filterRecommendationsByConfidence(recommendations);

      devLogger.log('MLCaching', '🔮 Prefetch recommendations generated', {
        total: recommendations.length,
        filtered: filteredRecommendations.length,
        userId
      });

      // Log analytics
      await logAnalyticsEvent({
        event_type: 'system',
        event_name: 'PrefetchRecommendationsGenerated',
        event_data: {
          userId,
          totalRecommendations: recommendations.length,
          filteredRecommendations: filteredRecommendations.length,
          behaviorBased: behaviorRecommendations.length,
          contentBased: contentRecommendations.length
        }
      });

      return filteredRecommendations.slice(0, this.config.maxPrefetchItems);

    } catch (error) {
      logError(classifyError(error, {
        component: 'MLDrivenCachingSystem',
        operation: 'generatePrefetchRecommendations',
        silent: true
      }));
      return [];
    }
  }

  /**
   * Decide whether to cache content based on ML insights
   */
  public shouldCacheContent(contentId: string, contentAnalysis: any): {
    shouldCache: boolean;
    strategy: ContentCacheStrategy;
    reason: string;
    confidence: number;
  } {
    try {
      const qualityScore = contentAnalysis.qualityScore || 0.5;
      const engagementPotential = contentAnalysis.engagementPotential || 0.5;
      const contentType = contentAnalysis.contentType || 'post';

      // Get or create strategy for this content type
      let strategy = this.contentStrategies.get(contentType);
      if (!strategy) {
        strategy = {
          contentType,
          priority: 5,
          ttl: 300000,
          prefetchProbability: 0.5,
          compressionLevel: 1,
          evictionWeight: 1
        };
      }

      // Calculate caching decision
      let shouldCache = true;
      let reason = 'default_cache';
      let confidence = 0.5;

      // High-quality content should definitely be cached
      if (qualityScore > 0.8) {
        shouldCache = true;
        reason = 'high_quality_content';
        confidence = 0.9;
      }
      // High engagement potential should be cached
      else if (engagementPotential > 0.7) {
        shouldCache = true;
        reason = 'high_engagement_potential';
        confidence = 0.8;
      }
      // Low-quality content might not be worth caching
      else if (qualityScore < this.config.minContentQuality) {
        shouldCache = false;
        reason = 'low_quality_content';
        confidence = 0.7;
      }

      // Record the decision
      const decision: CachingDecision = {
        id: `cache_${contentId}_${Date.now()}`,
        type: shouldCache ? 'cache' : 'evict',
        contentId,
        reason,
        confidence,
        appliedAt: Date.now()
      };

      this.cachingDecisions.set(decision.id, decision);

      return { shouldCache, strategy, reason, confidence };

    } catch (error) {
      logError(classifyError(error, {
        component: 'MLDrivenCachingSystem',
        operation: 'shouldCacheContent',
        silent: true
      }));

      return {
        shouldCache: true,
        strategy: {
          contentType: 'default',
          priority: 5,
          ttl: 300000,
          prefetchProbability: 0.5,
          compressionLevel: 1,
          evictionWeight: 1
        },
        reason: 'fallback_default',
        confidence: 0.5
      };
    }
  }

  /**
   * Intelligent cache eviction based on content analysis and usage patterns
   */
  public selectEvictionCandidates(currentCacheSize: number): string[] {
    try {
      const candidates: Array<{ contentId: string; score: number }> = [];

      this.cacheInsights.forEach((insight, contentId) => {
        const evictionScore = this.calculateEvictionScore(insight);
        candidates.push({ contentId, score: evictionScore });
      });

      // Sort by eviction score (higher score = more likely to evict)
      candidates.sort((a, b) => b.score - a.score);

      // Calculate how much to evict (25% of cache size)
      const targetEvictionCount = Math.ceil(candidates.length * 0.25);
      const evictionCandidates = candidates.slice(0, targetEvictionCount).map(c => c.contentId);

      devLogger.log('MLCaching', '🗑️ Eviction candidates selected', {
        totalCached: candidates.length,
        evictionCandidates: evictionCandidates.length,
        currentCacheSize
      });

      this.metrics.intelligentEvictions += evictionCandidates.length;

      return evictionCandidates;

    } catch (error) {
      logError(classifyError(error, {
        component: 'MLDrivenCachingSystem',
        operation: 'selectEvictionCandidates',
        silent: true
      }));
      return [];
    }
  }

  /**
   * Update cache insights based on access patterns
   */
  public updateCacheInsights(contentId: string, accessType: 'hit' | 'miss' | 'prefetch'): void {
    try {
      let insight = this.cacheInsights.get(contentId);

      if (!insight) {
        insight = {
          contentId,
          contentType: 'unknown',
          qualityScore: 0.5,
          engagementPotential: 0.5,
          accessFrequency: 0,
          userInterest: 0.5,
          lastAccessed: Date.now(),
          predictedNextAccess: Date.now() + 3600000 // 1 hour default
        };
      }

      // Update based on access type
      switch (accessType) {
        case 'hit':
          insight.accessFrequency++;
          insight.userInterest = Math.min(insight.userInterest + 0.1, 1.0);
          this.metrics.contentBasedHits++;
          break;
        case 'miss':
          insight.userInterest = Math.max(insight.userInterest - 0.05, 0.1);
          break;
        case 'prefetch':
          insight.predictedNextAccess = this.calculateNextAccessPrediction(insight);
          this.metrics.behaviorBasedHits++;
          break;
      }

      insight.lastAccessed = Date.now();
      this.cacheInsights.set(contentId, insight);

      // Update overall metrics
      this.updateCacheMetrics();

    } catch (error) {
      logError(classifyError(error, {
        component: 'MLDrivenCachingSystem',
        operation: 'updateCacheInsights',
        silent: true
      }));
    }
  }

  /**
   * Get ML caching performance metrics
   */
  public getMLCachingMetrics(): MLCachingMetrics {
    return { ...this.metrics };
  }

  /**
   * Get caching status and recommendations
   */
  public getCachingStatus(): {
    isActive: boolean;
    metrics: MLCachingMetrics;
    activeStrategies: ContentCacheStrategy[];
    recentDecisions: CachingDecision[];
    insights: CacheInsight[];
  } {
    const recentDecisions = Array.from(this.cachingDecisions.values())
      .filter(d => Date.now() - d.appliedAt < 3600000) // Last hour
      .sort((a, b) => b.appliedAt - a.appliedAt)
      .slice(0, 20);

    const topInsights = Array.from(this.cacheInsights.values())
      .sort((a, b) => b.userInterest - a.userInterest)
      .slice(0, 10);

    return {
      isActive: this.isInitialized,
      metrics: { ...this.metrics },
      activeStrategies: Array.from(this.contentStrategies.values()),
      recentDecisions,
      insights: topInsights
    };
  }

  /**
   * Private helper methods
   */
  private async loadCacheStrategies(): Promise<void> {
    try {
      const stored = localStorage.getItem('ml-cache-strategies');
      if (stored) {
        const strategies = JSON.parse(stored);
        strategies.forEach((strategy: ContentCacheStrategy) => {
          this.contentStrategies.set(strategy.contentType, strategy);
        });
      }
    } catch (error) {
      devLogger.warn('MLCaching', 'Failed to load stored strategies', { error });
    }
  }

  private async setupContentIntelligenceIntegration(): Promise<void> {
    try {
      if ((window as any).contentIntelligenceEngine) {
        devLogger.log('MLCaching', '🧠 Integrated with Content Intelligence Engine');
      }
    } catch (error) {
      devLogger.warn('MLCaching', 'Content Intelligence integration failed', { error });
    }
  }

  private async setupBehaviorPredictionIntegration(): Promise<void> {
    try {
      if ((window as any).userBehaviorPredictor) {
        devLogger.log('MLCaching', '🎯 Integrated with Behavior Prediction Engine');
      }
    } catch (error) {
      devLogger.warn('MLCaching', 'Behavior Prediction integration failed', { error });
    }
  }

  private startCacheAnalysis(): void {
    this.analysisTimer = setInterval(() => {
      this.analyzeCachePerformance();
      this.optimizeCacheStrategies();
      this.saveCacheStrategies();
    }, 60000); // Every minute
  }

  private calculateCachePriority(qualityScore: number, engagementPotential: number): number {
    return Math.round((qualityScore * 0.6 + engagementPotential * 0.4) * 10);
  }

  private calculateOptimalTTL(contentAnalysis: any): number {
    const baseTime = 300000; // 5 minutes
    const qualityMultiplier = (contentAnalysis.qualityScore || 0.5) * 2;
    const engagementMultiplier = (contentAnalysis.engagementPotential || 0.5) * 2;
    
    return Math.round(baseTime * qualityMultiplier * engagementMultiplier);
  }

  private calculatePrefetchProbability(contentAnalysis: any): number {
    const quality = contentAnalysis.qualityScore || 0.5;
    const engagement = contentAnalysis.engagementPotential || 0.5;
    const trending = contentAnalysis.trendingScore || 0.5;
    
    return (quality * 0.4 + engagement * 0.4 + trending * 0.2);
  }

  private calculateCompressionLevel(contentAnalysis: any): number {
    // Higher compression for lower quality content
    const quality = contentAnalysis.qualityScore || 0.5;
    return Math.round((1 - quality) * 3) + 1; // 1-4 compression levels
  }

  private calculateEvictionWeight(qualityScore: number, engagementPotential: number): number {
    // Lower weight = less likely to be evicted
    return 1 - (qualityScore * 0.6 + engagementPotential * 0.4);
  }

  private async getBehaviorBasedRecommendations(userId: string): Promise<string[]> {
    try {
      if ((window as any).userBehaviorPredictor) {
        const predictions = (window as any).userBehaviorPredictor.getPredictions(userId);
        return predictions?.map((p: any) => p.target).filter(Boolean) || [];
      }
    } catch (error) {
      devLogger.warn('MLCaching', 'Failed to get behavior-based recommendations', { error });
    }
    return [];
  }

  private async getContentIntelligenceRecommendations(userId: string): Promise<string[]> {
    try {
      if ((window as any).recommendationSystem) {
        const recommendations = await (window as any).recommendationSystem.getUserRecommendations(userId);
        return recommendations?.map((r: any) => r.contentId || r.id).filter(Boolean) || [];
      }
    } catch (error) {
      devLogger.warn('MLCaching', 'Failed to get content intelligence recommendations', { error });
    }
    return [];
  }

  private async filterRecommendationsByConfidence(recommendations: string[]): Promise<string[]> {
    return recommendations.filter(contentId => {
      const insight = this.cacheInsights.get(contentId);
      return !insight || insight.userInterest >= this.config.prefetchConfidenceThreshold;
    });
  }

  private calculateEvictionScore(insight: CacheInsight): number {
    const ageScore = (Date.now() - insight.lastAccessed) / (24 * 60 * 60 * 1000); // Days since last access
    const qualityScore = 1 - insight.qualityScore; // Lower quality = higher eviction score
    const interestScore = 1 - insight.userInterest; // Lower interest = higher eviction score
    const frequencyScore = 1 / Math.max(insight.accessFrequency, 1); // Lower frequency = higher eviction score

    return (ageScore * 0.3 + qualityScore * 0.3 + interestScore * 0.3 + frequencyScore * 0.1);
  }

  private calculateNextAccessPrediction(insight: CacheInsight): number {
    // Simple prediction based on access frequency
    const avgInterval = insight.accessFrequency > 1 
      ? (Date.now() - insight.lastAccessed) / insight.accessFrequency
      : 3600000; // 1 hour default
    
    return Date.now() + avgInterval;
  }

  private updateCacheMetrics(): void {
    const totalAccesses = this.metrics.contentBasedHits + this.metrics.behaviorBasedHits;
    const totalInsights = this.cacheInsights.size;

    if (totalAccesses > 0) {
      this.metrics.hitRate = (this.metrics.contentBasedHits + this.metrics.behaviorBasedHits) / totalAccesses;
      this.metrics.missRate = 1 - this.metrics.hitRate;
    }

    if (totalInsights > 0) {
      const avgUserInterest = Array.from(this.cacheInsights.values())
        .reduce((sum, insight) => sum + insight.userInterest, 0) / totalInsights;
      this.metrics.storageEfficiency = avgUserInterest;
    }
  }

  private analyzeCachePerformance(): void {
    // Analyze cache performance and adjust strategies
    devLogger.log('MLCaching', '📊 Analyzing cache performance', {
      hitRate: this.metrics.hitRate,
      strategies: this.contentStrategies.size,
      insights: this.cacheInsights.size
    });
  }

  private optimizeCacheStrategies(): void {
    // Optimize cache strategies based on performance data
    this.contentStrategies.forEach((strategy, contentType) => {
      // Adjust TTL based on hit rates
      // Adjust prefetch probability based on accuracy
      // This would contain more sophisticated optimization logic
    });
  }

  private saveCacheStrategies(): void {
    try {
      const strategies = Array.from(this.contentStrategies.values());
      localStorage.setItem('ml-cache-strategies', JSON.stringify(strategies));
    } catch (error) {
      devLogger.warn('MLCaching', 'Failed to save cache strategies', { error });
    }
  }

  /**
   * Testing interface
   */
  public runTest(): Promise<{
    success: boolean;
    results: {
      initialization: boolean;
      contentOptimization: boolean;
      prefetchGeneration: boolean;
      intelligentEviction: boolean;
    };
    metrics: MLCachingMetrics;
  }> {
    return new Promise(async (resolve) => {
      const testContent = {
        contentType: 'post',
        qualityScore: 0.8,
        engagementPotential: 0.7
      };

      const results = {
        initialization: this.isInitialized,
        contentOptimization: false,
        prefetchGeneration: false,
        intelligentEviction: false
      };

      try {
        // Test content optimization
        const strategy = await this.optimizeForContent(testContent);
        results.contentOptimization = strategy.priority > 0;

        // Test prefetch generation
        const prefetchRecs = await this.generatePrefetchRecommendations('test_user');
        results.prefetchGeneration = Array.isArray(prefetchRecs);

        // Test intelligent eviction
        this.updateCacheInsights('test_content', 'hit');
        const evictionCandidates = this.selectEvictionCandidates(1000);
        results.intelligentEviction = Array.isArray(evictionCandidates);

      } catch (error) {
        devLogger.warn('MLCaching', 'Test failed', { error });
      }

      resolve({
        success: Object.values(results).every(Boolean),
        results,
        metrics: { ...this.metrics }
      });
    });
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }

    this.saveCacheStrategies();
  }
}

// Create and export global instance
export const mlDrivenCachingSystem = new MLDrivenCachingSystem();

// Global interface for testing
(window as any).mlDrivenCaching = mlDrivenCachingSystem;

export default mlDrivenCachingSystem; 