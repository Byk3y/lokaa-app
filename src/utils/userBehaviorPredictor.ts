/**
 * 🧠 Phase 8B: User Behavior Prediction System
 */

import { logAnalyticsEvent } from './analytics';
import { devLogger } from './developmentLogger';

export interface BehaviorPattern {
  userId: string;
  action: string;
  confidence: number;
  frequency: number;
  timestamp: number;
}

export interface BehaviorPrediction {
  id: string;
  predictedAction: string;
  confidence: number;
  timestamp: number;
}

export class UserBehaviorPredictor {
  private patterns = new Map<string, BehaviorPattern[]>();
  private predictions = new Map<string, BehaviorPrediction>();

  constructor() {
    devLogger.log('BehaviorPredictor', '🧠 User Behavior Predictor initialized');
  }

  public recordBehavior(userId: string, action: string): void {
    const patterns = this.patterns.get(userId) || [];
    
    const existingPattern = patterns.find(p => p.action === action);
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.confidence = Math.min(existingPattern.confidence + 0.1, 1);
      existingPattern.timestamp = Date.now();
    } else {
      patterns.push({
        userId,
        action,
        confidence: 0.5,
        frequency: 1,
        timestamp: Date.now()
      });
    }

    this.patterns.set(userId, patterns);

    logAnalyticsEvent({
      event_type: 'user',
      event_name: 'BehaviorRecorded',
      event_data: { action, userId }
    });
  }

  public predictNextAction(userId: string): BehaviorPrediction | null {
    const patterns = this.patterns.get(userId) || [];
    if (patterns.length === 0) return null;

    const bestPattern = patterns.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    const prediction: BehaviorPrediction = {
      id: `pred_${Date.now()}`,
      predictedAction: bestPattern.action,
      confidence: bestPattern.confidence,
      timestamp: Date.now()
    };

    this.predictions.set(prediction.id, prediction);
    return prediction;
  }

  public getStatus() {
    return {
      usersTracked: this.patterns.size,
      totalPatterns: Array.from(this.patterns.values()).reduce((sum, patterns) => sum + patterns.length, 0),
      activePredictions: this.predictions.size
    };
  }

  public runTest(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.recordBehavior('test_user', 'test_action');
        const prediction = this.predictNextAction('test_user');
        devLogger.log('BehaviorPredictor', '✅ Test completed', { prediction });
        resolve(true);
      } catch (error) {
        devLogger.error('BehaviorPredictor', 'Test failed', { error });
        resolve(false);
      }
    });
  }
}

export const userBehaviorPredictor = new UserBehaviorPredictor();

if (typeof window !== 'undefined') {
  (window as any).userBehaviorPredictor = {
    getStatus: () => userBehaviorPredictor.getStatus(),
    runTest: () => userBehaviorPredictor.runTest(),
    recordBehavior: (userId: string, action: string) => userBehaviorPredictor.recordBehavior(userId, action),
    predictNextAction: (userId: string) => userBehaviorPredictor.predictNextAction(userId)
  };
}

export default userBehaviorPredictor; 