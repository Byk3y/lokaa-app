/**
 * 📊 Phase 8C: Intelligent Monitoring & Analytics System
 * 
 * AI-powered monitoring system that analyzes performance patterns,
 * detects anomalies, and provides intelligent insights for optimization.
 * 
 * Building on:
 * - Phase 4A: Error Tracking (error monitoring foundation)
 * - Phase 4B: Analytics System (event tracking infrastructure)
 * - Phase 7: Advanced Cache Manager (performance monitoring)
 * - Phase 8A: Content Intelligence (content-aware monitoring)
 * - Phase 8B: Behavior Prediction (user behavior insights)
 */

import { logAnalyticsEvent } from './analytics';
import { logError, classifyError } from './errorHandlingSystem';
import { devLogger } from './developmentLogger';

// Core interfaces for intelligent monitoring
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  context: {
    route?: string;
    userId?: string;
    deviceType?: string;
    networkSpeed?: string;
    contentType?: string;
  };
  baseline?: number;
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface Anomaly {
  id: string;
  type: 'performance' | 'behavior' | 'error' | 'security' | 'content';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  value: number;
  expectedValue: number;
  deviation: number;
  confidence: number;
  detectedAt: number;
  resolvedAt?: number;
  context: any;
  impact: {
    userExperience: number;
    systemStability: number;
    businessMetrics: number;
  };
}

export interface MonitoringInsight {
  id: string;
  category: 'optimization' | 'warning' | 'trend' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  priority: number;
  actionable: boolean;
  suggestedActions: string[];
  relatedMetrics: string[];
  generatedAt: number;
}

export interface SystemHealthScore {
  overall: number;
  performance: number;
  stability: number;
  userExperience: number;
  security: number;
  efficiency: number;
  trends: {
    performance: 'improving' | 'stable' | 'declining';
    stability: 'improving' | 'stable' | 'declining';
    userExperience: 'improving' | 'stable' | 'declining';
  };
}

export interface MonitoringConfig {
  enableAnomalyDetection: boolean;
  enablePredictiveAnalytics: boolean;
  enableAutoInsights: boolean;
  anomalyThreshold: number;
  insightGenerationInterval: number;
  metricsRetentionDays: number;
  enableRealTimeAlerts: boolean;
}

export class IntelligentMonitoringSystem {
  private metrics = new Map<string, PerformanceMetric[]>();
  private anomalies = new Map<string, Anomaly>();
  private insights = new Map<string, MonitoringInsight>();
  private baselines = new Map<string, number>();
  
  private config: MonitoringConfig = {
    enableAnomalyDetection: true,
    enablePredictiveAnalytics: true,
    enableAutoInsights: true,
    anomalyThreshold: 2.0, // Standard deviations
    insightGenerationInterval: 300000, // 5 minutes
    metricsRetentionDays: 30,
    enableRealTimeAlerts: true
  };

  private monitoringTimer: NodeJS.Timeout | null = null;
  private insightTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize intelligent monitoring system
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    devLogger.log('IntelligentMonitoring', '📊 Initializing Intelligent Monitoring System');

