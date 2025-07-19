import { getSupabaseClient } from '@/integrations/supabase/client';
import { notificationService } from '@/services/NotificationService';
import { log } from '@/utils/logger';
import type { NotificationWithActor } from '@/types/notification';

/**
 * Integration service that connects the notification system with push notifications
 * Handles sending push notifications when new notifications are created
 */
export class PushNotificationIntegrationService {
  private supabase = getSupabaseClient();

  /**
   * Send push notification for a database notification
   * This would typically be called from a Supabase Edge Function or server-side
   */
  async sendPushNotificationForNotification(notification: NotificationWithActor): Promise<boolean> {
    try {
      // Get user's push preferences
      const { data: preferences } = await this.supabase
        .from('notification_preferences')
        .select('push_enabled, new_posts, comments, likes, mentions, space_joins')
        .eq('user_id', notification.user_id)
        .single();

      if (!preferences?.push_enabled) {
        log.debug('Service', `Push notifications disabled for user ${notification.user_id}`);
        return false;
      }

      // Check if this notification type is enabled
      const typeEnabled = this.isNotificationTypeEnabled(notification.type, preferences);
      if (!typeEnabled) {
        log.debug('Service', `Notification type ${notification.type} disabled for user ${notification.user_id}`);
        return false;
      }

      // Get user's active push subscriptions
      const { data: subscriptions } = await this.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', notification.user_id)
        .eq('is_active', true);

      if (!subscriptions || subscriptions.length === 0) {
        log.debug('Service', `No active push subscriptions for user ${notification.user_id}`);
        return false;
      }

      // Prepare push notification payload
      const pushPayload = this.createPushPayload(notification);

      // Send to all user's devices (implement actual push sending logic here)
      // This would typically use a service like Firebase Cloud Messaging, 
      // or be handled by a Supabase Edge Function with web-push library
      const sendPromises = subscriptions.map(subscription => 
        this.sendPushToSubscription(subscription, pushPayload)
      );

      const results = await Promise.allSettled(sendPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      log.debug('Service', `Sent push notification to ${successCount}/${subscriptions.length} devices for user ${notification.user_id}`);
      return successCount > 0;
    } catch (error) {
      log.error('Service', 'Failed to send push notification:', error);
      return false;
    }
  }

  /**
   * Check if a notification type is enabled for the user
   */
  private isNotificationTypeEnabled(type: string, preferences: any): boolean {
    switch (type) {
      case 'new_post':
        return preferences.new_posts;
      case 'comment_reply':
        return preferences.comments;
      case 'post_like':
        return preferences.likes;
      case 'mention':
        return preferences.mentions;
      case 'space_join':
        return preferences.space_joins;
      default:
        return true; // Default to enabled for unknown types
    }
  }

  /**
   * Create push notification payload from database notification
   */
  private createPushPayload(notification: NotificationWithActor) {
    const actorName = notification.actor?.full_name || 'Someone';
    const spaceName = notification.space?.name || 'a space';

    let title = '';
    let body = '';
    let icon = '/icons/icon-192x192.png';
    let badge = '/icons/icon-96x96.png';

    switch (notification.type) {
      case 'post_like':
        title = 'New like';
        body = notification.actor_count && notification.actor_count > 1
          ? `${actorName} and ${notification.actor_count - 1} others liked your post`
          : `${actorName} liked your post`;
        break;

      case 'comment_reply':
        title = 'New reply';
        body = `${actorName} replied to your comment`;
        break;

      case 'mention':
        title = 'You were mentioned';
        body = `${actorName} mentioned you in ${spaceName}`;
        break;

      case 'new_post':
        title = 'New post';
        body = `${actorName} posted in ${spaceName}`;
        break;

      case 'space_join':
        title = 'New member';
        body = `${actorName} joined ${spaceName}`;
        break;

      default:
        title = 'New notification';
        body = notification.title || 'You have a new notification';
    }

    return {
      title,
      body,
      icon,
      badge,
      tag: `notification-${notification.id}`,
      data: {
        notificationId: notification.id,
        type: notification.type,
        spaceId: notification.space_id,
        targetId: notification.target_id,
        url: this.getNotificationUrl(notification)
      },
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: false,
      silent: false
    };
  }

  /**
   * Generate URL for notification click action
   */
  private getNotificationUrl(notification: NotificationWithActor): string {
    const baseUrl = notification.space?.subdomain 
      ? `/${notification.space.subdomain}/space`
      : '/';

    switch (notification.type) {
      case 'post_like':
      case 'mention':
      case 'new_post':
        return notification.target_id 
          ? `${baseUrl}?highlight=${notification.target_id}`
          : baseUrl;

      case 'comment_reply':
        return notification.target_id
          ? `${baseUrl}?highlight_comment=${notification.target_id}`
          : baseUrl;

      case 'space_join':
        return `${baseUrl}?tab=members`;

      default:
        return baseUrl;
    }
  }

  /**
   * Send push notification to a specific subscription
   * This is a placeholder - actual implementation would use web-push library
   */
  private async sendPushToSubscription(subscription: any, payload: any): Promise<boolean> {
    try {
      // This would typically be implemented in a Supabase Edge Function
      // using the web-push library with proper VAPID keys
      
      log.debug('Service', 'Would send push notification:', {
        endpoint: subscription.endpoint,
        payload: payload.title
      });

      // Placeholder for actual push sending
      // const webpush = require('web-push');
      // await webpush.sendNotification(subscription, JSON.stringify(payload));
      
      return true;
    } catch (error) {
      log.error('Service', 'Failed to send push to subscription:', error);
      
      // Mark subscription as inactive if it failed
      await this.supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('id', subscription.id);
      
      return false;
    }
  }

  /**
   * Get user's notification preferences
   */
  async getUserNotificationPreferences(userId: string) {
    const { data, error } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      log.error('Service', 'Failed to get user preferences:', error);
      return null;
    }

    return data;
  }

  /**
   * Get user's active push subscriptions
   */
  async getUserPushSubscriptions(userId: string) {
    const { data, error } = await this.supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      log.error('Service', 'Failed to get user subscriptions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Test push notification functionality
   */
  async sendTestPushNotification(userId: string): Promise<boolean> {
    try {
      const subscriptions = await this.getUserPushSubscriptions(userId);
      if (subscriptions.length === 0) {
        return false;
      }

      const testPayload = {
        title: 'Test Notification',
        body: 'Push notifications are working correctly!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: 'test-notification',
        data: {
          type: 'test',
          timestamp: Date.now()
        }
      };

      const results = await Promise.allSettled(
        subscriptions.map(sub => this.sendPushToSubscription(sub, testPayload))
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      return successCount > 0;
    } catch (error) {
      log.error('Service', 'Failed to send test push notification:', error);
      return false;
    }
  }
}

// Export singleton instance
export const pushNotificationIntegrationService = new PushNotificationIntegrationService();