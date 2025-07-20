import React from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { OptimizedAvatar } from '@/components/ui/OptimizedAvatar';
import { log } from '@/utils/logger';
import type { NotificationWithActor } from '@/types/notification';

// ✅ COMPACT TIME FORMATTING: Like Skool's style (1h, 2h, 1d, etc.)
const formatCompactTime = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'now';
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo`;
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y`;
};

// ✅ TITLE CASE FORMATTING: Capitalize first letter of each word
const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface NotificationItemProps {
  notification: NotificationWithActor;
  onMarkAsRead: (notificationId: string) => void;
  onNavigate: (notification: NotificationWithActor) => void;
  className?: string;
}

// ✅ SIMPLIFIED: Simple notification display logic
const getSimpleDisplayText = (notification: NotificationWithActor): string => {
  const { actor_count = 1, actor_names = [], type, title } = notification;
  
  // Get actor name
  const actorName = notification.actor?.full_name || 'Someone';
  
  // Get action text
  const getActionText = (type: string) => {
    switch (type) {
      case 'post_like':
        return 'just liked your post';
      case 'comment_reply':
        return 'just replied to your comment';
      case 'space_join':
        return 'just joined';
      case 'mention':
        return 'just mentioned you in';
      case 'new_post':
        return 'just posted';
      default:
        return 'just interacted with your';
    }
  };
  
  const actionText = getActionText(type);
  
  // Simple format: "Francis Chukwuma just liked your post How to activate manus ai"
  if (actor_count <= 1) {
    return `${actorName} ${actionText} ${title}`;
  }
  
  // For batched notifications, show primary actor + count
  const primaryName = actor_names[0] || actorName;
  const othersCount = actor_count - 1;
  
  if (actor_count === 2) {
    const secondName = actor_names[1] || 'Someone';
    return `${primaryName} and ${secondName} ${actionText} ${title}`;
  } else {
    return `${primaryName} and ${othersCount} others ${actionText} ${title}`;
  }
};

export default function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onNavigate,
  className = '' 
}: NotificationItemProps) {
  const { 
    id, 
    type, 
    title, 
    content_preview, 
    created_at, 
    read, 
    actor,
    space 
  } = notification;

  const displayText = getSimpleDisplayText(notification);

  const handleClick = () => {
    if (!read) {
      onMarkAsRead(id);
    }
    onNavigate(notification);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${className} ${
        !read ? 'bg-blue-50/30' : ''
      }`}
      onClick={handleClick}
    >
      {/* Unread indicator - moved to far right */}
      {!read && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
      )}
      
      <div className="flex items-center space-x-3">
        {/* Actor Avatar - Centered */}
        <div className="flex-shrink-0 flex items-center justify-center relative">
          <OptimizedAvatar
            user={actor}
            size="md"
            className="w-10 h-10"
          />
          
          {/* Space icon - positioned at bottom-right */}
          {space && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-md shadow-lg">
              {space.icon_image ? (
                <img 
                  src={space.icon_image} 
                  alt={space.name}
                  className="w-full h-full rounded-md object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-md bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {space.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Notification content */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Actor + Action + Timestamp */}
          <div className="flex items-start justify-between">
            <div className="flex-1 text-sm font-medium text-gray-900 leading-tight">
              <span className="font-semibold capitalize">
                {notification.actor?.full_name || 'Someone'}
              </span>
              {' '}
              <span className="text-gray-600 font-normal">
                liked your post
              </span>
            </div>
            
            {/* Timestamp - positioned on the right */}
            <div className="text-xs text-gray-400 flex-shrink-0 ml-2">
              {formatCompactTime(new Date(created_at))}
            </div>
          </div>
          
          {/* Line 2: Post Title */}
          <div className="text-sm text-gray-900 font-normal mt-1 leading-tight">
            {toTitleCase(notification.title) || 'Untitled Post'}
          </div>
          
          {/* Line 3: Space name */}
          {notification.space && (
            <div className="text-xs text-gray-500 mt-1">
              in {notification.space.name}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}