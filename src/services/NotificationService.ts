import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import { notificationBatchManager } from './NotificationBatchManager';
import { pushNotificationIntegrationService } from './PushNotificationIntegrationService';
import type {
  NotificationItem,
  NotificationWithActor,
  NotificationPreferences,
  CreateNotificationParams,
  NotificationListResponse,
  NotificationType,
  ActorRelationship,
  PostLikeNotificationData,
  CommentReplyNotificationData,
  SpaceJoinNotificationData,
  MentionNotificationData,
  NewCustomerNotificationData,
  BatchedNotificationParams,
  EffectiveNotificationPreferences
} from '@/types/notification';

export class NotificationService {
  private supabase = getSupabaseClient();

  /**
   * Get notifications for a user with pagination
   */
  async getNotifications(
    userId: string,
    page = 1,
    limit = 25,
    type?: NotificationType
  ): Promise<NotificationListResponse> {
    try {
      const offset = (page - 1) * limit;
      
      // Use a direct SQL query to bypass PostgREST relationship complexity
      const { data, error } = await this.supabase
        .rpc('get_notifications_with_actors', {
          user_id_param: userId,
          offset_param: offset,
          limit_param: limit,
          type_param: type || null
        });

      if (error) {
        log.warn('NotificationService', 'RPC function not found or error:', error);
        // Return empty result if RPC doesn't exist
        return {
          notifications: [],
          hasMore: false,
          nextCursor: undefined,
          totalCount: 0,
          unreadCount: 0
        };
      }

      // Get total count and unread count using direct queries
      const [totalResult, unreadResult] = await Promise.all([
        this.supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        this.supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false)
      ]);

      const totalCount = (totalResult as any).count || 0;
      const unreadCount = (unreadResult as any).count || 0;
      const hasMore = offset + limit < totalCount;

      // Transform the RPC response to match the expected NotificationWithActor format
      const enrichedNotifications: NotificationWithActor[] = (data || []).map(notification => ({
        id: notification.id,
        user_id: notification.user_id,
        actor_id: notification.actor_id,
        type: notification.type,
        title: notification.title,
        content_preview: notification.content_preview,
        actor_relationship: notification.actor_relationship,
        space_id: notification.space_id,
        target_id: notification.target_id,
        read: notification.read,
        clicked: notification.clicked,
        created_at: notification.created_at,
        expires_at: notification.expires_at,
        batch_key: notification.batch_key,
        actor_count: notification.actor_count,
        actor_names: notification.actor_names,
        last_actor_id: notification.last_actor_id,
        batch_updated_at: notification.batch_updated_at,
        actor: notification.actor_full_name ? {
          id: notification.actor_id,
          full_name: notification.actor_full_name,
          avatar_url: notification.actor_avatar_url,
          first_name: notification.actor_first_name,
          last_name: notification.actor_last_name
        } : (notification.actor_id ? {
          // Fallback: create actor object even without full_name to prevent "Unknown User"
          id: notification.actor_id,
          full_name: notification.actor_first_name || notification.actor_last_name || 'User',
          avatar_url: notification.actor_avatar_url,
          first_name: notification.actor_first_name,
          last_name: notification.actor_last_name
        } : null),
        space: notification.space_name ? {
          id: notification.space_id,
          name: notification.space_name,
          subdomain: notification.space_subdomain,
          icon_image: notification.space_icon_image
        } : null
      }));

      return {
        notifications: enrichedNotifications,
        hasMore,
        nextCursor: hasMore ? (page + 1).toString() : undefined,
        totalCount,
        unreadCount
      };
    } catch (error) {
      log.warn('NotificationService', 'Error in getNotifications, returning empty result:', error);
      // Return empty result for any error (like missing table)
      return {
        notifications: [],
        hasMore: false,
        nextCursor: undefined,
        totalCount: 0,
        unreadCount: 0
      };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      // Try to use the RPC function first
      const { data, error } = await this.supabase
        .rpc('get_unread_notification_count');

      if (error) {
        log.warn('NotificationService', 'RPC function not found, trying direct query:', error);
        
        // Fallback to direct query if RPC doesn't exist
        const { data: fallbackData, error: fallbackError } = await this.supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false);

        if (fallbackError) {
          log.warn('NotificationService', 'Notifications table not found:', fallbackError);
          return 0;
        }

        return fallbackData?.count || 0;
      }

