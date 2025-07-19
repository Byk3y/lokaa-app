import { NavigateFunction } from 'react-router-dom';
import { log } from '@/utils/logger';
import type { NotificationType } from '@/types/notification';

export interface NotificationNavigationData {
  type: NotificationType;
  spaceSubdomain: string;
  targetId?: string;
  postId?: string;
  commentId?: string;
  userId?: string;
}

/**
 * Smart navigation handler for notifications
 * Implements Skool-style direct navigation to spaces with content highlighting
 */
export class NotificationNavigation {
  
  /**
   * Navigate to the appropriate page based on notification type
   * This replicates Skool's behavior of taking users directly to content in context
   */
  static async navigateToNotification(
    navigate: NavigateFunction,
    data: NotificationNavigationData
  ): Promise<void> {
    try {
      const baseUrl = `/${data.spaceSubdomain}/space`;
      
      switch (data.type) {
        case 'new_post':
          await this.navigateToPost(navigate, baseUrl, data.targetId || data.postId);
          break;
          
        case 'post_like':
          await this.navigateToPost(navigate, baseUrl, data.targetId || data.postId);
          break;
          
        case 'mention':
          await this.navigateToPost(navigate, baseUrl, data.targetId || data.postId);
          break;
          
        case 'comment_reply':
          await this.navigateToComment(navigate, baseUrl, data.targetId || data.commentId);
          break;
          
        case 'space_join':
          await this.navigateToSpaceMembers(navigate, baseUrl);
          break;
          
        default:
          // Default to space home
          navigate(baseUrl);
          break;
      }
      
      log.debug('NotificationNavigation', `Navigated to ${data.type} in ${data.spaceSubdomain}`);
    } catch (error) {
      log.error('NotificationNavigation', 'Navigation error:', error);
      // Fallback to space home
      navigate(`/${data.spaceSubdomain}/space`);
    }
  }

  /**
   * Navigate to a specific post and highlight it
   */
  private static async navigateToPost(
    navigate: NavigateFunction,
    baseUrl: string,
    postId?: string
  ): Promise<void> {
    if (postId) {
      // Navigate to space with post highlight parameter
      navigate(`${baseUrl}?highlight=${postId}`);
    } else {
      // Fallback to space home
      navigate(baseUrl);
    }
  }

  /**
   * Navigate to a specific comment and highlight it
   */
  private static async navigateToComment(
    navigate: NavigateFunction,
    baseUrl: string,
    commentId?: string
  ): Promise<void> {
    if (commentId) {
      // Navigate to space with comment highlight parameter
      navigate(`${baseUrl}?highlight_comment=${commentId}`);
    } else {
      // Fallback to space home
      navigate(baseUrl);
    }
  }

  /**
   * Navigate to space members tab
   */
  private static async navigateToSpaceMembers(
    navigate: NavigateFunction,
    baseUrl: string
  ): Promise<void> {
    navigate(`${baseUrl}?tab=members`);
  }
}

/**
 * URL parameter parsing utilities for FeedTab integration
 */
export class NotificationUrlParams {
  
  /**
   * Parse URL parameters for notification-related actions
   */
  static parseNotificationParams(searchParams: URLSearchParams): {
    highlightPostId?: string;
    highlightCommentId?: string;
    activeTab?: string;
  } {
    return {
      highlightPostId: searchParams.get('highlight') || undefined,
      highlightCommentId: searchParams.get('highlight_comment') || undefined,
      activeTab: searchParams.get('tab') || undefined
    };
  }

  /**
   * Check if current URL has notification-related parameters
   */
  static hasNotificationParams(searchParams: URLSearchParams): boolean {
    return !!(
      searchParams.get('highlight') ||
      searchParams.get('highlight_comment') ||
      searchParams.get('tab')
    );
  }

