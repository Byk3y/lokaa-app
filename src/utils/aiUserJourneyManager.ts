/**
 * AI User Journey Manager
 * Handles smart user experience flows, journey triggers, and state management
 */

import { 
  AI_USER_JOURNEYS, 
  UserJourney, 
  UserJourneyCondition, 
  UserJourneyAction,
  JOURNEY_STORAGE_KEYS,
  DEFAULT_JOURNEY_PREFERENCES,
  JOURNEY_ANALYTICS_EVENTS
} from '@/config/aiUserJourneys';

interface JourneyTriggerHistory {
  journeyId: string;
  userId: string;
  spaceId?: string;
  timestamp: number;
  triggerCount: number;
  lastTriggered: number;
  completed: boolean;
  dismissed: boolean;
}

interface JourneyContext {
  userId: string;
  spaceId?: string;
  userRole?: string;
  isAuthenticated: boolean;
  currentLocation: string;
  postCount?: number;
  memberCount?: number;
  lastVisit?: number;
  newPostsCount?: number;
  canPost?: boolean;
  spaceName?: string;
  [key: string]: any;
}

interface JourneyPreferences {
  enabled: boolean;
  frequency: 'minimal' | 'normal' | 'frequent';
  showOnMobile: boolean;
  autoHide: boolean;
  soundEnabled: boolean;
}

export class AIUserJourneyManager {
  private triggerHistory: Map<string, JourneyTriggerHistory> = new Map();
  private preferences: JourneyPreferences = DEFAULT_JOURNEY_PREFERENCES;
  private activeJourneys: Set<string> = new Set();
  private analytics: any = null;

  constructor() {
    this.loadState();
    this.setupAnalytics();
  }

  /**
   * Initialize analytics integration
   */
  private setupAnalytics() {
    // Check if analytics system is available (Phase 4B)
    if (typeof window !== 'undefined' && (window as any).analytics) {
      this.analytics = (window as any).analytics;
    }
  }

  /**
   * Load persisted state from localStorage
   */
  private loadState() {
    try {
      if (typeof window !== 'undefined') {
        // Load trigger history
        const historyData = localStorage.getItem(JOURNEY_STORAGE_KEYS.TRIGGER_HISTORY);
        if (historyData) {
          const parsed = JSON.parse(historyData);
          this.triggerHistory = new Map(Object.entries(parsed));
        }

        // Load preferences
        const prefsData = localStorage.getItem(JOURNEY_STORAGE_KEYS.USER_PREFERENCES);
        if (prefsData) {
          this.preferences = { ...DEFAULT_JOURNEY_PREFERENCES, ...JSON.parse(prefsData) };
        }
      }
    } catch (error) {
      console.warn('Failed to load journey state:', error);
    }
  }

  /**
   * Save state to localStorage
   */
  private saveState() {
    try {
      if (typeof window !== 'undefined') {
        // Save trigger history
        const historyObj = Object.fromEntries(this.triggerHistory);
        localStorage.setItem(JOURNEY_STORAGE_KEYS.TRIGGER_HISTORY, JSON.stringify(historyObj));

        // Save preferences
        localStorage.setItem(JOURNEY_STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(this.preferences));
      }
    } catch (error) {
      console.warn('Failed to save journey state:', error);
    }
  }

  /**
   * Generate unique key for journey trigger history
   */
  private getTriggerKey(journeyId: string, userId: string, spaceId?: string): string {
    return spaceId ? `${journeyId}:${userId}:${spaceId}` : `${journeyId}:${userId}`;
  }

