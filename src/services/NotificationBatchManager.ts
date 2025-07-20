import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import type {
  NotificationItem,
  NotificationWithActor,
  NotificationType,
  ActorRelationship,
  CreateNotificationParams
} from '@/types/notification';

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

export class NotificationBatchManager {
  private supabase = getSupabaseClient();

  /**
   * Create or update a batched notification
   * This is the core function that implements "Francis and 5 others liked your post" logic
   */
  async createOrUpdateBatch(params: BatchedNotificationParams): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .rpc('upsert_batched_notification', {
          p_user_id: params.user_id,
          p_actor_id: params.actor_id,
          p_type: params.type,
          p_title: params.title,
          p_content_preview: params.content_preview || null,
          p_actor_relationship: params.actor_relationship || 'member',
          p_space_id: params.space_id || null,
          p_target_id: params.target_id || null,
          p_expires_at: params.expires_at || null
        });

      if (error) {
        log.error('NotificationBatchManager', 'Error creating/updating batched notification:', error);
        throw error;
      }

      const notificationId = data as string;
      log.debug('NotificationBatchManager', 'Created/updated batched notification:', notificationId);
      
      return notificationId;
    } catch (error) {
      log.error('NotificationBatchManager', 'Error in createOrUpdateBatch:', error);
      throw error;
    }
  }

  /**
   * Get batch display information for a notification
   * Formats the display text like "Francis and 5 others liked your post"
   */
  getBatchDisplayInfo(notification: NotificationWithActor): BatchDisplayInfo {
    const actorCount = notification.actor_count || 1;
    const actorNames = notification.actor_names || [];
    
    // Improved fallback logic for primary actor name
    let primaryActorName = 'User';
    if (notification.actor?.full_name) {
      primaryActorName = notification.actor.full_name;
    } else if (notification.actor?.first_name || notification.actor?.last_name) {
      const firstName = notification.actor.first_name || '';
      const lastName = notification.actor.last_name || '';
      primaryActorName = `${firstName} ${lastName}`.trim() || 'User';
    } else if (notification.actor?.id) {
      primaryActorName = 'User';
    }

    if (actorCount === 1) {
      return {
        singleActorName: primaryActorName,
        totalCount: 1,
        otherActorNames: [],
        displayText: primaryActorName
      };
    }

    const otherCount = actorCount - 1;
    const otherActorNames = actorNames.slice(0, 3); // Show max 3 other names

    let displayText: string;
    
    if (otherCount === 1) {
      displayText = `${primaryActorName} and 1 other`;
    } else if (otherCount <= 3 && otherActorNames.length > 0) {
      displayText = `${primaryActorName}, ${otherActorNames.join(', ')} and ${otherCount - otherActorNames.length} others`;
    } else {
      displayText = `${primaryActorName} and ${otherCount} others`;
    }

    return {
      singleActorName: primaryActorName,
      totalCount: actorCount,
      otherActorNames,
      displayText
    };
  }

  /**
   * Get action text for batched notifications
   */
  getBatchedActionText(notification: NotificationWithActor): string {
    const actorCount = notification.actor_count || 1;
    const type = notification.type;

    if (actorCount === 1) {
      switch (type) {
        case 'post_like':
          return 'liked your post';
        case 'comment_reply':
          return 'replied to your comment';
        case 'mention':
          return 'mentioned you';
        case 'space_join':
          return 'joined the space';
        case 'new_post':
          return 'new post';
        default:
          return 'activity';
      }
    }

    // Plural forms for batched notifications
    switch (type) {
      case 'post_like':
        return 'liked your post';
      case 'comment_reply':
        return 'replied to your comment';
      case 'mention':
        return 'mentioned you';
      case 'space_join':
        return 'joined the space';
      case 'new_post':
        return 'new posts';
      default:
        return 'activity';
    }
  }

  /**
   * Check if a notification type should be batched
   */
  shouldBatchNotificationType(type: NotificationType): boolean {
    const batchableTypes: NotificationType[] = [
      'post_like',
      'comment_reply',
      'space_join'
    ];
    
    return batchableTypes.includes(type);
  }

  /**
   * Create a traditional (non-batched) notification
   * For notification types that shouldn't be batched
   */
  async createSingleNotification(params: CreateNotificationParams): Promise<NotificationItem> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert([params])
        .select()
        .single();

      if (error) {
        log.error('NotificationBatchManager', 'Error creating single notification:', error);
        throw error;
      }

      log.debug('NotificationBatchManager', 'Created single notification:', data);
      return data;
    } catch (error) {
      log.error('NotificationBatchManager', 'Error in createSingleNotification:', error);
      throw error;
    }
  }

  /**
   * Smart notification creation - batches if appropriate, creates single if not
   */
  async createSmartNotification(params: BatchedNotificationParams): Promise<string> {
    try {
      if (this.shouldBatchNotificationType(params.type)) {
        // Use batching for eligible types
        return await this.createOrUpdateBatch(params);
      } else {
        // Create single notification for non-batchable types
        const singleNotification = await this.createSingleNotification(params);
        return singleNotification.id;
      }
    } catch (error) {
      log.error('NotificationBatchManager', 'Error in createSmartNotification:', error);
      throw error;
    }
  }

  /**
   * Get batch statistics for admin/debugging
   */
  async getBatchStatistics(userId: string): Promise<{
    totalNotifications: number;
    batchedNotifications: number;
    averageBatchSize: number;
    topBatchedTypes: Array<{ type: string; count: number }>;
  }> {
    try {
      const { data: stats, error } = await this.supabase
        .rpc('get_batch_statistics', { p_user_id: userId });

      if (error) {
        log.error('NotificationBatchManager', 'Error getting batch statistics:', error);
        throw error;
      }

      return stats;
    } catch (error) {
      log.error('NotificationBatchManager', 'Error in getBatchStatistics:', error);
      throw error;
    }
  }

  /**
   * Clean up old batched notifications
   */
  async cleanupOldBatches(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .rpc('cleanup_old_batched_notifications');

      if (error) {
        log.error('NotificationBatchManager', 'Error cleaning up old batches:', error);
        throw error;
      }

      const deletedCount = data as number;
      log.debug('NotificationBatchManager', `Cleaned up ${deletedCount} old notifications`);
      
      return deletedCount;
    } catch (error) {
      log.error('NotificationBatchManager', 'Error in cleanupOldBatches:', error);
      throw error;
    }
  }

  /**
   * Generate batch key for manual operations
   */
  generateBatchKey(userId: string, type: NotificationType, targetId?: string, spaceId?: string): string {
    return `${userId}_${type}_${targetId || 'null'}_${spaceId || 'null'}`;
  }

  /**
   * Get all notifications in a specific batch
   */
  async getBatchNotifications(batchKey: string): Promise<NotificationWithActor[]> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select(`
          *,
          actor:users(
            id,
            full_name,
            avatar_url
          ),
          space:spaces(
            id,
            name,
            subdomain,
            icon_image
          )
        `)
        .eq('batch_key', batchKey)
        .order('created_at', { ascending: false });

      if (error) {
        log.error('NotificationBatchManager', 'Error getting batch notifications:', error);
        throw error;
      }

      return data.map(notification => ({
        ...notification,
        actor: notification.actor || null,
        space: notification.space || null
      }));
    } catch (error) {
      log.error('NotificationBatchManager', 'Error in getBatchNotifications:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationBatchManager = new NotificationBatchManager();