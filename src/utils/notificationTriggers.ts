import { notificationService } from '@/services/NotificationService';
import { log } from '@/utils/logger';
import type {
  PostLikeNotificationData,
  CommentReplyNotificationData,
  SpaceJoinNotificationData,
  MentionNotificationData
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
    try {
      // Don't send notification if user replied to their own comment
      if (data.originalCommentAuthorId === data.replierUserId) {
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

      await notificationService.createCommentReplyNotification(notificationData);
      log.debug('NotificationTriggers', 'Comment reply notification sent:', data.commentId);
    } catch (error) {
      log.error('NotificationTriggers', 'Error sending comment reply notification:', error);
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
    try {
      // Don't send notification if owner joined their own space
      if (data.spaceOwnerId === data.newMemberId) {
        return;
      }

      const notificationData: SpaceJoinNotificationData = {
        recipientId: data.spaceOwnerId,
        actorId: data.newMemberId,
        spaceId: data.spaceId,
        spaceName: data.spaceName
      };

      await notificationService.createSpaceJoinNotification(notificationData);
      log.debug('NotificationTriggers', 'Space join notification sent:', data.spaceId);
    } catch (error) {
      log.error('NotificationTriggers', 'Error sending space join notification:', error);
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
    try {
      // Don't send notification if user mentioned themselves
      if (data.mentionedUserId === data.mentionerUserId) {
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

      await notificationService.createMentionNotification(notificationData);
      log.debug('NotificationTriggers', 'Mention notification sent:', data.postId);
    } catch (error) {
      log.error('NotificationTriggers', 'Error sending mention notification:', error);
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
    try {
      // Send notification to each recipient
      const notifications = data.recipientIds
        .filter(recipientId => recipientId !== data.authorId) // Don't notify author
        .map(recipientId => 
          notificationService.createNotification({
            user_id: recipientId,
            actor_id: data.authorId,
            type: 'new_post',
            title: data.postTitle,
            space_id: data.spaceId,
            target_id: data.postId
          })
        );

      await Promise.all(notifications);
      log.debug('NotificationTriggers', `New post notifications sent to ${data.recipientIds.length} recipients`);
    } catch (error) {
      log.error('NotificationTriggers', 'Error sending new post notifications:', error);
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
export function truncateContent(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) {
    return content;
  }
  
  return content.substring(0, maxLength - 3) + '...';
}