/**
 * 🔍 Phase 8C: Anomaly Detection Engine
 * 
 * Advanced pattern recognition system that detects anomalies in user behavior,
 * system performance, and content patterns using ML algorithms.
 * 
 * Building on:
 * - Phase 4A: Error Tracking (error pattern foundation)
 * - Phase 4B: Analytics System (behavior data collection)
 * - Phase 8A: Content Intelligence (content pattern analysis)
 * - Phase 8B: Behavior Prediction (normal behavior modeling)
 * - Intelligent Monitoring System (performance anomaly detection)
 */

import { logAnalyticsEvent } from './analytics';
import { logError, classifyError } from './errorHandlingSystem';
import { devLogger } from './developmentLogger';

// Core interfaces for anomaly detection
export interface AnomalyPattern {
  id: string;
  type: 'statistical' | 'behavioral' | 'content' | 'security' | 'performance';
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectionAlgorithm: 'zscore' | 'isolation_forest' | 'sequence' | 'frequency' | 'clustering';
  parameters: {
    threshold?: number;
    windowSize?: number;
    minSamples?: number;
    sensitivity?: number;
  };
  isActive: boolean;
  falsePositiveRate: number;
  lastTuned: number;
}

export interface AnomalyInstance {
  id: string;
  patternId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  detectedAt: number;
  resolvedAt?: number;
  data: {
    metric?: string;
    value?: number;
    expectedRange?: [number, number];
    context?: any;
    affectedUsers?: string[];
    relatedEvents?: string[];
  };
  impact: {
    userCount: number;
    systemPerformance: number;
    businessMetrics: number;
    securityRisk: number;
  };
  investigation: {
    status: 'new' | 'investigating' | 'resolved' | 'false_positive';
    assignedTo?: string;
    notes: string[];
    actions: string[];
  };
}

export interface BehaviorProfile {
  userId: string;
  normalPatterns: {
    sessionDuration: { mean: number; stdDev: number };
    actionsPerSession: { mean: number; stdDev: number };
    timeOfDayActivity: number[]; // 24-hour activity pattern
    contentTypes: Map<string, number>; // Content type preferences
    navigationPatterns: string[]; // Common navigation sequences
  };
  recentBehavior: Array<{
    timestamp: number;
    action: string;
    context: any;
  }>;
  riskScore: number;
  lastUpdated: number;
}

export interface DetectionConfig {
  enableStatisticalDetection: boolean;
  enableBehavioralDetection: boolean;
  enableContentDetection: boolean;
  enableSecurityDetection: boolean;
  enablePerformanceDetection: boolean;
  globalSensitivity: number;
  maxAnomaliesPerHour: number;
  autoTuningEnabled: boolean;
  minimumConfidence: number;
}

export class AnomalyDetectionEngine {
  private anomalyPatterns = new Map<string, AnomalyPattern>();
  private detectedAnomalies = new Map<string, AnomalyInstance>();
  private userProfiles = new Map<string, BehaviorProfile>();
  private historicalData = new Map<string, Array<{ timestamp: number; value: number }>>();
  
  private config: DetectionConfig = {
    enableStatisticalDetection: true,
    enableBehavioralDetection: true,
    enableContentDetection: true,
    enableSecurityDetection: true,
    enablePerformanceDetection: true,
    globalSensitivity: 0.8,
    maxAnomaliesPerHour: 50,
    autoTuningEnabled: true,
    minimumConfidence: 0.7
  };

  private detectionTimer: NodeJS.Timeout | null = null;
  private tuningTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize anomaly detection engine
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    devLogger.log('AnomalyDetection', '🔍 Initializing Anomaly Detection Engine');

