import React from 'react';
import type { LegacyConversation } from '@/features/chat/types';
import { ChatAvatar } from '@/components/ui/OptimizedAvatar';
import { formatDistanceToNowStrict } from 'date-fns';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { navigateToConversation } from '@/utils/conversationUrlUtils';
import { Users } from 'lucide-react';

interface ChatListItemProps {
  conversation: LegacyConversation;
  onSelect: () => void;
  currentUserId?: string;
}

export default function ChatListItem({ conversation, onSelect, currentUserId }: ChatListItemProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isGroup = conversation.is_group;
  
  // Enhanced unread logic: Don't show as unread if the current user sent the latest message
  const latestMessageIsFromCurrentUser = conversation.latest_message_sender === currentUserId;
  const isUnread = conversation.unread_count > 0 && !latestMessageIsFromCurrentUser;
  
  const otherParticipant = !isGroup && conversation.other_participants.length > 0
    ? conversation.other_participants[0]
    : null;
    
  const displayName = isGroup 
    ? conversation.conversation_name 
    : otherParticipant?.full_name || 'Unknown User';

  const lastMessageTime = conversation.latest_message_time
    ? formatDistanceToNowStrict(new Date(conversation.latest_message_time), { addSuffix: true })
    : '';

  // Enhanced debug logging for conversation data (after variable declarations)
  console.log('[ChatListItem] 📋 CONVERSATION DATA:', {
    conversationId: conversation.conversation_id,
    latestMessage: {
      content: conversation.latest_message_content,
      time: conversation.latest_message_time,
      sender: conversation.latest_message_sender,
      isFromCurrentUser: latestMessageIsFromCurrentUser
    },
    unreadCount: conversation.unread_count,
    willShowAsUnread: isUnread,
    renderDetails: {
      displayName: displayName,
      lastMessageTime: lastMessageTime
    }
  });

  const handleClick = () => {
    if (isMobile) {
      // Mobile: Use URL navigation with conversation slugs
      const success = navigateToConversation(conversation.conversation_id);
      if (success) {
        console.log('📱 [ChatListItem] Mobile: Navigated to conversation URL:', conversation.conversation_id);
        // Still call onSelect to ensure any parent state is updated if needed
        onSelect();
      } else {
        console.warn('📱 [ChatListItem] Mobile: URL navigation failed, falling back to direct state');
        onSelect();
      }
    } else {
      // Desktop: Use existing direct state management
      console.log('🖥️ [ChatListItem] Desktop: Using direct state management');
      onSelect();
    }
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800"
    >
      {isGroup ? (
        <div className="h-12 w-12 mr-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Users className="h-6 w-6 text-white" />
        </div>
      ) : (
        <div className="mr-3 flex-shrink-0">
          <ChatAvatar
            user={{
              id: otherParticipant?.user_id || '',
              full_name: otherParticipant?.full_name || displayName,
              avatar_url: otherParticipant?.avatar_url
            }}
            size="lg"
            className="h-12 w-12"
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <p className={`text-sm font-semibold truncate ${
            isUnread 
              ? 'text-gray-900 dark:text-white' 
              : 'text-gray-700 dark:text-gray-200'
          }`}>
            {displayName}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-3">
            {lastMessageTime}
          </p>
        </div>
        <div className="flex justify-between items-center mb-1">
          <p className={`text-xs truncate ${
            isUnread 
              ? 'text-gray-600 dark:text-gray-300 font-medium' 
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {conversation.latest_message_content || 'No messages yet'}
          </p>
          {conversation.unread_count > 0 && (
            <span className="ml-2 flex-shrink-0 bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 