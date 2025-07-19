import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { notificationService } from '@/services/NotificationService';
import { notificationBatchManager } from '@/services/NotificationBatchManager';
import { log } from '@/utils/logger';
import type { NotificationWithActor } from '@/types/notification';

interface NotificationItemProps {
  notification: NotificationWithActor;
  onMarkAsRead?: (notificationIds: string[]) => void;
}

export default function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const navigate = useNavigate();

  // Format timestamp (3h, 2d, 25d format like Skool)
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d`;
    }
  };

  // Get action text based on notification type (now supports batching)
  const getActionText = () => {
    const actionText = notificationBatchManager.getBatchedActionText(notification);
    
    // Fix the action text to match Skool's shorter format
    switch (notification.type) {
      case 'new_post':
        return 'new post';
      case 'post_like':
        return 'liked your post';
      case 'comment_reply':
        return 'replied to your comment';
      case 'mention':
        return 'mentioned you';
      case 'space_join':
        return 'joined the space';
      default:
        return actionText;
    }
  };

  // Get role display text
  const getRoleText = () => {
    if (notification.actor_relationship === 'admin') {
      return '(admin)';
    } else if (notification.actor_relationship === 'following') {
      return '(following)';
    }
    return '';
  };

  // Handle notification click
  const handleClick = async () => {
    try {
      // Mark as clicked and read
      await notificationService.markAsClicked(notification.id);
      
      // Update local state - this will trigger removal from the list
      if (onMarkAsRead) {
        onMarkAsRead([notification.id]);
      }

      // Navigate based on notification type
      await handleNavigation();
    } catch (error) {
      log.error('NotificationItem', 'Error handling notification click:', error);
    }
  };

  // Handle navigation to the appropriate page
  const handleNavigation = async () => {
    if (!notification.space?.subdomain) {
      log.warn('NotificationItem', 'No space subdomain for navigation');
      return;
    }

    const baseUrl = `/${notification.space.subdomain}/space`;

    switch (notification.type) {
      case 'new_post':
      case 'post_like':
      case 'mention':
        // Navigate to space and highlight the specific post
        if (notification.target_id) {
          navigate(`${baseUrl}?highlight=${notification.target_id}`);
          log.debug('NotificationItem', `Navigating to post: ${notification.target_id}`);
        } else {
          navigate(baseUrl);
          log.debug('NotificationItem', `Navigating to space: ${notification.space.subdomain}`);
        }
        break;
      
      case 'comment_reply':
        // Navigate to space and highlight the specific comment
        if (notification.target_id) {
          navigate(`${baseUrl}?highlight_comment=${notification.target_id}`);
          log.debug('NotificationItem', `Navigating to comment: ${notification.target_id}`);
        } else {
          navigate(baseUrl);
          log.debug('NotificationItem', `Navigating to space: ${notification.space.subdomain}`);
        }
        break;
      
      case 'space_join':
        // Navigate to space members tab
        navigate(`${baseUrl}?tab=members`);
        log.debug('NotificationItem', `Navigating to space members: ${notification.space.subdomain}`);
        break;
      
      default:
        // Default to space home
        navigate(baseUrl);
        log.debug('NotificationItem', `Navigating to space home: ${notification.space.subdomain}`);
        break;
    }
  };

  // Get user's display name (now supports batching)
  const getDisplayName = () => {
    // Check if this is a batched notification (multiple actors)
    if (notification.actor_count && notification.actor_count > 1) {
      const batchInfo = notificationBatchManager.getBatchDisplayInfo(notification);
      return batchInfo.displayText;
    }
    
    // Single actor notification - improved fallback logic
    if (notification.actor?.full_name) {
      return notification.actor.full_name;
    }
    
    // Try to construct name from first/last name
    if (notification.actor?.first_name || notification.actor?.last_name) {
      const firstName = notification.actor.first_name || '';
      const lastName = notification.actor.last_name || '';
      return `${firstName} ${lastName}`.trim() || 'User';
    }
    
    // Last resort - use actor ID or generic name
    if (notification.actor?.id) {
      return 'User';
    }
    
    // If no actor data at all, this is a system notification
    return 'System';
  };

  // Get user's avatar URL
  const getAvatarUrl = () => {
    return notification.actor?.avatar_url || 
           notification.actor?.user_metadata?.avatar_url;
  };

  // Get space icon URL
  const getSpaceIconUrl = () => {
    return notification.space?.icon_image;
  };

  // Get space name for fallback initial
  const getSpaceName = () => {
    return notification.space?.name || '';
  };

  // Check if user has verified badge (diamond emoji)
  const hasVerifiedBadge = () => {
    // This would be based on some user verification status
    // For now, we'll assume admins get the diamond badge
    return notification.actor_relationship === 'admin';
  };

  // Get batch indicator for UI (show count badge for batched notifications)
  const getBatchIndicator = () => {
    if (notification.actor_count && notification.actor_count > 1) {
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full ml-1">
          {notification.actor_count}
        </span>
      );
    }
    return null;
  };

  return (
    <div 
      className="flex items-start px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      {/* Avatar section */}
      <div className="flex-shrink-0 mr-3">
        <div className="relative">
          {getAvatarUrl() ? (
            <img 
              src={getAvatarUrl()} 
              alt={getDisplayName()}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {getDisplayName().charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {/* Space icon - positioned at bottom-right (Skool-style rounded square) */}
          {notification.space_id && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-md border-2 border-white shadow-lg">
              {getSpaceIconUrl() ? (
                <img 
                  src={getSpaceIconUrl()} 
                  alt={getSpaceName()}
                  className="w-full h-full rounded-md object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-md bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {getSpaceName().charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Admin badge - only show when no space icon (positioned at bottom-right) */}
          {notification.actor_relationship === 'admin' && !notification.space_id && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
          )}
        </div>
      </div>

      {/* Content section - properly aligned with avatar */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* First line - Name, badge, role, and action text */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <span className="font-bold text-gray-900 text-sm truncate">
              {getDisplayName()}
            </span>
            
            {getBatchIndicator()}
            
            {hasVerifiedBadge() && (
              <span className="text-blue-500 text-sm flex-shrink-0">💎</span>
            )}
            
            <span className="text-gray-500 text-sm flex-shrink-0">
              {getRoleText()}
            </span>
            
            <span className="text-gray-500 text-sm flex-shrink-0">
              {getActionText()}
            </span>
          </div>
          
          {/* Timestamp positioned at top-right */}
          <span className="text-gray-400 text-sm flex-shrink-0 ml-2">
            {formatTimestamp(notification.created_at)}
          </span>
        </div>

        {/* Second line - Post title with proper truncation */}
        <div className="text-sm text-gray-600 leading-relaxed mb-1">
          <span className="line-clamp-2 block">
            {notification.title}
          </span>
        </div>

        {/* Third line - Content preview (if exists) with proper truncation */}
        {notification.content_preview && (
          <div className="text-xs text-gray-500">
            <span className="line-clamp-1 block">
              {notification.content_preview}
            </span>
          </div>
        )}
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="flex-shrink-0 ml-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
      )}
    </div>
  );
}