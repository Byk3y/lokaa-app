// Notification system types - matching Cursor's database schema
export type NotificationType = 
  | 'new_post'
  | 'comment_reply'
  | 'mention'
  | 'space_join'
  | 'post_like';

export type ActorRelationship = 
  | 'admin'
  | 'following'
  | 'member';

export interface NotificationItem {
  id: string;
  user_id: string;           // recipient
  actor_id: string;          // person who triggered notification
  type: NotificationType;
  title: string;             // post title with user emojis (🚀)
  content_preview?: string;  // truncated content
  actor_relationship?: ActorRelationship;
  space_id?: string;         // context space
  target_id?: string;        // post_id, comment_id, etc.
  read: boolean;             // for blue dot indicator
  clicked: boolean;          // click tracking
  created_at: string;        // ISO timestamp
  expires_at?: string;       // optional expiration
  
  // ✅ NEW: Batching fields for Phase 2.5 Smart Batching System
  batch_key?: string;        // groups similar notifications
  actor_count?: number;      // total count of actors in batch
  actor_names?: string[];    // array of actor names for display
  last_actor_id?: string;    // most recent actor in batch
  batch_updated_at?: string; // when batch was last updated
}

export interface NotificationWithActor extends NotificationItem {
  actor: {
    id: string;
    full_name?: string;
    avatar_url?: string;
    first_name?: string;
    last_name?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
  space?: {
    id: string;
    name: string;
    subdomain: string;
    icon_image?: string | null;
  };
}

export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  space_activity: boolean;
  direct_messages: boolean;
  affiliate_updates: boolean;
  created_at: string;
  updated_at: string;
}

// ✅ NEW: Space-specific notification preferences (matching Skool)
export type DigestEmailFrequency = 'never' | 'daily' | 'weekly' | 'monthly';
export type NotificationsEmailFrequency = 'never' | 'immediate' | 'hourly' | 'daily';

export interface SpaceNotificationPreferences {
  id?: string;
  user_id: string;
  space_id: string;
  
  // Email frequency settings (Skool-style)
  digest_email_frequency: DigestEmailFrequency;
  notifications_email_frequency: NotificationsEmailFrequency;
  
  // Individual notification type preferences (null = inherit from global)
  new_posts?: boolean | null;
  comments?: boolean | null;
  likes?: boolean | null;
  mentions?: boolean | null;
  space_joins?: boolean | null;
  
  // Skool-specific notification types
  admin_announcements: boolean;
  event_reminders: boolean;
  new_customers?: boolean | null; // Only for owners/admins
  
  // Push and email overrides (null = inherit from global)
  push_enabled?: boolean | null;
  email_enabled?: boolean | null;
  
  // Quiet hours (null = inherit from global)
  quiet_hours_enabled?: boolean | null;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  
  created_at?: string;
  updated_at?: string;
}

// Effective preferences after inheritance resolution
export interface EffectiveNotificationPreferences {
  user_id: string;
  space_id?: string;
  digest_email_frequency: DigestEmailFrequency;
  notifications_email_frequency: NotificationsEmailFrequency;
  new_posts: boolean;
  comments: boolean;
  likes: boolean;
  mentions: boolean;
  space_joins: boolean;
  admin_announcements: boolean;
  event_reminders: boolean;
  new_customers: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
}

// Space with user's notification preferences
export interface SpaceWithNotificationPreferences {
  id: string;
  name: string;
  subdomain: string;
  icon_image?: string | null;
  user_role: 'owner' | 'admin' | 'member';
  preferences: SpaceNotificationPreferences;
  effective_preferences: EffectiveNotificationPreferences;
}

export interface CreateNotificationParams {
  user_id: string;
  actor_id: string;
  type: NotificationType;
  title: string;
  content_preview?: string;
  actor_relationship?: ActorRelationship;
  space_id?: string;
  target_id?: string;
  expires_at?: string;
}

export interface NotificationActionData {
  type: NotificationType;
  space_id?: string;
  space_subdomain?: string;
  target_id?: string;
  post_id?: string;
  comment_id?: string;
}

// Skool-style notification display helpers
export interface NotificationDisplayData {
  id: string;
  actorName: string;
  actorAvatar?: string;
  actorRelationship?: ActorRelationship;
  actionText: string;
  title: string;
  timeAgo: string;
  isUnread: boolean;
  navigationData: NotificationActionData;
  hasVerifiedBadge?: boolean;
}

// Notification list response for pagination
export interface NotificationListResponse {
  notifications: NotificationWithActor[];
  hasMore: boolean;
  nextCursor?: string;
  totalCount: number;
  unreadCount: number;
}

// Hook return types
export interface UseNotificationsReturn {
  notifications: NotificationWithActor[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => void;
}

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
}

// ✅ NEW: Hook return types for space notification preferences
export interface UseSpaceNotificationPreferencesReturn {
  preferences: SpaceNotificationPreferences | null;
  effectivePreferences: EffectiveNotificationPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePreference: (key: keyof SpaceNotificationPreferences, value: any) => Promise<boolean>;
  updateMultiplePreferences: (updates: Partial<SpaceNotificationPreferences>) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export interface UseUserSpacesNotificationPreferencesReturn {
  spacesWithPreferences: SpaceWithNotificationPreferences[];
  isLoading: boolean;
  error: string | null;
  getSpacePreferences: (spaceId: string) => SpaceNotificationPreferences | null;
  updateSpacePreferences: (spaceId: string, updates: Partial<SpaceNotificationPreferences>) => Promise<boolean>;
  refresh: () => Promise<void>;
}

// Real-time notification events
export interface NotificationRealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: NotificationItem;
  old?: NotificationItem;
}

// Notification creation helpers
export interface NotificationTriggerData {
  recipientId: string;
  actorId: string;
  spaceId?: string;
  postId?: string;
  commentId?: string;
  postTitle?: string;
  commentContent?: string;
}

export interface PostLikeNotificationData extends NotificationTriggerData {
  postTitle: string;
  postId: string;
  spaceId: string;
}

export interface CommentReplyNotificationData extends NotificationTriggerData {
  postTitle: string;
  postId: string;
  commentId: string;
  spaceId: string;
}

export interface SpaceJoinNotificationData extends NotificationTriggerData {
  spaceId: string;
  spaceName: string;
}

export interface MentionNotificationData extends NotificationTriggerData {
  postTitle: string;
  postId: string;
  spaceId: string;
  mentionText: string;
}

// ✅ NEW: Phase 2.5 Smart Batching System Interfaces

export interface BatchedNotificationParams {
  user_id: string;
  actor_id: string;
  type: NotificationType;
  title: string;
  content_preview?: string;
  actor_relationship?: ActorRelationship;
  space_id?: string;
  target_id?: string;
  expires_at?: string;
}

export interface BatchDisplayInfo {
  singleActorName: string;
  totalCount: number;
  otherActorNames: string[];
  displayText: string;
}

export interface BatchStatistics {
  totalNotifications: number;
  batchedNotifications: number;
  averageBatchSize: number;
  topBatchedTypes: Array<{ type: string; count: number }>;
}

export interface NotificationBatchConfig {
  batchWindow: number;        // minutes within which to batch similar notifications
  maxBatchWindow: number;     // maximum hours to keep batching
  maxBatchSize: number;       // maximum notifications per batch
  maxDisplayNames: number;    // maximum names to show in "A, B, C and X others"
}