  /**
   * Check if a journey condition is met
   */
  private evaluateCondition(condition: UserJourneyCondition, context: JourneyContext): boolean {
    const { type, key, value, operator = 'equals' } = condition;

    switch (type) {
      case 'first_visit':
        if (key === 'space_id' && context.spaceId) {
          const triggerKey = this.getTriggerKey('first_time_space_welcome', context.userId, context.spaceId);
          const history = this.triggerHistory.get(triggerKey);
          return !history || history.triggerCount === 0;
        }
        return false;

      case 'user_role':
        const roleValue = context[key as keyof JourneyContext];
        return this.compareValues(roleValue, value, operator);

      case 'time_based':
        if (key === 'last_visit' && context.lastVisit) {
          const daysSinceLastVisit = (Date.now() - context.lastVisit) / (1000 * 60 * 60 * 24);
          return this.compareValues(daysSinceLastVisit, value, operator);
        }
        return false;

      case 'action_count':
        // Future implementation for tracking action counts
        return false;

      case 'custom':
        const customValue = context[key as keyof JourneyContext];
        return this.compareValues(customValue, value, operator);

      default:
        return false;
    }
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: any, expected: any, operator: string): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      case 'contains':
        return String(actual).toLowerCase().includes(String(expected).toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Check if journey can be triggered (cooldown, max triggers, etc.)
   */
  private canTriggerJourney(journey: UserJourney, context: JourneyContext): boolean {
    if (!journey.enabled || !this.preferences.enabled) {
      return false;
    }

    const triggerKey = this.getTriggerKey(journey.id, context.userId, context.spaceId);
    const history = this.triggerHistory.get(triggerKey);

    // Check if journey is already active
    if (this.activeJourneys.has(triggerKey)) {
      return false;
    }

    // Check max triggers
    if (journey.maxTriggers && history && history.triggerCount >= journey.maxTriggers) {
      return false;
    }

    // Check cooldown
    if (journey.trigger.cooldown && history && history.lastTriggered) {
      const cooldownMs = journey.trigger.cooldown * 60 * 1000;
      const timeSinceLastTrigger = Date.now() - history.lastTriggered;
      if (timeSinceLastTrigger < cooldownMs) {
        return false;
      }
    }

    // Check if on mobile and mobile is disabled
    if (!this.preferences.showOnMobile && this.isMobileDevice()) {
      return false;
    }

    return true;
  }

  /**
   * Check if device is mobile
   */
  private isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  }

