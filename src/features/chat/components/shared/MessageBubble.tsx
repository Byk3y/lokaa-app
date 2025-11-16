import React from 'react';
import type { User } from '@supabase/supabase-js';
import { ChatAvatar } from '@/components/ui/OptimizedAvatar';

/**
 * Message interface matching the chat message structure
 */
interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: {
    full_name?: string | null;
    avatar_url?: string | null;
  };
  _isOptimistic?: boolean;
  _failed?: boolean;
}

/**
 * Props for MessageBubble component
 */
interface MessageBubbleProps {
  /** The message to render */
  message: Message;
  /** Whether this message is from the current user */
  isOwnMessage: boolean;
  /** The current user object */
  user: User | null;
}

/**
 * MessageBubble Component
 *
 * Renders a single message bubble with sender avatar, content, and status indicators.
 * Platform-agnostic component used for both mobile and desktop views.
 *
 * Features:
 * - Sender avatar (only for other users' messages)
 * - Message content with appropriate styling
 * - Optimistic update indicator (Sending...)
 * - Failed message indicator
 * - Responsive layout
 *
 * @param props - Component props
 * @returns Rendered message bubble
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage
}) => {
  return (
    <div
      key={message.id}
      className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : ''}`}
    >
      {/* Show avatar only for other users' messages */}
      {!isOwnMessage && (
        <ChatAvatar
          user={{
            id: message.sender_id,
            full_name: message.sender?.full_name || 'User',
            avatar_url: message.sender?.avatar_url
          }}
        />
      )}

      {/* Message bubble */}
      <div
        className={`max-w-xs md:max-w-md p-3 rounded-lg ${
          isOwnMessage
            ? 'bg-teal-500 text-white'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }`}
      >
        <p className="text-sm">{message.content}</p>

        {/* Optimistic update indicator */}
        {message._isOptimistic && (
          <div className="text-xs opacity-60 mt-1">Sending...</div>
        )}

        {/* Failed message indicator */}
        {message._failed && (
          <div className="text-xs text-red-300 mt-1">Failed to send</div>
        )}
      </div>
    </div>
  );
};

MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;
