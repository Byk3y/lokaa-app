import { notificationService } from '@/services/NotificationService';
import { log } from '@/utils/logger';
import type {
  PostLikeNotificationData,
  CommentReplyNotificationData,
  SpaceJoinNotificationData,
  MentionNotificationData,
  NewCustomerNotificationData
} from '@/types/notification';

/**
 * Utility functions to trigger notifications throughout the app
 * These integrate with existing features like posts, comments, likes, etc.
 */
export class NotificationTriggers {
  
  /**
   * Trigger notification when someone likes a post
   */
  static async onPostLiked(data: {
    postId: string;
    postTitle: string;
    postAuthorId: string;
    likerId: string;
    spaceId: string;
  }): Promise<void> {
    log.debug('NotificationTriggers', '🚀 [onPostLiked] Function called with data:', data);
    
    try {
      // Don't send notification if user liked their own post
      if (data.postAuthorId === data.likerId) {
        log.debug('NotificationTriggers', '⏭️ [onPostLiked] Skipping self-like notification');
        return;
      }

      log.debug('NotificationTriggers', '📝 [onPostLiked] Creating notification data:', {
        recipientId: data.postAuthorId,
        actorId: data.likerId,
        postId: data.postId,
        postTitle: data.postTitle,
        spaceId: data.spaceId
      });

      const notificationData: PostLikeNotificationData = {
        recipientId: data.postAuthorId,
        actorId: data.likerId,
        postId: data.postId,
        postTitle: data.postTitle,
        spaceId: data.spaceId
      };

      log.debug('NotificationTriggers', '🔔 [onPostLiked] Calling createPostLikeNotification...');
      await notificationService.createPostLikeNotification(notificationData);
      log.debug('NotificationTriggers', '✅ [onPostLiked] Post like notification sent successfully:', data.postId);
    } catch (error) {
      log.error('NotificationTriggers', '❌ [onPostLiked] Error sending post like notification:', error);
      throw error; // Re-throw to let the calling code handle it
    }
  }

  /**
   * Trigger notification when someone replies to a comment
   */
  static async onCommentReply(data: {
    postId: string;
    postTitle: string;
    commentId: string;
    commentContent: string;
    originalCommentAuthorId: string;
    replierUserId: string;
    spaceId: string;
  }): Promise<void> {
    log.debug('NotificationTriggers', '🚀 [onCommentReply] Function called with data:', data);
    
    try {
      // Don't send notification if user replied to their own comment
      if (data.originalCommentAuthorId === data.replierUserId) {
        log.debug('NotificationTriggers', '⏭️ [onCommentReply] Skipping self-reply notification');
        return;
      }

      const notificationData: CommentReplyNotificationData = {
        recipientId: data.originalCommentAuthorId,
        actorId: data.replierUserId,
        postId: data.postId,
        postTitle: data.postTitle,
        commentId: data.commentId,
        commentContent: data.commentContent,
        spaceId: data.spaceId
      };

      log.debug('NotificationTriggers', '🔔 [onCommentReply] Creating comment reply notification...');
      await notificationService.createCommentReplyNotification(notificationData);
      log.debug('NotificationTriggers', '✅ [onCommentReply] Comment reply notification sent successfully:', data.commentId);
    } catch (error) {
      log.error('NotificationTriggers', '❌ [onCommentReply] Error sending comment reply notification:', error);
      throw error;
    }
  }

  /**
   * Trigger notification when someone joins a space
   */
  static async onSpaceJoin(data: {
    spaceId: string;
    spaceName: string;
    spaceOwnerId: string;
    newMemberId: string;
  }): Promise<void> {
    log.debug('NotificationTriggers', '🚀 [onSpaceJoin] Function called with data:', data);
    
    try {
      // Don't send notification if owner joined their own space
      if (data.spaceOwnerId === data.newMemberId) {
        log.debug('NotificationTriggers', '⏭️ [onSpaceJoin] Skipping self-join notification');
        return;
      }

      const notificationData: SpaceJoinNotificationData = {
        recipientId: data.spaceOwnerId,
        actorId: data.newMemberId,
        spaceId: data.spaceId,
        spaceName: data.spaceName
      };

      log.debug('NotificationTriggers', '🔔 [onSpaceJoin] Creating space join notification...');
      await notificationService.createSpaceJoinNotification(notificationData);
      log.debug('NotificationTriggers', '✅ [onSpaceJoin] Space join notification sent successfully:', data.spaceId);
    } catch (error) {
      log.error('NotificationTriggers', '❌ [onSpaceJoin] Error sending space join notification:', error);
      throw error;
    }
  }

