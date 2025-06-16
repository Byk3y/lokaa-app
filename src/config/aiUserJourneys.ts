/**
 * AI User Journeys Configuration
 * Defines smart user experience flows that trigger based on user behavior and context
 */

export interface UserJourneyAction {
  type: 'component' | 'notification' | 'highlight' | 'redirect';
  component?: string;
  message?: string;
  target?: string;
  duration?: number;
  priority?: 'low' | 'medium' | 'high';
}

export interface UserJourneyCondition {
  type: 'first_visit' | 'user_role' | 'time_based' | 'action_count' | 'custom';
  key?: string;
  value?: any;
  operator?: 'equals' | 'greater_than' | 'less_than' | 'contains';
}

export interface UserJourneyTrigger {
  event: string;
  location: string;
  conditions: UserJourneyCondition[];
  cooldown?: number; // Minutes before trigger can fire again
}

export interface UserJourney {
  id: string;
  name: string;
  description: string;
  trigger: UserJourneyTrigger;
  actions: UserJourneyAction[];
  analytics: {
    trackingEvent: string;
    metadata?: Record<string, any>;
  };
  enabled: boolean;
  maxTriggers?: number; // Maximum times this journey can trigger per user
  version: string;
}

/**
 * AI User Journey Definitions
 */
export const AI_USER_JOURNEYS: UserJourney[] = [
  {
    id: 'first_time_space_welcome',
    name: 'First-Time Space Welcome',
    description: 'Welcome new users when they first enter a space',
    trigger: {
      event: 'space_entry',
      location: 'space_feed',
      conditions: [
        {
          type: 'first_visit',
          key: 'space_id',
          operator: 'equals'
        },
        {
          type: 'user_role',
          key: 'is_authenticated',
          value: true,
          operator: 'equals'
        }
      ],
      cooldown: 1440 // 24 hours cooldown
    },
    actions: [
      {
        type: 'component',
        component: 'WelcomePrompt',
        message: '👋 Welcome! Introduce yourself to the group.',
        priority: 'high',
        duration: 10000 // 10 seconds auto-dismiss
      }
    ],
    analytics: {
      trackingEvent: 'first_time_space_entry',
      metadata: {
        journey_id: 'first_time_space_welcome',
        journey_version: '1.0.0'
      }
    },
    enabled: true,
    maxTriggers: 1, // Only trigger once per user per space
    version: '1.0.0'
  },
  {
    id: 'empty_space_guidance',
    name: 'Empty Space Guidance',
    description: 'Guide users in spaces with no content',
    trigger: {
      event: 'space_entry',
      location: 'space_feed',
      conditions: [
        {
          type: 'custom',
          key: 'post_count',
          value: 0,
          operator: 'equals'
        },
        {
          type: 'user_role',
          key: 'can_post',
          value: true,
          operator: 'equals'
        }
      ],
      cooldown: 720 // 12 hours cooldown
    },
    actions: [
      {
        type: 'component',
        component: 'ContentGuidance',
        message: '🚀 This space is brand new! Be the first to share something.',
        priority: 'medium',
        duration: 8000
      }
    ],
    analytics: {
      trackingEvent: 'empty_space_guidance',
      metadata: {
        journey_id: 'empty_space_guidance',
        journey_version: '1.0.0'
      }
    },
    enabled: true,
    maxTriggers: 3, // Allow up to 3 triggers per user
    version: '1.0.0'
  },
  {
    id: 'returning_user_updates',
    name: 'Returning User Updates',
    description: 'Show updates to users who haven\'t visited in a while',
    trigger: {
      event: 'space_entry',
      location: 'space_feed',
      conditions: [
        {
          type: 'time_based',
          key: 'last_visit',
          value: 7, // 7 days
          operator: 'greater_than'
        },
        {
          type: 'custom',
          key: 'new_posts_count',
          value: 0,
          operator: 'greater_than'
        }
      ],
      cooldown: 1440 // 24 hours cooldown
    },
    actions: [
      {
        type: 'component',
        component: 'UpdatesSummary',
        message: '✨ Welcome back! Here\'s what you missed.',
        priority: 'medium',
        duration: 12000
      }
    ],
    analytics: {
      trackingEvent: 'returning_user_updates',
      metadata: {
        journey_id: 'returning_user_updates',
        journey_version: '1.0.0'
      }
    },
    enabled: true,
    maxTriggers: 5,
    version: '1.0.0'
  }
];

/**
 * Journey State Storage Keys
 */
export const JOURNEY_STORAGE_KEYS = {
  USER_JOURNEYS: 'ai_user_journeys',
  TRIGGER_HISTORY: 'journey_trigger_history',
  USER_PREFERENCES: 'journey_preferences'
} as const;

/**
 * Default Journey Preferences
 */
export const DEFAULT_JOURNEY_PREFERENCES = {
  enabled: true,
  frequency: 'normal', // 'minimal', 'normal', 'frequent'
  showOnMobile: true,
  autoHide: true,
  soundEnabled: false
} as const;

/**
 * Journey Analytics Events
 */
export const JOURNEY_ANALYTICS_EVENTS = {
  JOURNEY_TRIGGERED: 'journey_triggered',
  JOURNEY_COMPLETED: 'journey_completed',
  JOURNEY_DISMISSED: 'journey_dismissed',
  JOURNEY_INTERACTED: 'journey_interacted',
  JOURNEY_ERROR: 'journey_error'
} as const; 