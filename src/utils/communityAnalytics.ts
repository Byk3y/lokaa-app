import { posthog } from '@/integrations/posthog';

// Community-specific analytics events for Lokaa
export const CommunityAnalytics = {
  // Space-related events
  trackSpaceCreated: (spaceId: string, spaceName: string, category?: string) => {
    posthog?.capture('space_created', {
      space_id: spaceId,
      space_name: spaceName,
      category,
      timestamp: new Date().toISOString()
    });
  },

  trackSpaceJoined: (spaceId: string, spaceName: string) => {
    posthog?.capture('space_joined', {
      space_id: spaceId,
      space_name: spaceName,
      timestamp: new Date().toISOString()
    });
  },

  trackSpaceCreated: (spaceId: string, spaceName: string, category: string) => {
    posthog?.capture('space_created', {
      space_id: spaceId,
      space_name: spaceName,
      category,
      timestamp: new Date().toISOString(),
    });
  },

  trackSpaceLeft: (spaceId: string, spaceName: string) => {
    posthog?.capture('space_left', {
      space_id: spaceId,
      space_name: spaceName,
      timestamp: new Date().toISOString()
    });
  },

  // Post-related events
  trackPostCreated: (postId: string, spaceId: string, postType: string) => {
    posthog?.capture('post_created', {
      post_id: postId,
      space_id: spaceId,
      post_type: postType,
      timestamp: new Date().toISOString()
    });
  },

  trackPostLiked: (postId: string, spaceId: string) => {
    posthog?.capture('post_liked', {
      post_id: postId,
      space_id: spaceId,
      timestamp: new Date().toISOString()
    });
  },

  trackPostCommented: (postId: string, spaceId: string, commentLength: number) => {
    posthog?.capture('post_commented', {
      post_id: postId,
      space_id: spaceId,
      comment_length: commentLength,
      timestamp: new Date().toISOString()
    });
  },

  trackPostShared: (postId: string, spaceId: string, shareMethod: string) => {
    posthog?.capture('post_shared', {
      post_id: postId,
      space_id: spaceId,
      share_method: shareMethod,
      timestamp: new Date().toISOString()
    });
  },

  // Search events
  trackSearch: (query: string, resultsCount: number, spaceId?: string) => {
    posthog?.capture('search_performed', {
      query,
      results_count: resultsCount,
      space_id: spaceId,
      timestamp: new Date().toISOString()
    });
  },

  // User engagement events
  trackProfileView: (profileId: string, profileName: string) => {
    posthog?.capture('profile_viewed', {
      profile_id: profileId,
      profile_name: profileName,
      timestamp: new Date().toISOString()
    });
  },

  trackSettingsChanged: (settingType: string, settingValue: any) => {
    posthog?.capture('settings_changed', {
      setting_type: settingType,
      setting_value: settingValue,
      timestamp: new Date().toISOString()
    });
  },

  // Conversion events
  trackSignup: (method: string, source?: string) => {
    posthog?.capture('user_signed_up', {
      method,
      source,
      timestamp: new Date().toISOString()
    });
  },

  trackLogin: (method: string) => {
    posthog?.capture('user_logged_in', {
      method,
      timestamp: new Date().toISOString()
    });
  },

  // Feature usage
  trackFeatureUsed: (featureName: string, context?: Record<string, any>) => {
    posthog?.capture('feature_used', {
      feature: featureName,
      ...context,
      timestamp: new Date().toISOString()
    });
  },

  // Error tracking
  trackError: (errorType: string, errorMessage: string, context?: Record<string, any>) => {
    posthog?.capture('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      ...context,
      timestamp: new Date().toISOString()
    });
  }
};

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).communityAnalytics = CommunityAnalytics;
}