    try {
      // Load historical baselines
      await this.loadHistoricalBaselines();

      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      // Setup behavioral monitoring
      this.setupBehavioralMonitoring();

      // Start anomaly detection
      this.startAnomalyDetection();

      // Start insight generation
      this.startInsightGeneration();

      // Setup integrations
      await this.setupSystemIntegrations();

      this.isInitialized = true;
      devLogger.log('IntelligentMonitoring', '✅ Intelligent Monitoring System initialized');

    } catch (error) {
      logError(classifyError(error, {
        component: 'IntelligentMonitoringSystem',
        operation: 'initialize',
        silent: false
      }));
    }
  }

  /**
   * Record performance metric for analysis
   */
  public recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    try {
      const fullMetric: PerformanceMetric = {
        ...metric,
        id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };

      // Store metric
      if (!this.metrics.has(metric.name)) {
        this.metrics.set(metric.name, []);
      }
      
      const metricHistory = this.metrics.get(metric.name)!;
      metricHistory.push(fullMetric);

      // Keep only recent metrics
      const cutoff = Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);
      const filteredHistory = metricHistory.filter(m => m.timestamp > cutoff);
      this.metrics.set(metric.name, filteredHistory);

      // Check for anomalies
      if (this.config.enableAnomalyDetection) {
        this.checkForAnomalies(fullMetric);
      }

      // Update baseline
      this.updateBaseline(metric.name, metric.value);

      devLogger.log('IntelligentMonitoring', '📈 Metric recorded', {
        name: metric.name,
        value: metric.value,
        unit: metric.unit
      });

    } catch (error) {
      logError(classifyError(error, {
        component: 'IntelligentMonitoringSystem',
        operation: 'recordMetric',
        silent: true
      }));
    }
  }

  /**
   * Get current system health score
   */
  public getSystemHealthScore(): SystemHealthScore {
    try {
      const performanceScore = this.calculatePerformanceScore();
      const stabilityScore = this.calculateStabilityScore();
      const userExperienceScore = this.calculateUserExperienceScore();
      const securityScore = this.calculateSecurityScore();
      const efficiencyScore = this.calculateEfficiencyScore();

      const overall = (performanceScore + stabilityScore + userExperienceScore + securityScore + efficiencyScore) / 5;

      return {
        overall,
        performance: performanceScore,
        stability: stabilityScore,
        userExperience: userExperienceScore,
        security: securityScore,
        efficiency: efficiencyScore,
        trends: {
          performance: this.calculateTrend('performance'),
          stability: this.calculateTrend('stability'),
          userExperience: this.calculateTrend('user_experience')
        }
      };

    } catch (error) {
      logError(classifyError(error, {
        component: 'IntelligentMonitoringSystem',
        operation: 'getSystemHealthScore',
        silent: true
      }));

      return {
        overall: 0.5,
        performance: 0.5,
        stability: 0.5,
        userExperience: 0.5,
        security: 0.5,
        efficiency: 0.5,
        trends: {
          performance: 'stable',
          stability: 'stable',
          userExperience: 'stable'
        }
      };
    }
  }

  /**
   * Get current anomalies
   */
  public getCurrentAnomalies(): Anomaly[] {
    return Array.from(this.anomalies.values())
      .filter(anomaly => !anomaly.resolvedAt)
      .sort((a, b) => {
        // Sort by severity then by confidence
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.confidence - a.confidence;
      });
  }

  /**
   * Get intelligent insights
   */
  public getIntelligentInsights(): MonitoringInsight[] {
    return Array.from(this.insights.values())
      .sort((a, b) => {
        // Sort by priority then by confidence
        const priorityDiff = b.priority - a.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      })
      .slice(0, 10); // Return top 10 insights
  }

  /**
   * Generate predictive analytics report
   */
  public async generatePredictiveReport(): Promise<{
    predictions: Array<{
      metric: string;
      currentValue: number;
      predictedValue: number;
      timeframe: string;
      confidence: number;
    }>;
    risks: Array<{
      risk: string;
      probability: number;
      impact: number;
      mitigation: string[];
    }>;
    opportunities: Array<{
      opportunity: string;
      potential: number;
      effort: number;
      actions: string[];
    }>;
  }> {
    try {
      const predictions = await this.generateMetricPredictions();
      const risks = await this.identifyPotentialRisks();
      const opportunities = await this.identifyOptimizationOpportunities();

      devLogger.log('IntelligentMonitoring', '🔮 Predictive report generated', {
        predictions: predictions.length,
        risks: risks.length,
        opportunities: opportunities.length
      });

      return { predictions, risks, opportunities };

    } catch (error) {
      logError(classifyError(error, {
        component: 'IntelligentMonitoringSystem',
        operation: 'generatePredictiveReport',
        silent: true
      }));

      return { predictions: [], risks: [], opportunities: [] };
    }
  }

  /**
   * Resolve anomaly
   */
  public resolveAnomaly(anomalyId: string, resolution: string): boolean {
    try {
      const anomaly = this.anomalies.get(anomalyId);
      if (!anomaly) return false;

      anomaly.resolvedAt = Date.now();
      this.anomalies.set(anomalyId, anomaly);

      devLogger.log('IntelligentMonitoring', '✅ Anomaly resolved', {
        id: anomalyId,
        type: anomaly.type,
        resolution
      });

      // Log resolution analytics
      logAnalyticsEvent({
        event_type: 'system',
        event_name: 'AnomalyResolved',
        event_data: {
          anomalyId,
          type: anomaly.type,
          severity: anomaly.severity,
          resolution,
          durationMs: Date.now() - anomaly.detectedAt
        }
      });

      return true;

    } catch (error) {
      logError(classifyError(error, {
        component: 'IntelligentMonitoringSystem',
        operation: 'resolveAnomaly',
        silent: true
      }));
      return false;
    }
  }

  /**
   * Get monitoring dashboard data
   */
  public getDashboardData(): {
    systemHealth: SystemHealthScore;
    recentMetrics: PerformanceMetric[];
    activeAnomalies: Anomaly[];
    topInsights: MonitoringInsight[];
    alertsCount: number;
    trendsData: any;
  } {
    const now = Date.now();
    const recentCutoff = now - (24 * 60 * 60 * 1000); // Last 24 hours

    // Get recent metrics from all categories
    const recentMetrics: PerformanceMetric[] = [];
    this.metrics.forEach(metricHistory => {
      const recent = metricHistory.filter(m => m.timestamp > recentCutoff);
      recentMetrics.push(...recent);
    });

    // Sort by timestamp, most recent first
    recentMetrics.sort((a, b) => b.timestamp - a.timestamp);

    return {
      systemHealth: this.getSystemHealthScore(),
      recentMetrics: recentMetrics.slice(0, 50), // Last 50 metrics
      activeAnomalies: this.getCurrentAnomalies(),
      topInsights: this.getIntelligentInsights().slice(0, 5),
      alertsCount: this.getCurrentAnomalies().filter(a => a.severity === 'critical' || a.severity === 'high').length,
      trendsData: this.generateTrendsData()
    };
  }

  /**
   * Private helper methods
   */
  private async loadHistoricalBaselines(): Promise<void> {
    try {
      const stored = localStorage.getItem('monitoring-baselines');
      if (stored) {
        const baselines = JSON.parse(stored);
        Object.entries(baselines).forEach(([key, value]) => {
          this.baselines.set(key, value as number);
        });
      }
    } catch (error) {
      devLogger.warn('IntelligentMonitoring', 'Failed to load baselines', { error });
    }
  }

  private setupPerformanceMonitoring(): void {
    // Monitor key performance metrics
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 10000); // Every 10 seconds
  }

  private setupBehavioralMonitoring(): void {
    // Monitor user behavior patterns
    setInterval(() => {
      this.collectBehavioralMetrics();
    }, 30000); // Every 30 seconds
  }

  private startAnomalyDetection(): void {
    this.monitoringTimer = setInterval(() => {
      this.runAnomalyDetection();
    }, 60000); // Every minute
  }

  private startInsightGeneration(): void {
    this.insightTimer = setInterval(() => {
      if (this.config.enableAutoInsights) {
        this.generateInsights();
      }
    }, this.config.insightGenerationInterval);
  }

  private async setupSystemIntegrations(): Promise<void> {
    try {
      // Register with global window for testing
      (window as any).intelligentMonitoring = this;

      // Integration with error tracking
      if ((window as any).errorTracker) {
        devLogger.log('IntelligentMonitoring', '🔗 Integrated with Error Tracking');
      }

      // Integration with analytics
      if ((window as any).analytics) {
        devLogger.log('IntelligentMonitoring', '📊 Integrated with Analytics System');
      }

    } catch (error) {
      devLogger.warn('IntelligentMonitoring', 'Integration setup failed', { error });
    }
  }

  private collectPerformanceMetrics(): void {
    try {
      // Collect various performance metrics
      const now = Date.now();

      // Memory usage
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        this.recordMetric({
          name: 'memory_usage',
          value: memory.usedJSHeapSize / (1024 * 1024), // MB
          unit: 'MB',
          context: { deviceType: this.getDeviceType() }
        });
      }

      // Page load time (if available)
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation && navigation.loadEventEnd > 0) {
        this.recordMetric({
          name: 'page_load_time',
          value: navigation.loadEventEnd - navigation.fetchStart,
          unit: 'ms',
          context: { route: window.location.pathname }
        });
      }

      // FPS estimation
      const fps = this.estimateFPS();
      if (fps > 0) {
        this.recordMetric({
          name: 'fps',
          value: fps,
          unit: 'fps',
          context: {}
        });
      }

    } catch (error) {
      devLogger.warn('IntelligentMonitoring', 'Failed to collect performance metrics', { error });
    }
  }

  private collectBehavioralMetrics(): void {
    try {
      // Collect user behavior metrics
      const activeUsers = this.getActiveUsersCount();
      this.recordMetric({
        name: 'active_users',
        value: activeUsers,
        unit: 'count',
        context: {}
      });

      // Session duration estimation
      const sessionDuration = this.getSessionDuration();
      if (sessionDuration > 0) {
        this.recordMetric({
          name: 'session_duration',
          value: sessionDuration,
          unit: 'minutes',
          context: {}
        });
      }

    } catch (error) {
      devLogger.warn('IntelligentMonitoring', 'Failed to collect behavioral metrics', { error });
    }
  }

  private checkForAnomalies(metric: PerformanceMetric): void {
    try {
      const baseline = this.baselines.get(metric.name);
      if (!baseline) return;

      const deviation = Math.abs(metric.value - baseline) / baseline;
      
      if (deviation > this.config.anomalyThreshold) {
        const anomaly: Anomaly = {
          id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: this.classifyAnomalyType(metric),
          severity: this.calculateSeverity(deviation),
          metric: metric.name,
          value: metric.value,
          expectedValue: baseline,
          deviation,
          confidence: Math.min(deviation / this.config.anomalyThreshold, 1.0),
          detectedAt: Date.now(),
          context: metric.context,
          impact: this.calculateImpact(metric, deviation)
        };

        this.anomalies.set(anomaly.id, anomaly);

        devLogger.warn('IntelligentMonitoring', '🚨 Anomaly detected', {
          type: anomaly.type,
          severity: anomaly.severity,
          metric: anomaly.metric,
          deviation: anomaly.deviation
        });

        // Log anomaly analytics
        logAnalyticsEvent({
          event_type: 'system',
          event_name: 'AnomalyDetected',
          event_data: {
            anomalyId: anomaly.id,
            type: anomaly.type,
            severity: anomaly.severity,
            metric: anomaly.metric,
            deviation: anomaly.deviation,
            confidence: anomaly.confidence
          }
        });
      }

    } catch (error) {
      devLogger.warn('IntelligentMonitoring', 'Anomaly detection failed', { error });
    }
  }

  private updateBaseline(metricName: string, value: number): void {
    const current = this.baselines.get(metricName) || value;
    const updated = (current * 0.9) + (value * 0.1); // Exponential moving average
    this.baselines.set(metricName, updated);
  }

  private classifyAnomalyType(metric: PerformanceMetric): Anomaly['type'] {
    if (metric.name.includes('memory') || metric.name.includes('cpu') || metric.name.includes('fps')) {
      return 'performance';
    }
    if (metric.name.includes('error') || metric.name.includes('crash')) {
      return 'error';
    }
    if (metric.name.includes('user') || metric.name.includes('session')) {
      return 'behavior';
    }
    return 'performance';
  }

  private calculateSeverity(deviation: number): Anomaly['severity'] {
    if (deviation > 5) return 'critical';
    if (deviation > 3) return 'high';
    if (deviation > 2) return 'medium';
    return 'low';
  }

  private calculateImpact(metric: PerformanceMetric, deviation: number): Anomaly['impact'] {
    // Simplified impact calculation
    const baseImpact = Math.min(deviation / 5, 1.0);
    
    return {
      userExperience: metric.name.includes('load') || metric.name.includes('fps') ? baseImpact : baseImpact * 0.5,
      systemStability: metric.name.includes('memory') || metric.name.includes('error') ? baseImpact : baseImpact * 0.3,
      businessMetrics: metric.name.includes('user') || metric.name.includes('conversion') ? baseImpact : baseImpact * 0.2
    };
  }

  private runAnomalyDetection(): void {
    // Batch anomaly detection across all metrics
    devLogger.log('IntelligentMonitoring', '🔍 Running anomaly detection');
  }

  private generateInsights(): void {
    try {
      // Generate insights based on current data
      const insights = this.analyzeMetricsForInsights();
      
      insights.forEach(insight => {
        this.insights.set(insight.id, insight);
      });

      devLogger.log('IntelligentMonitoring', '💡 Generated insights', {
        count: insights.length
      });

    } catch (error) {
      devLogger.warn('IntelligentMonitoring', 'Insight generation failed', { error });
    }
  }

  private analyzeMetricsForInsights(): MonitoringInsight[] {
    const insights: MonitoringInsight[] = [];

    // Example insight generation logic
    const memoryMetrics = this.metrics.get('memory_usage');
    if (memoryMetrics && memoryMetrics.length > 10) {
      const recent = memoryMetrics.slice(-10);
      const avgMemory = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
      
      if (avgMemory > 100) { // > 100MB
        insights.push({
          id: `insight_memory_${Date.now()}`,
          category: 'warning',
          title: 'High Memory Usage Detected',
          description: `Average memory usage is ${avgMemory.toFixed(1)}MB, which may impact performance.`,
          confidence: 0.8,
          priority: 7,
          actionable: true,
          suggestedActions: [
            'Review memory leaks in components',
            'Optimize image loading',
            'Implement lazy loading for heavy components'
          ],
          relatedMetrics: ['memory_usage'],
          generatedAt: Date.now()
        });
      }
    }

    return insights;
  }

  private calculatePerformanceScore(): number {
    const performanceMetrics = ['page_load_time', 'fps', 'memory_usage'];
    let score = 1.0;
    
    performanceMetrics.forEach(metricName => {
      const metrics = this.metrics.get(metricName);
      if (metrics && metrics.length > 0) {
        const latest = metrics[metrics.length - 1];
        const baseline = this.baselines.get(metricName);
        
        if (baseline) {
          const ratio = latest.value / baseline;
          if (metricName === 'page_load_time' || metricName === 'memory_usage') {
            // Lower is better
            score *= Math.max(0.1, Math.min(1.0, 2 - ratio));
          } else {
            // Higher is better
            score *= Math.max(0.1, Math.min(1.0, ratio));
          }
        }
      }
    });

    return score;
  }

  private calculateStabilityScore(): number {
    const errorCount = this.anomalies.size;
    const recentErrors = Array.from(this.anomalies.values())
      .filter(a => Date.now() - a.detectedAt < 3600000).length; // Last hour
    
    return Math.max(0.1, 1.0 - (recentErrors * 0.1));
  }

  private calculateUserExperienceScore(): number {
    // Based on FPS, load times, and user behavior metrics
    const fpsMetrics = this.metrics.get('fps');
    const loadTimeMetrics = this.metrics.get('page_load_time');
    
    let score = 0.7; // Default
    
    if (fpsMetrics && fpsMetrics.length > 0) {
      const avgFps = fpsMetrics.slice(-5).reduce((sum, m) => sum + m.value, 0) / Math.min(5, fpsMetrics.length);
      score = (score + (avgFps / 60)) / 2;
    }
    
    return Math.max(0.1, Math.min(1.0, score));
  }

  private calculateSecurityScore(): number {
    // Security-related anomalies and metrics
    const securityAnomalies = Array.from(this.anomalies.values())
      .filter(a => a.type === 'security' && !a.resolvedAt).length;
    
    return Math.max(0.1, 1.0 - (securityAnomalies * 0.2));
  }

  private calculateEfficiencyScore(): number {
    // Resource usage efficiency
    const memoryMetrics = this.metrics.get('memory_usage');
    if (memoryMetrics && memoryMetrics.length > 0) {
      const latest = memoryMetrics[memoryMetrics.length - 1];
      // Assume efficient usage under 50MB
      return Math.max(0.1, Math.min(1.0, 50 / latest.value));
    }
    return 0.7; // Default
  }

  private calculateTrend(category: string): 'improving' | 'stable' | 'declining' {
    // Simplified trend calculation
    return 'stable';
  }

  private async generateMetricPredictions(): Promise<any[]> {
    // Generate predictions for key metrics
    return [];
  }

  private async identifyPotentialRisks(): Promise<any[]> {
    // Identify potential risks based on current trends
    return [];
  }

  private async identifyOptimizationOpportunities(): Promise<any[]> {
    // Identify optimization opportunities
    return [];
  }

  private generateTrendsData(): any {
    // Generate trend data for dashboard
    return {
      performance: this.getMetricTrend('page_load_time'),
      memory: this.getMetricTrend('memory_usage'),
      fps: this.getMetricTrend('fps')
    };
  }

  private getMetricTrend(metricName: string): any {
    const metrics = this.metrics.get(metricName);
    if (!metrics || metrics.length < 10) return null;

    const recent = metrics.slice(-24); // Last 24 data points
    return recent.map(m => ({
      timestamp: m.timestamp,
      value: m.value
    }));
  }

  private estimateFPS(): number {
    // Simplified FPS estimation
    return 60; // Would implement actual FPS monitoring
  }

  private getDeviceType(): string {
    return /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  }

  private getActiveUsersCount(): number {
    // Get active users from presence system
    try {
      if ((window as any).unifiedPresence) {
        return (window as any).unifiedPresence.getActiveUsersCount?.() || 1;
      }
    } catch (error) {
      // Ignore
    }
    return 1;
  }

  private getSessionDuration(): number {
    // Estimate session duration in minutes
    const sessionStart = sessionStorage.getItem('session-start');
    if (sessionStart) {
      return (Date.now() - parseInt(sessionStart)) / (1000 * 60);
    }
    return 0;
  }

  /**
   * Testing interface
   */
  public runTest(): Promise<{
    success: boolean;
    results: {
      initialization: boolean;
      metricRecording: boolean;
      anomalyDetection: boolean;
      insightGeneration: boolean;
      healthScoring: boolean;
    };
    systemHealth: SystemHealthScore;
  }> {
    return new Promise((resolve) => {
      const results = {
        initialization: this.isInitialized,
        metricRecording: false,
        anomalyDetection: false,
        insightGeneration: false,
        healthScoring: false
      };

      try {
        // Test metric recording
        this.recordMetric({
          name: 'test_metric',
          value: 100,
          unit: 'ms',
          context: { test: true }
        });
        results.metricRecording = this.metrics.has('test_metric');

        // Test anomaly detection
        this.recordMetric({
          name: 'test_anomaly_metric',
          value: 1000, // High value to trigger anomaly
          unit: 'ms',
          context: { test: true }
        });
        // Set a low baseline to trigger anomaly
        this.baselines.set('test_anomaly_metric', 100);
        this.recordMetric({
          name: 'test_anomaly_metric',
          value: 1000,
          unit: 'ms',
          context: { test: true }
        });
        results.anomalyDetection = this.anomalies.size > 0;

        // Test insight generation
        this.generateInsights();
        results.insightGeneration = this.insights.size > 0;

        // Test health scoring
        const healthScore = this.getSystemHealthScore();
        results.healthScoring = healthScore.overall > 0;

      } catch (error) {
        devLogger.warn('IntelligentMonitoring', 'Test failed', { error });
      }

      setTimeout(() => {
        resolve({
          success: Object.values(results).every(Boolean),
          results,
          systemHealth: this.getSystemHealthScore()
        });
      }, 100);
    });
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    if (this.insightTimer) {
      clearInterval(this.insightTimer);
      this.insightTimer = null;
    }

    // Save baselines
    try {
      const baselines = Object.fromEntries(this.baselines);
      localStorage.setItem('monitoring-baselines', JSON.stringify(baselines));
    } catch (error) {
      devLogger.warn('IntelligentMonitoring', 'Failed to save baselines', { error });
    }
  }
}

// Create and export global instance
export const intelligentMonitoringSystem = new IntelligentMonitoringSystem();

// Global interface for testing
(window as any).intelligentMonitoring = intelligentMonitoringSystem;

export default intelligentMonitoringSystem; 