  /**
   * Trigger notification when someone is mentioned in a post
   */
  static async onUserMention(data: {
    postId: string;
    postTitle: string;
    mentionedUserId: string;
    mentionerUserId: string;
    mentionText: string;
    spaceId: string;
  }): Promise<void> {
    log.debug('NotificationTriggers', '🚀 [onUserMention] Function called with data:', data);
    
    try {
      // Don't send notification if user mentioned themselves
      if (data.mentionedUserId === data.mentionerUserId) {
        log.debug('NotificationTriggers', '⏭️ [onUserMention] Skipping self-mention notification');
        return;
      }

      const notificationData: MentionNotificationData = {
        recipientId: data.mentionedUserId,
        actorId: data.mentionerUserId,
        postId: data.postId,
        postTitle: data.postTitle,
        mentionText: data.mentionText,
        spaceId: data.spaceId
      };

      log.debug('NotificationTriggers', '🔔 [onUserMention] Creating mention notification...');
      await notificationService.createMentionNotification(notificationData);
      log.debug('NotificationTriggers', '✅ [onUserMention] Mention notification sent successfully:', data.postId);
    } catch (error) {
      log.error('NotificationTriggers', '❌ [onUserMention] Error sending mention notification:', error);
      throw error;
    }
  }

  /**
   * Trigger notification when a new post is created in a space
   * (This would typically be sent to space followers or admins)
   */
  static async onNewPost(data: {
    postId: string;
    postTitle: string;
    authorId: string;
    spaceId: string;
    recipientIds: string[]; // Space followers/admins
  }): Promise<void> {
    log.debug('NotificationTriggers', '🚀 [onNewPost] Function called with data:', data);
    
    try {
      // Filter out the author and send notifications using smart batching
      const validRecipients = data.recipientIds.filter(recipientId => recipientId !== data.authorId);
      
      log.debug('NotificationTriggers', `🔔 [onNewPost] Creating notifications for ${validRecipients.length} recipients...`);

      const notifications = validRecipients.map(recipientId => 
        notificationService.createSmartNotification({
          user_id: recipientId,
          actor_id: data.authorId,
          type: 'new_post',
          title: data.postTitle,
          space_id: data.spaceId,
          target_id: data.postId
        })
      );

      await Promise.all(notifications);
      log.debug('NotificationTriggers', `✅ [onNewPost] New post notifications sent to ${validRecipients.length} recipients successfully`);
    } catch (error) {
      log.error('NotificationTriggers', '❌ [onNewPost] Error sending new post notifications:', error);
      throw error;
    }
  }

  /**
   * Trigger notification when a new customer subscribes/pays for space access
   * (Ka-ching sound notification for space owners/admins)
   */
  static async onNewCustomer(data: {
    spaceId: string;
    spaceName: string;
    customerId: string;
    spaceOwnerIds: string[]; // Space owners and admins who should be notified
    customerEmail?: string;
    planName?: string;
    amount?: string;
    currency?: string;
  }): Promise<void> {
    log.debug('NotificationTriggers', '🚀 [onNewCustomer] Function called with data:', data);
    
    try {
      const validRecipients = data.spaceOwnerIds.filter(ownerId => ownerId !== data.customerId);
      
      if (validRecipients.length === 0) {
        log.debug('NotificationTriggers', '⏭️ [onNewCustomer] No valid recipients (owner purchased their own space)');
        return;
      }
      
      log.debug('NotificationTriggers', `💰 [onNewCustomer] Creating ka-ching notifications for ${validRecipients.length} recipients...`);

      const notifications = validRecipients.map(recipientId => {
        const notificationData: NewCustomerNotificationData = {
          recipientId,
          actorId: data.customerId,
          spaceId: data.spaceId,
          spaceName: data.spaceName,
          customerEmail: data.customerEmail,
          planName: data.planName,
          amount: data.amount,
          currency: data.currency
        };

        return notificationService.createNewCustomerNotification(notificationData);
      });

      await Promise.all(notifications);
      log.debug('NotificationTriggers', `✅ [onNewCustomer] Ka-ching notifications sent to ${validRecipients.length} recipients successfully`);
    } catch (error) {
      log.error('NotificationTriggers', '❌ [onNewCustomer] Error sending new customer notifications:', error);
      throw error;
    }
  }

}

/**
 * Helper function to extract mentions from text content
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

/**
 * Helper function to truncate content for notification previews
 */
export function truncateContent(content: string, maxLength = 100): string {
  if (content.length <= maxLength) {
    return content;
  }
  
  return content.substring(0, maxLength - 3) + '...';
}