      return data || 0;
    } catch (error) {
      log.warn('NotificationService', 'Error in getUnreadCount, returning 0:', error);
      return 0;
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds: string[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('mark_notifications_as_read', {
          notification_ids: notificationIds
        });

      if (error) {
        log.error('NotificationService', 'Error marking notifications as read:', error);
        throw error;
      }

      log.debug('NotificationService', `Marked ${notificationIds.length} notifications as read`);
    } catch (error) {
      log.error('NotificationService', 'Error in markAsRead:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        log.error('NotificationService', 'Error marking all notifications as read:', error);
        throw error;
      }

      log.debug('NotificationService', 'Marked all notifications as read for user:', userId);
    } catch (error) {
      log.error('NotificationService', 'Error in markAllAsRead:', error);
      throw error;
    }
  }

  /**
   * Mark notification as clicked
   */
  async markAsClicked(notificationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ clicked: true, read: true })
        .eq('id', notificationId);

      if (error) {
        log.error('NotificationService', 'Error marking notification as clicked:', error);
        throw error;
      }

      log.debug('NotificationService', 'Marked notification as clicked:', notificationId);
    } catch (error) {
      log.error('NotificationService', 'Error in markAsClicked:', error);
      throw error;
    }
  }

  /**
   * Create a new notification (legacy method - use createSmartNotification for batching)
   */
  async createNotification(params: CreateNotificationParams): Promise<NotificationItem> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert([params])
        .select()
        .single();

      if (error) {
        log.error('NotificationService', 'Error creating notification:', error);
        throw error;
      }

      log.debug('NotificationService', 'Created notification:', data);
      return data;
    } catch (error) {
      log.error('NotificationService', 'Error in createNotification:', error);
      throw error;
    }
  }

  /**
   * Check if user wants to receive this type of notification for this space
   * Uses space-specific preferences with global fallbacks (Skool-style)
   */
  async shouldSendNotification(
    userId: string, 
    notificationType: NotificationType, 
    spaceId?: string
  ): Promise<boolean> {
    try {
      // Get effective preferences for this user and space
      const { data: effectivePrefs, error } = await this.supabase
        .rpc('get_effective_notification_preferences', {
          p_user_id: userId,
          p_space_id: spaceId || null
        })
        .single();

      if (error) {
        log.warn('NotificationService', 'Could not fetch preferences, defaulting to allow:', error);
        return true; // Default to sending notification if preferences can't be fetched
      }

      if (!effectivePrefs) {
        log.warn('NotificationService', 'No preferences found, defaulting to allow');
        return true;
      }

      // Check if notifications are globally disabled
      if (!effectivePrefs.push_enabled && !effectivePrefs.email_enabled) {
        return false;
      }

      // Check type-specific preferences
      switch (notificationType) {
        case 'new_post':
          return effectivePrefs.new_posts;
        case 'comment_reply':
          return effectivePrefs.comments;
        case 'post_like':
          return effectivePrefs.likes;
        case 'mention':
          return effectivePrefs.mentions;
        case 'space_join':
          return effectivePrefs.space_joins;
        case 'new_customer':
          return effectivePrefs.new_customers;
        default:
          return true; // Allow unknown types
      }
    } catch (error) {
      log.error('NotificationService', 'Error checking notification preferences:', error);
      return true; // Default to allowing notification on error
    }
  }

  /**
   * Create a smart notification (with batching support and preference checking)
   * This is the new preferred method for creating notifications
   */
  async createSmartNotification(params: BatchedNotificationParams): Promise<string> {
    try {
      // Check if user wants to receive this notification type for this space
      const shouldSend = await this.shouldSendNotification(
        params.user_id,
        params.type,
        params.space_id
      );

      if (!shouldSend) {
        log.debug('NotificationService', 'Notification blocked by user preferences:', {
          userId: params.user_id,
          type: params.type,
          spaceId: params.space_id
        });
        
        // Return a placeholder ID to indicate the notification was "created" but blocked
        return 'blocked-by-preferences';
      }

      return await notificationBatchManager.createSmartNotification(params);
    } catch (error) {
      log.error('NotificationService', 'Error in createSmartNotification:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        log.error('NotificationService', 'Error deleting notification:', error);
        throw error;
      }

      log.debug('NotificationService', 'Deleted notification:', notificationId);
    } catch (error) {
      log.error('NotificationService', 'Error in deleteNotification:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        log.error('NotificationService', 'Error fetching preferences:', error);
        throw error;
      }

      return data;
    } catch (error) {
      log.error('NotificationService', 'Error in getPreferences:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string, 
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        log.error('NotificationService', 'Error updating preferences:', error);
        throw error;
      }

      log.debug('NotificationService', 'Updated preferences for user:', userId);
      return data;
    } catch (error) {
      log.error('NotificationService', 'Error in updatePreferences:', error);
      throw error;
    }
  }

  /**
   * Get effective notification preferences for a user in a specific space
   * Returns resolved preferences (space overrides + global fallbacks)
   */
  async getEffectivePreferences(
    userId: string, 
    spaceId?: string
  ): Promise<EffectiveNotificationPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_effective_notification_preferences', {
          p_user_id: userId,
          p_space_id: spaceId || null
        })
        .single();

      if (error) {
        log.error('NotificationService', 'Error fetching effective preferences:', error);
        throw error;
      }

      return data;
    } catch (error) {
      log.error('NotificationService', 'Error in getEffectivePreferences:', error);
      throw error;
    }
  }

  /**
   * Helper method to determine actor relationship
   */
  private async getActorRelationship(
    actorId: string, 
    recipientId: string, 
    spaceId?: string
  ): Promise<ActorRelationship> {
    try {
      // Check if actor is space owner/admin
      if (spaceId) {
        const { data: spaceData } = await this.supabase
          .from('spaces')
          .select('owner_id')
          .eq('id', spaceId)
          .single();

        if (spaceData?.owner_id === actorId) {
          return 'admin';
        }

        // Check if actor is space admin
        const { data: memberData } = await this.supabase
          .from('space_members')
          .select('role')
          .eq('space_id', spaceId)
          .eq('user_id', actorId)
          .single();

        if (memberData?.role === 'admin') {
          return 'admin';
        }
      }

      // Check if recipient is following actor
      const { data: followData } = await this.supabase
        .from('user_follows')
        .select('*')
        .eq('follower_id', recipientId)
        .eq('following_id', actorId)
        .single();

      if (followData) {
        return 'following';
      }

      return 'member';
    } catch (error) {
      log.warn('NotificationService', 'Error determining actor relationship:', error);
      return 'member';
    }
  }

  /**
   * High-level notification creation methods (now with smart batching)
   */
  async createPostLikeNotification(data: PostLikeNotificationData): Promise<void> {
    log.debug('NotificationService', '🚀 [createPostLikeNotification] Called with data:', data);
    
    try {
      log.debug('NotificationService', '🔍 [createPostLikeNotification] Getting actor relationship...');
      const relationship = await this.getActorRelationship(
        data.actorId, 
        data.recipientId, 
        data.spaceId
      );
      log.debug('NotificationService', '✅ [createPostLikeNotification] Actor relationship:', relationship);

      const smartNotificationParams = {
        user_id: data.recipientId,
        actor_id: data.actorId,
        type: 'post_like' as const,
        title: data.postTitle,
        actor_relationship: relationship,
        space_id: data.spaceId,
        target_id: data.postId
      };
      
      log.debug('NotificationService', '🔔 [createPostLikeNotification] Calling createSmartNotification with:', smartNotificationParams);

      // Use smart batching for post likes
      const notificationId = await this.createSmartNotification(smartNotificationParams);
      
      // Get the created notification for push notification integration
      const { data: createdNotification } = await this.supabase
        .from('notifications')
        .select(`
          *,
          actor:users(id, full_name, avatar_url),
          space:spaces(id, name, subdomain, icon_image)
        `)
        .eq('id', notificationId)
        .single();

      if (createdNotification) {
        // Send push notification (this would typically be handled by a server-side function)
        await pushNotificationIntegrationService.sendPushNotificationForNotification(createdNotification);
      }
      
      log.debug('NotificationService', '✅ [createPostLikeNotification] Post like notification created successfully');
    } catch (error) {
      log.error('NotificationService', '❌ [createPostLikeNotification] Error creating post like notification:', error);
      throw error;
    }
  }

  async createCommentReplyNotification(data: CommentReplyNotificationData): Promise<void> {
    try {
      const relationship = await this.getActorRelationship(
        data.actorId, 
        data.recipientId, 
        data.spaceId
      );

      // Use smart batching for comment replies
      await this.createSmartNotification({
        user_id: data.recipientId,
        actor_id: data.actorId,
        type: 'comment_reply',
        title: data.postTitle,
        content_preview: data.commentContent,
        actor_relationship: relationship,
        space_id: data.spaceId,
        target_id: data.commentId
      });
    } catch (error) {
      log.error('NotificationService', 'Error creating comment reply notification:', error);
      throw error;
    }
  }

  async createSpaceJoinNotification(data: SpaceJoinNotificationData): Promise<void> {
    try {
      const relationship = await this.getActorRelationship(
        data.actorId, 
        data.recipientId, 
        data.spaceId
      );

      // Use smart batching for space joins
      await this.createSmartNotification({
        user_id: data.recipientId,
        actor_id: data.actorId,
        type: 'space_join',
        title: `joined ${data.spaceName}`,
        actor_relationship: relationship,
        space_id: data.spaceId,
        target_id: data.spaceId
      });
    } catch (error) {
      log.error('NotificationService', 'Error creating space join notification:', error);
      throw error;
    }
  }

  async createMentionNotification(data: MentionNotificationData): Promise<void> {
    try {
      const relationship = await this.getActorRelationship(
        data.actorId, 
        data.recipientId, 
        data.spaceId
      );

      // Mentions should not be batched - they're always important and individual
      await this.createNotification({
        user_id: data.recipientId,
        actor_id: data.actorId,
        type: 'mention',
        title: data.postTitle,
        content_preview: data.mentionText,
        actor_relationship: relationship,
        space_id: data.spaceId,
        target_id: data.postId
      });
    } catch (error) {
      log.error('NotificationService', 'Error creating mention notification:', error);
      throw error;
    }
  }

  async createNewCustomerNotification(data: NewCustomerNotificationData): Promise<void> {
    log.debug('NotificationService', '🚀 [createNewCustomerNotification] Called with data:', data);
    
    try {
      const relationship = await this.getActorRelationship(
        data.actorId, 
        data.recipientId, 
        data.spaceId
      );

      // Create payment notification title with ka-ching feel
      let title = `joined ${data.spaceName}`;
      if (data.amount && data.currency) {
        title = `subscribed to ${data.spaceName} for ${data.currency}${data.amount}`;
      } else if (data.planName) {
        title = `subscribed to ${data.spaceName} (${data.planName})`;
      }

      // New customer notifications should not be batched - they're revenue events
      await this.createNotification({
        user_id: data.recipientId,
        actor_id: data.actorId,
        type: 'new_customer',
        title,
        content_preview: data.customerEmail,
        actor_relationship: relationship,
        space_id: data.spaceId,
        target_id: data.spaceId
      });

      log.debug('NotificationService', '✅ [createNewCustomerNotification] Ka-ching notification created successfully');
    } catch (error) {
      log.error('NotificationService', '❌ [createNewCustomerNotification] Error creating new customer notification:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();