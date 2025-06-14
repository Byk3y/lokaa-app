import React from 'react';
import type { LegacyConversation } from '@/features/chat/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitial } from '@/shared/utils/avatar-utils';
import { formatDistanceToNowStrict } from 'date-fns';

interface ChatListItemProps {
  conversation: LegacyConversation;
  onSelect: () => void;
  currentUserId?: string;
}

export default function ChatListItem({ conversation, onSelect, currentUserId }: ChatListItemProps) {
  const isGroup = conversation.is_group;
  const otherParticipant = !isGroup && conversation.other_participants.length > 0
    ? conversation.other_participants[0]
    : null;
    
  const displayName = isGroup 
    ? conversation.conversation_name 
    : otherParticipant?.full_name || 'Unknown User';

  const avatarUrl = !isGroup ? otherParticipant?.avatar_url : null;
  const avatarFallback = getInitial(displayName);

  const lastMessageTime = conversation.latest_message_time
    ? formatDistanceToNowStrict(new Date(conversation.latest_message_time), { addSuffix: true })
    : '';

  return (
    <div
      onClick={onSelect}
      className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800"
    >
      <Avatar className="h-12 w-12 mr-3">
        <AvatarImage src={avatarUrl || undefined} alt={displayName || ''} />
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
            {displayName}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
            {lastMessageTime}
          </p>
        </div>
        <div className="flex justify-between items-center mt-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {conversation.latest_message_content || 'No messages yet'}
          </p>
          {conversation.unread_count > 0 && (
            <span className="ml-2 flex-shrink-0 bg-teal-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 