  /**
   * Trigger a journey
   */
  public async triggerJourney(event: string, context: JourneyContext): Promise<boolean> {
    try {
      // Find matching journeys
      const matchingJourneys = AI_USER_JOURNEYS.filter(journey => {
        // Check basic trigger match
        if (journey.trigger.event !== event || journey.trigger.location !== context.currentLocation) {
          return false;
        }

        // Check if can trigger
        if (!this.canTriggerJourney(journey, context)) {
          return false;
        }

        // Evaluate all conditions
        return journey.trigger.conditions.every(condition => 
          this.evaluateCondition(condition, context)
        );
      });

      // Execute matching journeys
      let triggered = false;
      for (const journey of matchingJourneys) {
        const success = await this.executeJourney(journey, context);
        if (success) {
          triggered = true;
          this.recordTrigger(journey, context);
        }
      }

      return triggered;
    } catch (error) {
      console.error('Error triggering journey:', error);
      this.trackAnalytics(JOURNEY_ANALYTICS_EVENTS.JOURNEY_ERROR, { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Execute a journey's actions
   */
  private async executeJourney(journey: UserJourney, context: JourneyContext): Promise<boolean> {
    try {
      const triggerKey = this.getTriggerKey(journey.id, context.userId, context.spaceId);
      this.activeJourneys.add(triggerKey);

      // Track journey trigger
      this.trackAnalytics(JOURNEY_ANALYTICS_EVENTS.JOURNEY_TRIGGERED, {
        ...journey.analytics.metadata,
        journey_id: journey.id,
        user_id: context.userId,
        space_id: context.spaceId,
        location: context.currentLocation
      });

      // Execute actions
      for (const action of journey.actions) {
        await this.executeAction(action, journey, context);
      }

      return true;
    } catch (error) {
      console.error(`Error executing journey ${journey.id}:`, error);
      return false;
    }
  }

  /**
   * Execute a specific journey action
   */
  private async executeAction(action: UserJourneyAction, journey: UserJourney, context: JourneyContext): Promise<void> {
    switch (action.type) {
      case 'component':
        await this.showComponent(action, journey, context);
        break;
      case 'notification':
        await this.showNotification(action, journey, context);
        break;
      case 'highlight':
        await this.highlightElement(action, journey, context);
        break;
      case 'redirect':
        await this.redirectUser(action, journey, context);
        break;
    }
  }

  /**
   * Show a component (e.g., WelcomePrompt)
   */
  private async showComponent(action: UserJourneyAction, journey: UserJourney, context: JourneyContext): Promise<void> {
    if (action.component === 'WelcomePrompt') {
      const event = new CustomEvent('showWelcomePrompt', {
        detail: {
          message: action.message,
          duration: action.duration,
          spaceName: context.spaceName,
          memberCount: context.memberCount,
          onDismiss: () => this.handleJourneyDismiss(journey, context),
          onAction: (actionType: string) => this.handleJourneyAction(journey, context, actionType)
        }
      });
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(event);
      }
    }
  }

  /**
   * Show a notification
   */
  private async showNotification(action: UserJourneyAction, journey: UserJourney, context: JourneyContext): Promise<void> {
    // Future implementation for notifications
    console.log('Notification action:', action);
  }

  /**
   * Highlight an element
   */
  private async highlightElement(action: UserJourneyAction, journey: UserJourney, context: JourneyContext): Promise<void> {
    // Future implementation for element highlighting
    console.log('Highlight action:', action);
  }

  /**
   * Redirect user
   */
  private async redirectUser(action: UserJourneyAction, journey: UserJourney, context: JourneyContext): Promise<void> {
    if (action.target && typeof window !== 'undefined') {
      window.location.href = action.target;
    }
  }

  /**
   * Handle journey dismissal
   */
  private handleJourneyDismiss(journey: UserJourney, context: JourneyContext) {
    const triggerKey = this.getTriggerKey(journey.id, context.userId, context.spaceId);
    this.activeJourneys.delete(triggerKey);

    // Update history
    const history = this.triggerHistory.get(triggerKey);
    if (history) {
      history.dismissed = true;
    }

    this.saveState();
    this.trackAnalytics(JOURNEY_ANALYTICS_EVENTS.JOURNEY_DISMISSED, {
      journey_id: journey.id,
      user_id: context.userId,
      space_id: context.spaceId
    });
  }

  /**
   * Handle journey action
   */
  private handleJourneyAction(journey: UserJourney, context: JourneyContext, actionType: string) {
    this.trackAnalytics(JOURNEY_ANALYTICS_EVENTS.JOURNEY_INTERACTED, {
      journey_id: journey.id,
      user_id: context.userId,
      space_id: context.spaceId,
      action_type: actionType
    });

    // Handle specific actions
    if (actionType === 'create_post') {
      // Trigger post creation flow
      const event = new CustomEvent('openPostCreation');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(event);
      }
    } else if (actionType === 'explore') {
      // Track exploration intent
      this.trackAnalytics('exploration_started', {
        journey_id: journey.id,
        user_id: context.userId,
        space_id: context.spaceId
      });
    }
  }

  /**
   * Record journey trigger in history
   */
  private recordTrigger(journey: UserJourney, context: JourneyContext) {
    const triggerKey = this.getTriggerKey(journey.id, context.userId, context.spaceId);
    const existing = this.triggerHistory.get(triggerKey);
    
    const history: JourneyTriggerHistory = {
      journeyId: journey.id,
      userId: context.userId,
      spaceId: context.spaceId,
      timestamp: Date.now(),
      triggerCount: existing ? existing.triggerCount + 1 : 1,
      lastTriggered: Date.now(),
      completed: false,
      dismissed: false
    };

    this.triggerHistory.set(triggerKey, history);
    this.saveState();
  }

  /**
   * Track analytics event
   */
  private trackAnalytics(eventName: string, data: Record<string, any>) {
    if (this.analytics && this.analytics.logEvent) {
      this.analytics.logEvent({
        event_type: 'user',
        event_name: eventName,
        event_data: data
      });
    }
  }

  /**
   * Public API: Trigger space entry journey
   */
  public async onSpaceEntry(context: JourneyContext): Promise<boolean> {
    return this.triggerJourney('space_entry', {
      ...context,
      currentLocation: 'space_feed'
    });
  }

  /**
   * Public API: Update preferences
   */
  public updatePreferences(newPreferences: Partial<JourneyPreferences>) {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.saveState();
  }

  /**
   * Public API: Get journey statistics
   */
  public getJourneyStats() {
    return {
      totalJourneys: AI_USER_JOURNEYS.length,
      triggeredJourneys: this.triggerHistory.size,
      activeJourneys: this.activeJourneys.size,
      preferences: this.preferences
    };
  }

  /**
   * Public API: Clear journey history (for testing)
   */
  public clearHistory() {
    this.triggerHistory.clear();
    this.activeJourneys.clear();
    this.saveState();
  }
}

// Create global instance
export const aiUserJourneyManager = new AIUserJourneyManager();

// Global interface for testing and debugging
if (typeof window !== 'undefined') {
  (window as any).aiUserJourneyManager = aiUserJourneyManager;
} 