import posthog from 'posthog-js';
import { log } from '@/utils/logger';

// PostHog configuration
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.posthog.com';

// Initialize PostHog
export function initializePostHog() {
  console.log('🔧 [PostHog] Initializing...', { 
    key: POSTHOG_KEY ? 'Set' : 'Missing', 
    host: POSTHOG_HOST 
  });
  
  if (!POSTHOG_KEY) {
    log.warn('PostHog', 'PostHog key not found - analytics disabled');
    console.error('❌ [PostHog] API key missing!');
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only', // Only create profiles for identified users
      capture_pageview: true, // Enable automatic page view tracking
      capture_pageleave: true,
      loaded: (posthog) => {
        log.debug('PostHog', 'PostHog loaded successfully');
        console.log('✅ [PostHog] Loaded successfully!');
        
        // Send a test event immediately
        posthog.capture('posthog_initialized', {
          timestamp: new Date().toISOString(),
          source: 'app_initialization'
        });
        console.log('📊 [PostHog] Test event sent');
        
        // Track initial page view
        posthog.capture('$pageview', {
          $current_url: window.location.href,
          page_title: document.title
        });
        console.log('📄 [PostHog] Initial page view tracked');
      },
      // Enable in all environments for testing
      disabled: false,
    });

    log.info('PostHog', 'PostHog initialized successfully');
  } catch (error) {
    log.error('PostHog', 'Failed to initialize PostHog:', error);
  }
}

// Export PostHog instance for use throughout the app
export { posthog };

// Helper functions for common analytics events
export const PostHogAnalytics = {
  // Track page views
  trackPageView: (pageName: string, properties?: Record<string, any>) => {
    posthog.capture('$pageview', {
      page: pageName,
      ...properties,
    });
  },

  // Track user actions
  trackEvent: (eventName: string, properties?: Record<string, any>) => {
    posthog.capture(eventName, properties);
  },

  // Identify users
  identify: (userId: string, properties?: Record<string, any>) => {
    posthog.identify(userId, properties);
  },

  // Set user properties
  setUserProperties: (properties: Record<string, any>) => {
    posthog.people.set(properties);
  },

  // Track conversions
  trackConversion: (conversionType: string, value?: number, properties?: Record<string, any>) => {
    posthog.capture('conversion', {
      conversion_type: conversionType,
      value,
      ...properties,
    });
  },

  // Track feature usage
  trackFeatureUsage: (featureName: string, properties?: Record<string, any>) => {
    posthog.capture('feature_used', {
      feature: featureName,
      ...properties,
    });
  },

  // Track errors
  trackError: (error: Error, context?: Record<string, any>) => {
    posthog.capture('error', {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });
  },

  // Track space interactions
  trackSpaceInteraction: (action: string, spaceId: string, properties?: Record<string, any>) => {
    posthog.capture('space_interaction', {
      action,
      space_id: spaceId,
      ...properties,
    });
  },

  // Track post interactions
  trackPostInteraction: (action: string, postId: string, properties?: Record<string, any>) => {
    posthog.capture('post_interaction', {
      action,
      post_id: postId,
      ...properties,
    });
  },

  // Track search
  trackSearch: (query: string, resultsCount: number, properties?: Record<string, any>) => {
    posthog.capture('search', {
      query,
      results_count: resultsCount,
      ...properties,
    });
  },
};

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).posthog = posthog;
  (window as any).posthogAnalytics = PostHogAnalytics;
}
