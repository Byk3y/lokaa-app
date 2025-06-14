import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, X, ArrowLeft, Star, Maximize, Minimize, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { LegacyConversation } from '@/features/chat/types';
import { getInitial } from '@/shared/utils/avatar-utils';
import { formatActiveTime } from '@/utils/formatters';
import { useTimezone } from '@/hooks/useTimezone';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface ChatHeaderProps {
  conversation: LegacyConversation;
  onBack?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  showBackButton?: boolean;
  onExpand?: () => void;
  isExpanded?: boolean;
}

const getDynamicActivityStatus = (
  isGroup: boolean, 
  lastSeen: string | null, 
  isOnline: boolean, 
  memberCount: number
): string => {
  if (isGroup) {
    return `${memberCount} members`;
  }
  
  if (isOnline) return 'Online';
  if (lastSeen) return `Active ${lastSeen}`;
  return 'Last seen recently';
};

export default function ChatHeader({ 
  conversation, 
  onBack, 
  onClose, 
  showCloseButton = false,
  showBackButton = false,
  onExpand,
  isExpanded = false
}: ChatHeaderProps) {
  const { user } = useOptimizedAuth();
  const { userTimezone } = useTimezone();
  
  const isGroup = conversation.is_group;
  const otherParticipant = !isGroup && conversation.other_participants.length > 0
    ? conversation.other_participants[0]
    : null;
    
  const displayName = isGroup 
    ? conversation.conversation_name 
    : otherParticipant?.full_name || 'Unknown User';
    
  const hasSpecialStatus = !isGroup && otherParticipant?.user_id === 'kia_ghasem_id';

  const avatarUrl = !isGroup ? otherParticipant?.avatar_url : null;
  const avatarFallback = getInitial(displayName);
  
  const activityStatus = getDynamicActivityStatus(
    isGroup,
    otherParticipant?.last_seen_at,
    otherParticipant?.is_online || false,
    conversation.other_participants.length + (isGroup ? 1 : 0)
  );

  // Generate a properly formatted activity status with timezone
  const formattedActiveStatus = isGroup 
    ? `${conversation.other_participants.length + 1} members` 
    : formatActiveTime(otherParticipant?.last_seen_at, userTimezone);

  return (
    <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center flex-1 min-w-0">
        {showBackButton && onBack && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            className="mr-2 h-8 w-8 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-12 w-12 mr-3 flex-shrink-0 border border-gray-100 dark:border-gray-700 shadow-sm">
          {isGroup ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
              <Users className="h-6 w-6 text-white" />
            </div>
          ) : (
            <>
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-600 text-white">{avatarFallback}</AvatarFallback>
            </>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              {displayName}
            </h2>
            {hasSpecialStatus && (
              <Star className="h-3.5 w-3.5 text-yellow-400 ml-1.5 flex-shrink-0" fill="currentColor" />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={formattedActiveStatus}>
            {formattedActiveStatus}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4 ml-2 flex-shrink-0">
        {onExpand && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onExpand}
          className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hidden sm:inline-flex"
          title={isExpanded ? 'Collapse' : 'Expand'}
          aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}
        >
          {isExpanded ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="More options"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
        {showCloseButton && onClose && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Close"
        >
          <X className="h-5 w-5" />
        </Button>
        )}
      </div>
    </div>
  );
} 