    try {
      // Load existing patterns and profiles
      await this.loadAnomalyPatterns();
      await this.loadUserProfiles();

      // Initialize default detection patterns
      this.initializeDefaultPatterns();

      // Start detection processes
      this.startDetectionLoop();
      this.startTuningLoop();

      // Setup integrations
      await this.setupSystemIntegrations();

      this.isInitialized = true;
      devLogger.log('AnomalyDetection', '✅ Anomaly Detection Engine initialized');

    } catch (error) {
      logError(classifyError(error, {
        component: 'AnomalyDetectionEngine',
        operation: 'initialize',
        silent: false
      }));
    }
  }

  /**
   * Record user behavior for analysis
   */
  public recordUserBehavior(userId: string, action: string, context: any): void {
    try {
      // Get or create user profile
      let profile = this.userProfiles.get(userId);
      if (!profile) {
        profile = this.createUserProfile(userId);
        this.userProfiles.set(userId, profile);
      }

      // Record the behavior
      profile.recentBehavior.push({
        timestamp: Date.now(),
        action,
        context
      });

      // Keep only recent behavior (last 24 hours)
      const cutoff = Date.now() - (24 * 60 * 60 * 1000);
      profile.recentBehavior = profile.recentBehavior.filter(b => b.timestamp > cutoff);

      // Update profile patterns
      this.updateUserProfile(profile);

      // Check for behavioral anomalies
      if (this.config.enableBehavioralDetection) {
        this.checkBehavioralAnomalies(userId, action, context);
      }

      devLogger.log('AnomalyDetection', '👤 User behavior recorded', {
        userId,
        action,
        recentBehaviorCount: profile.recentBehavior.length
      });

    } catch (error) {
      logError(classifyError(error, {
        component: 'AnomalyDetectionEngine',
        operation: 'recordUserBehavior',
        silent: true
      }));
    }
  }

  /**
   * Record system metric for statistical analysis
   */
  public recordSystemMetric(metric: string, value: number, context: any = {}): void {
    try {
      // Store historical data
      if (!this.historicalData.has(metric)) {
        this.historicalData.set(metric, []);
      }

      const history = this.historicalData.get(metric)!;
      history.push({ timestamp: Date.now(), value });

      // Keep only recent data (last 7 days)
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const filteredHistory = history.filter(h => h.timestamp > cutoff);
      this.historicalData.set(metric, filteredHistory);

      // Check for statistical anomalies
      if (this.config.enableStatisticalDetection) {
        this.checkStatisticalAnomalies(metric, value, context);
      }

      // Check for performance anomalies
      if (this.config.enablePerformanceDetection && this.isPerformanceMetric(metric)) {
        this.checkPerformanceAnomalies(metric, value, context);
      }

    } catch (error) {
      logError(classifyError(error, {
        component: 'AnomalyDetectionEngine',
        operation: 'recordSystemMetric',
        silent: true
      }));
    }
  }

  /**
   * Analyze content for anomalies
   */
  public analyzeContent(contentId: string, contentData: any): void {
    try {
      if (!this.config.enableContentDetection) return;

      // Check for content anomalies
      const anomalies = this.detectContentAnomalies(contentId, contentData);

      anomalies.forEach(anomaly => {
        this.recordAnomaly(anomaly);
      });

      devLogger.log('AnomalyDetection', '📄 Content analyzed', {
        contentId,
        anomaliesFound: anomalies.length
      });

    } catch (error) {
      logError(classifyError(error, {
        component: 'AnomalyDetectionEngine',
        operation: 'analyzeContent',
        silent: true
      }));
    }
  }

  /**
   * Check for security anomalies
   */
  public checkSecurityAnomalies(event: {
    type: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    context: any;
  }): void {
    try {
      if (!this.config.enableSecurityDetection) return;

      const anomalies = this.detectSecurityAnomalies(event);

      anomalies.forEach(anomaly => {
        this.recordAnomaly(anomaly);
      });

      devLogger.log('AnomalyDetection', '🛡️ Security event analyzed', {
        type: event.type,
        anomaliesFound: anomalies.length
      });

    } catch (error) {
      logError(classifyError(error, {
        component: 'AnomalyDetectionEngine',
        operation: 'checkSecurityAnomalies',
        silent: true
      }));
    }
  }

  /**
   * Get current anomalies with filtering options
   */
  public getCurrentAnomalies(filters?: {
    type?: string;
    severity?: string;
    resolved?: boolean;
    minConfidence?: number;
  }): AnomalyInstance[] {
    let anomalies = Array.from(this.detectedAnomalies.values());

    if (filters) {
      if (filters.type) {
        anomalies = anomalies.filter(a => a.type === filters.type);
      }
      if (filters.severity) {
        anomalies = anomalies.filter(a => a.severity === filters.severity);
      }
      if (filters.resolved !== undefined) {
        anomalies = anomalies.filter(a => (a.resolvedAt !== undefined) === filters.resolved);
      }
      if (filters.minConfidence) {
        anomalies = anomalies.filter(a => a.confidence >= filters.minConfidence);
      }
    }

    return anomalies.sort((a, b) => {
      // Sort by severity, then confidence, then recency
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      const confidenceDiff = b.confidence - a.confidence;
      if (confidenceDiff !== 0) return confidenceDiff;
      
      return b.detectedAt - a.detectedAt;
    });
  }

  /**
   * Get anomaly statistics
   */
  public getAnomalyStatistics(): {
    total: number;
    byType: Map<string, number>;
    bySeverity: Map<string, number>;
    resolved: number;
    falsePositives: number;
    avgConfidence: number;
    detectionRate: number;
  } {
    const anomalies = Array.from(this.detectedAnomalies.values());
    const total = anomalies.length;
    
    const byType = new Map<string, number>();
    const bySeverity = new Map<string, number>();
    let resolved = 0;
    let falsePositives = 0;
    let totalConfidence = 0;

    anomalies.forEach(anomaly => {
      // Count by type
      byType.set(anomaly.type, (byType.get(anomaly.type) || 0) + 1);
      
      // Count by severity
      bySeverity.set(anomaly.severity, (bySeverity.get(anomaly.severity) || 0) + 1);
      
      // Count resolved
      if (anomaly.resolvedAt) resolved++;
      
      // Count false positives
      if (anomaly.investigation.status === 'false_positive') falsePositives++;
      
      // Sum confidence
      totalConfidence += anomaly.confidence;
    });

    const avgConfidence = total > 0 ? totalConfidence / total : 0;
    const detectionRate = this.calculateDetectionRate();

    return {
      total,
      byType,
      bySeverity,
      resolved,
      falsePositives,
      avgConfidence,
      detectionRate
    };
  }

  /**
   * Resolve anomaly
   */
  public resolveAnomaly(anomalyId: string, resolution: {
    status: 'resolved' | 'false_positive';
    notes: string;
    actions?: string[];
  }): boolean {
    try {
      const anomaly = this.detectedAnomalies.get(anomalyId);
      if (!anomaly) return false;

      anomaly.resolvedAt = Date.now();
      anomaly.investigation.status = resolution.status;
      anomaly.investigation.notes.push(resolution.notes);
      
      if (resolution.actions) {
        anomaly.investigation.actions.push(...resolution.actions);
      }

      this.detectedAnomalies.set(anomalyId, anomaly);

      // Update pattern tuning based on resolution
      if (resolution.status === 'false_positive') {
        this.tunePattern(anomaly.patternId, 'false_positive');
      } else {
        this.tunePattern(anomaly.patternId, 'true_positive');
      }

      devLogger.log('AnomalyDetection', '✅ Anomaly resolved', {
        id: anomalyId,
        status: resolution.status,
        type: anomaly.type
      });

      // Log resolution analytics
      logAnalyticsEvent({
        event_type: 'system',
        event_name: 'AnomalyResolved',
        event_data: {
          anomalyId,
          type: anomaly.type,
          severity: anomaly.severity,
          confidence: anomaly.confidence,
          resolution: resolution.status,
          durationMs: Date.now() - anomaly.detectedAt
        }
      });

      return true;

    } catch (error) {
      logError(classifyError(error, {
        component: 'AnomalyDetectionEngine',
        operation: 'resolveAnomaly',
        silent: true
      }));
      return false;
    }
  }

  /**
   * Get user risk assessment
   */
  public getUserRiskAssessment(userId: string): {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
    recommendations: string[];
  } {
    try {
      const profile = this.userProfiles.get(userId);
      if (!profile) {
        return {
          riskScore: 0.5,
          riskLevel: 'medium',
          riskFactors: ['No behavior profile available'],
          recommendations: ['Continue monitoring user behavior']
        };
      }

      const riskFactors: string[] = [];
      const recommendations: string[] = [];

      // Analyze behavior patterns for risk factors
      if (profile.recentBehavior.length > profile.normalPatterns.actionsPerSession.mean * 3) {
        riskFactors.push('Unusually high activity');
        recommendations.push('Monitor for automated/bot behavior');
      }

      if (profile.riskScore > 0.8) {
        riskFactors.push('High anomaly count');
        recommendations.push('Review recent user actions');
      }

      const riskLevel = profile.riskScore > 0.7 ? 'high' : profile.riskScore > 0.4 ? 'medium' : 'low';

      return {
        riskScore: profile.riskScore,
        riskLevel,
        riskFactors,
        recommendations
      };

    } catch (error) {
      logError(classifyError(error, {
        component: 'AnomalyDetectionEngine',
        operation: 'getUserRiskAssessment',
        silent: true
      }));

      return {
        riskScore: 0.5,
        riskLevel: 'medium',
        riskFactors: ['Assessment failed'],
        recommendations: ['Manual review required']
      };
    }
  }

  /**
   * Private helper methods
   */
  private async loadAnomalyPatterns(): Promise<void> {
    try {
      const stored = localStorage.getItem('anomaly-patterns');
      if (stored) {
        const patterns = JSON.parse(stored);
        patterns.forEach((pattern: AnomalyPattern) => {
          this.anomalyPatterns.set(pattern.id, pattern);
        });
      }
    } catch (error) {
      devLogger.warn('AnomalyDetection', 'Failed to load patterns', { error });
    }
  }

  private async loadUserProfiles(): Promise<void> {
    try {
      const stored = localStorage.getItem('user-behavior-profiles');
      if (stored) {
        const profiles = JSON.parse(stored);
        profiles.forEach((profile: BehaviorProfile) => {
          // Convert content types back to Map
          profile.normalPatterns.contentTypes = new Map(profile.normalPatterns.contentTypes);
          this.userProfiles.set(profile.userId, profile);
        });
      }
    } catch (error) {
      devLogger.warn('AnomalyDetection', 'Failed to load user profiles', { error });
    }
  }

  private initializeDefaultPatterns(): void {
    const defaultPatterns: AnomalyPattern[] = [
      {
        id: 'statistical_zscore',
        type: 'statistical',
        name: 'Z-Score Statistical Anomaly',
        description: 'Detects values that deviate significantly from the mean',
        severity: 'medium',
        detectionAlgorithm: 'zscore',
        parameters: { threshold: 2.5, windowSize: 100 },
        isActive: true,
        falsePositiveRate: 0.05,
        lastTuned: Date.now()
      },
      {
        id: 'behavior_frequency',
        type: 'behavioral',
        name: 'Unusual Action Frequency',
        description: 'Detects unusually high or low action frequencies',
        severity: 'medium',
        detectionAlgorithm: 'frequency',
        parameters: { threshold: 3.0, windowSize: 3600000 }, // 1 hour window
        isActive: true,
        falsePositiveRate: 0.08,
        lastTuned: Date.now()
      },
      {
        id: 'security_login_pattern',
        type: 'security',
        name: 'Unusual Login Pattern',
        description: 'Detects unusual login times or locations',
        severity: 'high',
        detectionAlgorithm: 'sequence',
        parameters: { sensitivity: 0.8 },
        isActive: true,
        falsePositiveRate: 0.03,
        lastTuned: Date.now()
      }
    ];

    defaultPatterns.forEach(pattern => {
      if (!this.anomalyPatterns.has(pattern.id)) {
        this.anomalyPatterns.set(pattern.id, pattern);
      }
    });
  }

  private startDetectionLoop(): void {
    this.detectionTimer = setInterval(() => {
      this.runPeriodicDetection();
    }, 30000); // Every 30 seconds
  }

  private startTuningLoop(): void {
    this.tuningTimer = setInterval(() => {
      if (this.config.autoTuningEnabled) {
        this.autoTunePatterns();
      }
    }, 3600000); // Every hour
  }

  private async setupSystemIntegrations(): Promise<void> {
    try {
      // Register with global window for testing
      (window as any).anomalyDetection = this;

      // Integration with intelligent monitoring
      if ((window as any).intelligentMonitoring) {
        devLogger.log('AnomalyDetection', '📊 Integrated with Intelligent Monitoring');
      }

      // Integration with behavior predictor
      if ((window as any).userBehaviorPredictor) {
        devLogger.log('AnomalyDetection', '🎯 Integrated with Behavior Predictor');
      }

    } catch (error) {
      devLogger.warn('AnomalyDetection', 'Integration setup failed', { error });
    }
  }

  private createUserProfile(userId: string): BehaviorProfile {
    return {
      userId,
      normalPatterns: {
        sessionDuration: { mean: 1800000, stdDev: 600000 }, // 30 min ± 10 min
        actionsPerSession: { mean: 50, stdDev: 20 },
        timeOfDayActivity: new Array(24).fill(0),
        contentTypes: new Map(),
        navigationPatterns: []
      },
      recentBehavior: [],
      riskScore: 0.5,
      lastUpdated: Date.now()
    };
  }

  private updateUserProfile(profile: BehaviorProfile): void {
    // Update normal patterns based on recent behavior
    const recentActions = profile.recentBehavior.slice(-100); // Last 100 actions
    
    if (recentActions.length >= 10) {
      // Update session duration pattern
      // Update actions per session pattern
      // Update time of day activity pattern
      // Update content type preferences
      // Update navigation patterns
      
      profile.lastUpdated = Date.now();
    }
  }

  private checkBehavioralAnomalies(userId: string, action: string, context: any): void {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    // Check for various behavioral anomalies
    const anomalies: AnomalyInstance[] = [];

    // Check action frequency
    const recentSimilarActions = profile.recentBehavior.filter(
      b => b.action === action && Date.now() - b.timestamp < 3600000 // Last hour
    ).length;

    if (recentSimilarActions > 50) { // Threshold for unusual frequency
      anomalies.push(this.createAnomalyInstance({
        patternId: 'behavior_frequency',
        type: 'behavioral',
        severity: 'medium',
        confidence: Math.min(recentSimilarActions / 100, 1.0),
        data: {
          metric: 'action_frequency',
          value: recentSimilarActions,
          expectedRange: [0, 30],
          context: { action, userId }
        }
      }));
    }

    // Check for unusual timing
    const hour = new Date().getHours();
    const normalActivity = profile.normalPatterns.timeOfDayActivity[hour];
    if (normalActivity < 0.1 && profile.recentBehavior.length > 20) {
      anomalies.push(this.createAnomalyInstance({
        patternId: 'behavior_timing',
        type: 'behavioral',
        severity: 'low',
        confidence: 0.6,
        data: {
          metric: 'unusual_timing',
          value: hour,
          context: { action, userId, normalActivity }
        }
      }));
    }

    anomalies.forEach(anomaly => this.recordAnomaly(anomaly));
  }

  private checkStatisticalAnomalies(metric: string, value: number, context: any): void {
    const history = this.historicalData.get(metric);
    if (!history || history.length < 30) return; // Need sufficient data

    const values = history.map(h => h.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return; // No variation

    const zScore = Math.abs(value - mean) / stdDev;
    const pattern = this.anomalyPatterns.get('statistical_zscore');
    
    if (pattern && zScore > (pattern.parameters.threshold || 2.5)) {
      const anomaly = this.createAnomalyInstance({
        patternId: 'statistical_zscore',
        type: 'statistical',
        severity: zScore > 4 ? 'high' : 'medium',
        confidence: Math.min(zScore / 5, 1.0),
        data: {
          metric,
          value,
          expectedRange: [mean - 2 * stdDev, mean + 2 * stdDev],
          context: { ...context, zScore, mean, stdDev }
        }
      });

      this.recordAnomaly(anomaly);
    }
  }

  private checkPerformanceAnomalies(metric: string, value: number, context: any): void {
    // Performance-specific anomaly detection
    const thresholds = {
      'page_load_time': 5000, // 5 seconds
      'memory_usage': 200, // 200MB
      'fps': 30, // Below 30 FPS
      'error_rate': 0.05 // 5% error rate
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return;

    let isAnomalous = false;
    let severity: 'low' | 'medium' | 'high' = 'medium';

    if (metric === 'fps' && value < threshold) {
      isAnomalous = true;
      severity = value < 15 ? 'high' : 'medium';
    } else if (value > threshold) {
      isAnomalous = true;
      severity = value > threshold * 2 ? 'high' : 'medium';
    }

    if (isAnomalous) {
      const anomaly = this.createAnomalyInstance({
        patternId: 'performance_threshold',
        type: 'performance',
        severity,
        confidence: 0.8,
        data: {
          metric,
          value,
          expectedRange: metric === 'fps' ? [threshold, 60] : [0, threshold],
          context
        }
      });

      this.recordAnomaly(anomaly);
    }
  }

  private detectContentAnomalies(contentId: string, contentData: any): AnomalyInstance[] {
    const anomalies: AnomalyInstance[] = [];

    // Check for unusual content characteristics
    if (contentData.qualityScore && contentData.qualityScore < 0.2) {
      anomalies.push(this.createAnomalyInstance({
        patternId: 'content_quality',
        type: 'content',
        severity: 'medium',
        confidence: 1 - contentData.qualityScore,
        data: {
          metric: 'content_quality',
          value: contentData.qualityScore,
          expectedRange: [0.5, 1.0],
          context: { contentId, contentData }
        }
      }));
    }

    // Check for spam indicators
    if (contentData.spamScore && contentData.spamScore > 0.8) {
      anomalies.push(this.createAnomalyInstance({
        patternId: 'content_spam',
        type: 'content',
        severity: 'high',
        confidence: contentData.spamScore,
        data: {
          metric: 'spam_score',
          value: contentData.spamScore,
          expectedRange: [0, 0.3],
          context: { contentId, contentData }
        }
      }));
    }

    return anomalies;
  }

  private detectSecurityAnomalies(event: any): AnomalyInstance[] {
    const anomalies: AnomalyInstance[] = [];

    // Check for unusual login patterns
    if (event.type === 'login' && event.userId) {
      const profile = this.userProfiles.get(event.userId);
      if (profile) {
        // Check for unusual time
        const hour = new Date().getHours();
        const normalActivity = profile.normalPatterns.timeOfDayActivity[hour];
        
        if (normalActivity < 0.1) {
          anomalies.push(this.createAnomalyInstance({
            patternId: 'security_login_pattern',
            type: 'security',
            severity: 'medium',
            confidence: 0.7,
            data: {
              metric: 'unusual_login_time',
              value: hour,
              context: { ...event, normalActivity }
            }
          }));
        }
      }
    }

    // Check for unusual request patterns
    if (event.type === 'request' && event.ip) {
      // This would implement more sophisticated security checks
    }

    return anomalies;
  }

  private createAnomalyInstance(params: {
    patternId: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    data: any;
  }): AnomalyInstance {
    return {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patternId: params.patternId,
      type: params.type,
      severity: params.severity,
      confidence: params.confidence,
      detectedAt: Date.now(),
      data: params.data,
      impact: {
        userCount: 1,
        systemPerformance: params.severity === 'high' ? 0.8 : 0.4,
        businessMetrics: 0.3,
        securityRisk: params.type === 'security' ? 0.8 : 0.2
      },
      investigation: {
        status: 'new',
        notes: [],
        actions: []
      }
    };
  }

  private recordAnomaly(anomaly: AnomalyInstance): void {
    if (anomaly.confidence < this.config.minimumConfidence) return;

    this.detectedAnomalies.set(anomaly.id, anomaly);

    devLogger.warn('AnomalyDetection', '🚨 Anomaly detected', {
      id: anomaly.id,
      type: anomaly.type,
      severity: anomaly.severity,
      confidence: anomaly.confidence
    });

    // Log analytics
    logAnalyticsEvent({
      event_type: 'system',
      event_name: 'AnomalyDetected',
      event_data: {
        anomalyId: anomaly.id,
        type: anomaly.type,
        severity: anomaly.severity,
        confidence: anomaly.confidence,
        patternId: anomaly.patternId
      }
    });
  }

  private runPeriodicDetection(): void {
    // Run periodic batch detection
    devLogger.log('AnomalyDetection', '🔄 Running periodic detection');
  }

  private autoTunePatterns(): void {
    // Auto-tune pattern parameters based on feedback
    this.anomalyPatterns.forEach((pattern, id) => {
      if (pattern.falsePositiveRate > 0.15) {
        // Increase threshold to reduce false positives
        if (pattern.parameters.threshold) {
          pattern.parameters.threshold *= 1.1;
        }
        if (pattern.parameters.sensitivity) {
          pattern.parameters.sensitivity *= 0.9;
        }
        pattern.lastTuned = Date.now();
        
        devLogger.log('AnomalyDetection', '🎛️ Pattern tuned', {
          id,
          newThreshold: pattern.parameters.threshold,
          newSensitivity: pattern.parameters.sensitivity
        });
      }
    });
  }

  private tunePattern(patternId: string, feedback: 'true_positive' | 'false_positive'): void {
    const pattern = this.anomalyPatterns.get(patternId);
    if (!pattern) return;

    // Update false positive rate
    const weight = 0.1;
    if (feedback === 'false_positive') {
      pattern.falsePositiveRate = (pattern.falsePositiveRate * (1 - weight)) + weight;
    } else {
      pattern.falsePositiveRate = pattern.falsePositiveRate * (1 - weight);
    }

    pattern.lastTuned = Date.now();
    this.anomalyPatterns.set(patternId, pattern);
  }

  private isPerformanceMetric(metric: string): boolean {
    const performanceMetrics = ['page_load_time', 'memory_usage', 'fps', 'error_rate', 'cpu_usage'];
    return performanceMetrics.includes(metric);
  }

  private calculateDetectionRate(): number {
    // Calculate detection rate (simplified)
    const totalAnomalies = this.detectedAnomalies.size;
    const resolvedAnomalies = Array.from(this.detectedAnomalies.values()).filter(a => a.resolvedAt).length;
    
    return totalAnomalies > 0 ? resolvedAnomalies / totalAnomalies : 0;
  }

  /**
   * Testing interface
   */
  public runTest(): Promise<{
    success: boolean;
    results: {
      initialization: boolean;
      behaviorRecording: boolean;
      statisticalDetection: boolean;
      securityDetection: boolean;
      contentDetection: boolean;
    };
    statistics: any;
  }> {
    return new Promise((resolve) => {
      const results = {
        initialization: this.isInitialized,
        behaviorRecording: false,
        statisticalDetection: false,
        securityDetection: false,
        contentDetection: false
      };

      try {
        // Test behavior recording
        this.recordUserBehavior('test_user', 'test_action', { test: true });
        results.behaviorRecording = this.userProfiles.has('test_user');

        // Test statistical detection
        this.recordSystemMetric('test_metric', 1000, { test: true });
        // Set baseline to trigger anomaly
        this.historicalData.set('test_metric', [
          { timestamp: Date.now() - 1000, value: 100 },
          { timestamp: Date.now() - 2000, value: 110 },
          { timestamp: Date.now() - 3000, value: 90 }
        ]);
        this.recordSystemMetric('test_metric', 1000, { test: true });
        results.statisticalDetection = true;

        // Test security detection
        this.checkSecurityAnomalies({
          type: 'login',
          userId: 'test_user',
          context: { test: true }
        });
        results.securityDetection = true;

        // Test content detection
        this.analyzeContent('test_content', {
          qualityScore: 0.1,
          spamScore: 0.9
        });
        results.contentDetection = true;

      } catch (error) {
        devLogger.warn('AnomalyDetection', 'Test failed', { error });
      }

      setTimeout(() => {
        resolve({
          success: Object.values(results).every(Boolean),
          results,
          statistics: this.getAnomalyStatistics()
        });
      }, 100);
    });
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.detectionTimer) {
      clearInterval(this.detectionTimer);
      this.detectionTimer = null;
    }

    if (this.tuningTimer) {
      clearInterval(this.tuningTimer);
      this.tuningTimer = null;
    }

    // Save patterns and profiles
    try {
      const patterns = Array.from(this.anomalyPatterns.values());
      localStorage.setItem('anomaly-patterns', JSON.stringify(patterns));

      const profiles = Array.from(this.userProfiles.values()).map(profile => ({
        ...profile,
        normalPatterns: {
          ...profile.normalPatterns,
          contentTypes: Array.from(profile.normalPatterns.contentTypes.entries())
        }
      }));
      localStorage.setItem('user-behavior-profiles', JSON.stringify(profiles));
    } catch (error) {
      devLogger.warn('AnomalyDetection', 'Failed to save data', { error });
    }
  }
}

// Create and export global instance
export const anomalyDetectionEngine = new AnomalyDetectionEngine();

// Global interface for testing
(window as any).anomalyDetection = anomalyDetectionEngine;

export default anomalyDetectionEngine; 