  /**
   * Clean notification parameters from URL after use
   */
  static cleanNotificationParams(
    navigate: NavigateFunction,
    pathname: string,
    searchParams: URLSearchParams
  ): void {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('highlight');
    newParams.delete('highlight_comment');
    
    // Keep other params but remove notification-specific ones
    const newUrl = newParams.toString() 
      ? `${pathname}?${newParams.toString()}`
      : pathname;
    
    navigate(newUrl, { replace: true });
  }
}

/**
 * Post highlighting utilities for FeedTab integration
 */
export class PostHighlighting {
  
  /**
   * Scroll to and highlight a specific post
   */
  static async scrollToPost(postId: string, options: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    duration?: number;
  } = {}): Promise<void> {
    const { behavior = 'smooth', block = 'center', duration = 2000 } = options;
    
    try {
      // Find the post element
      const postElement = document.querySelector(`[data-post-id=\"${postId}\"]`);
      
      if (!postElement) {
        log.warn('PostHighlighting', `Post element not found: ${postId}`);
        return;
      }

      // Scroll to post
      postElement.scrollIntoView({ 
        behavior, 
        block,
        inline: 'nearest'
      });

      // Add highlight class
      postElement.classList.add('notification-highlight');

      // Remove highlight after duration
      setTimeout(() => {
        postElement.classList.remove('notification-highlight');
      }, duration);

      log.debug('PostHighlighting', `Highlighted post: ${postId}`);
    } catch (error) {
      log.error('PostHighlighting', 'Error highlighting post:', error);
    }
  }

  /**
   * Scroll to and highlight a specific comment
   */
  static async scrollToComment(commentId: string, options: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    duration?: number;
  } = {}): Promise<void> {
    const { behavior = 'smooth', block = 'center', duration = 2000 } = options;
    
    try {
      // Find the comment element
      const commentElement = document.querySelector(`[data-comment-id=\"${commentId}\"]`);
      
      if (!commentElement) {
        log.warn('PostHighlighting', `Comment element not found: ${commentId}`);
        return;
      }

      // Scroll to comment
      commentElement.scrollIntoView({ 
        behavior, 
        block,
        inline: 'nearest'
      });

      // Add highlight class
      commentElement.classList.add('notification-highlight');

      // Remove highlight after duration
      setTimeout(() => {
        commentElement.classList.remove('notification-highlight');
      }, duration);

      log.debug('PostHighlighting', `Highlighted comment: ${commentId}`);
    } catch (error) {
      log.error('PostHighlighting', 'Error highlighting comment:', error);
    }
  }
}

/**
 * Hook for FeedTab integration
 */
export interface UseNotificationNavigationOptions {
  onPostHighlighted?: (postId: string) => void;
  onCommentHighlighted?: (commentId: string) => void;
  onTabChanged?: (tab: string) => void;
}

/**
 * Custom hook for handling notification navigation in FeedTab
 */
export function useNotificationNavigation(
  searchParams: URLSearchParams,
  pathname: string,
  navigate: NavigateFunction,
  options: UseNotificationNavigationOptions = {}
) {
  const { onPostHighlighted, onCommentHighlighted, onTabChanged } = options;

  const handleNotificationParams = async () => {
    const params = NotificationUrlParams.parseNotificationParams(searchParams);
    
    // Handle post highlighting
    if (params.highlightPostId) {
      await PostHighlighting.scrollToPost(params.highlightPostId);
      onPostHighlighted?.(params.highlightPostId);
    }
    
    // Handle comment highlighting
    if (params.highlightCommentId) {
      await PostHighlighting.scrollToComment(params.highlightCommentId);
      onCommentHighlighted?.(params.highlightCommentId);
    }
    
    // Handle tab changes
    if (params.activeTab) {
      onTabChanged?.(params.activeTab);
    }
    
    // Clean up URL parameters after handling
    if (NotificationUrlParams.hasNotificationParams(searchParams)) {
      setTimeout(() => {
        NotificationUrlParams.cleanNotificationParams(navigate, pathname, searchParams);
      }, 100);
    }
  };

  return {
    handleNotificationParams,
    hasNotificationParams: NotificationUrlParams.hasNotificationParams(searchParams)
  };
}