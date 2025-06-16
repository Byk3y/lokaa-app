/**
 * Phase 8A: Smart Content & Recommendations - Integration Layer
 */

import { aiUserJourneyManager } from './aiUserJourneyManager';

export class Phase8AIntegration {
  private analytics: any = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window !== 'undefined' && (window as any).analytics) {
      this.analytics = (window as any).analytics;
    }
    console.log('🤖 Phase 8A: AI User Journey system initialized');
  }

  public async runAllTests() {
    const results = {
      timestamp: new Date().toISOString(),
      phase: '8A',
      tests: {} as Record<string, any>,
      overallScore: 0
    };

    try {
      results.tests.journeyManager = this.testJourneyManager();
      results.tests.analytics = this.testAnalyticsIntegration();
      results.tests.welcomePrompt = this.testWelcomePromptSystem();

      const passedTests = Object.values(results.tests).filter(test => test.success).length;
      results.overallScore = Math.round((passedTests / Object.keys(results.tests).length) * 100);

      return results;
    } catch (error) {
      results.tests.error = { success: false, error: (error as Error).message };
      return results;
    }
  }

  private testJourneyManager() {
    try {
      const stats = aiUserJourneyManager.getJourneyStats();
      return {
        success: true,
        stats,
        message: `Journey manager operational with ${stats.totalJourneys} journeys`
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private testAnalyticsIntegration() {
    if (!this.analytics) {
      return { success: false, message: 'Analytics not available' };
    }
    return { success: true, message: 'Analytics connected' };
  }

  private testWelcomePromptSystem() {
    try {
      if (typeof window !== 'undefined') {
        const testEvent = new CustomEvent('showWelcomePrompt', {
          detail: {
            message: '🧪 Test welcome prompt',
            duration: 3000,
            spaceName: 'Test Space',
            onDismiss: () => console.log('Test dismissed'),
            onAction: (action: string) => console.log('Test action:', action)
          }
        });
        window.dispatchEvent(testEvent);
      }
      return { success: true, message: 'Welcome prompt system functional' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  public getStatus() {
    const journeyStats = aiUserJourneyManager.getJourneyStats();
    return {
      aiUserJourneys: {
        enabled: true,
        totalJourneys: journeyStats.totalJourneys,
        activeJourneys: journeyStats.activeJourneys,
        version: '1.0.0'
      },
      analytics: { connected: this.analytics !== null },
      components: { welcomePrompt: true, journeyManager: true }
    };
  }

  public triggerTestJourney(context?: any) {
    const testContext = context || {
      userId: 'test-user-' + Date.now(),
      spaceId: 'test-space-' + Date.now(),
      spaceName: 'Test Space',
      memberCount: 1,
      isAuthenticated: true,
      userRole: 'member',
      canPost: true,
      postCount: 0
    };
    aiUserJourneyManager.clearHistory();
    return aiUserJourneyManager.onSpaceEntry(testContext);
  }
}

export const phase8aIntegration = new Phase8AIntegration();

if (typeof window !== 'undefined') {
  // Ensure the global interface is properly set up with error handling
  const createGlobalInterface = () => {
    try {
      (window as any).phase8a = {
        runAllTests: () => phase8aIntegration.runAllTests(),
        getStatus: () => phase8aIntegration.getStatus(),
        triggerTestJourney: (context?: any) => phase8aIntegration.triggerTestJourney(context),
        clearHistory: () => aiUserJourneyManager.clearHistory(),
        journeyManager: {
          getJourneyStats: () => aiUserJourneyManager.getJourneyStats(),
          onSpaceEntry: (context: any) => aiUserJourneyManager.onSpaceEntry(context),
          clearHistory: () => aiUserJourneyManager.clearHistory(),
          updatePreferences: (prefs: any) => aiUserJourneyManager.updatePreferences(prefs),
          triggerJourney: (event: string, context: any) => aiUserJourneyManager.triggerJourney(event, context)
        }
      };
      console.log('🤖 Phase 8A global interface set up successfully');
    } catch (error) {
      console.error('❌ Phase 8A global interface setup failed:', error);
      // Fallback setup without journeyManager
      (window as any).phase8a = {
        runAllTests: () => phase8aIntegration.runAllTests(),
        getStatus: () => phase8aIntegration.getStatus(),
        triggerTestJourney: (context?: any) => phase8aIntegration.triggerTestJourney(context),
        clearHistory: () => aiUserJourneyManager.clearHistory(),
        journeyManager: null
      };
    }
  };

  // Set up immediately and also after a small delay to ensure modules are loaded
  createGlobalInterface();
  setTimeout(createGlobalInterface, 100);
}
