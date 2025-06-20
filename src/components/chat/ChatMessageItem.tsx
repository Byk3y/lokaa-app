import React from 'react';
import { ChatAvatar } from '@/components/ui/OptimizedAvatar';
import { format } from 'date-fns'; // For more precise time formatting like '4:14pm'
import { Check, CheckCheck, Star } from 'lucide-react';
import { formatInTimezone } from '@/utils/formatters';
import { useTimezone } from '@/hooks/useTimezone';

interface Sender {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  conversation_id: string;
  sender?: Sender;
  is_edited?: boolean;
  read_by_ids?: string[];
}

interface ChatMessageItemProps {
  message: Message;
  currentUserId: string | null | undefined;
  isFirstInSequence?: boolean;
  isLastInSequence?: boolean;
  hasSpecialStatus?: boolean;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ 
  message, 
  currentUserId,
  isFirstInSequence,
  isLastInSequence,
  hasSpecialStatus = false // Default to false
}) => {
  const { userTimezone } = useTimezone();
  const isCurrentUserMessage = message.sender_id === currentUserId;
  const senderName = message.sender?.full_name || 'Unknown User';

  const formatTime = (timeStr: string) => {
    try {
      // Format the time in the user's timezone
      return formatInTimezone(
        new Date(timeStr),
        { hour: 'numeric', minute: 'numeric', hour12: true },
        userTimezone
      ).toLowerCase(); // Keep lowercase for consistency
    } catch {
      return '';
    }
  };

  // Conditional styling based on sender
  const messageContainerClasses = isCurrentUserMessage 
    ? 'flex flex-col items-end ml-auto' 
    : 'flex flex-row items-start';
  
  const bubbleClasses = isCurrentUserMessage
    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white'
    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100';

  const nameAndTimestampClasses = isCurrentUserMessage
    ? 'text-right mr-2'
    : 'text-left ml-2';

  // Use a proper read status from the message data instead of random
  const isRead = isCurrentUserMessage && (message.read_by_ids && message.read_by_ids.length > 0);

  // Render GIF if content is a GIF URL
  const isGif = typeof message.content === 'string' &&
    (message.content.match(/^https?:\/\/.*\.(gif)(\?.*)?$/i) || message.content.includes('giphy.com/media/'));

  return (
    <div className={`mb-4 ${messageContainerClasses}`}>
      {!isCurrentUserMessage && isFirstInSequence && (
        <div className="mr-2.5 mt-0.5 flex-shrink-0">
          <ChatAvatar
            user={{
              id: message.sender_id,
              full_name: senderName,
              avatar_url: message.sender?.avatar_url
            }}
          />
        </div>
      )}
      
      {!isCurrentUserMessage && !isFirstInSequence && (
        <div className="w-7 mr-2.5 flex-shrink-0" />
      )}
      
      <div className="max-w-[70%]">
        {!isCurrentUserMessage && isFirstInSequence && (
          <div className="ml-2 mb-1 flex items-center">
            <span className="text-xs font-medium text-gray-800 dark:text-gray-300">
              {senderName}
            </span>
            {hasSpecialStatus && (
              <Star className="h-3 w-3 text-yellow-400 ml-1 fill-current" />
            )}
          </div>
        )}

        <div className={`${bubbleClasses} px-3 py-2 rounded-lg inline-block break-words`}>
          {isGif ? (
            <img src={message.content} alt="GIF" className="max-w-xs max-h-60 rounded-lg" />
          ) : (
            message.content
          )}
          
          {message.is_edited && (
            <span className="text-xs opacity-70 ml-1">(edited)</span>
          )}
          </div>
          
        <div className={`flex items-center mt-1 text-xs text-gray-500 ${nameAndTimestampClasses}`}>
          <span>{formatTime(message.created_at)}</span>
          
              {isCurrentUserMessage && (
            <span className="ml-1 flex items-center">
                  {isRead ? (
                    <CheckCheck className="h-3 w-3 text-teal-500" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageItem; 