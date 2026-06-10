import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import type {
  NotificationWithActor,
  NotificationPreferences,
  NotificationListResponse,
  NotificationType,
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

}

// Export singleton instance
export const notificationService = new NotificationService();