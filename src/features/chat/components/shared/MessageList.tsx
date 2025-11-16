import React, { useEffect, RefObject } from 'react';
import { log } from '@/utils/logger';
import type { User } from '@supabase/supabase-js';
import { MessageBubble } from './MessageBubble';
import ConnectionContext from '@/components/chat/ConnectionContext';

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
 * Other participant interface
 */
interface OtherParticipant {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Props for MessageList component
 */
interface MessageListProps {
  /** Array of messages to display */
  messages: Message[];
  /** Current user object */
  user: User | null;
  /** Ref to the messages end element for scroll management */
  messagesEndRef: RefObject<HTMLDivElement>;
  /** Ref to the messages container element for scroll management */
  messagesContainerRef: RefObject<HTMLDivElement>;
  /** Whether to show connection context */
  shouldShowConnectionContext: boolean;
  /** Whether connection context is loading */
  isConnectionContextLoading: boolean;
  /** Callback when connection context loading state changes */
  onConnectionContextLoadingChange: (isLoading: boolean) => void;
  /** Other participant in the conversation (for connection context) */
  otherParticipant?: OtherParticipant | false;
  /** Whether messages are loading */
  isLoading: boolean;
  /** Ref to track if this is initial load */
  isInitialLoad: RefObject<boolean>;
  /** Ref to track previous messages length */
  previousMessagesLength: RefObject<number>;
  /** Ref to track if scrolled to bottom */
  hasScrolledToBottom: RefObject<boolean>;
}

/**
 * MessageList Component
 *
 * Renders the list of messages with scroll management and connection context.
 * Platform-agnostic component used for both mobile and desktop views.
 *
 * Features:
 * - Message rendering with MessageBubble components
 * - Connection context display for direct conversations
 * - Automatic scroll management (initial load and new messages)
 * - Loading states and placeholders
 * - Instant bottom positioning without animation
 *
 * @param props - Component props
 * @returns Rendered message list
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  user,
  messagesEndRef,
  messagesContainerRef,
  shouldShowConnectionContext,
  isConnectionContextLoading,
  onConnectionContextLoadingChange,
  otherParticipant,
  isLoading,
  isInitialLoad,
  previousMessagesLength,
  hasScrolledToBottom
}) => {
  // Debug: Track container mounting and DOM changes
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      log.debug('Component', '🔍 [MessageList] Container mounted:', {
        className: container.className,
        dataset: container.dataset,
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight
      });

      // Monitor DOM changes that might cause scroll repositioning
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            log.debug('Component', '🔍 [MessageList] DOM mutation detected:', {
              type: mutation.type,
              target: mutation.target,
              addedNodes: mutation.addedNodes.length,
              removedNodes: mutation.removedNodes.length,
              attributeName: mutation.attributeName,
              containerScrollTop: container.scrollTop,
              containerScrollHeight: container.scrollHeight
            });
          }
        });
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });

      return () => observer.disconnect();
    }
  }, [messagesContainerRef]);

  // Instant bottom positioning: Pre-calculate and set scroll position before rendering
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Only position when messages are actually rendered
    // This means either no connection context needed, or connection context has finished loading
    const shouldPosition = !shouldShowConnectionContext || !isConnectionContextLoading;

    if (shouldPosition && messages.length > 0) {
      // Instant bottom: Pre-calculate total height needed for all messages
      const estimatedMessageHeight = 80; // Average height per message in pixels
      const connectionContextHeight = shouldShowConnectionContext ? 200 : 0; // Height of connection context
      const paddingHeight = 32; // Account for container padding (p-4 = 16px top + 16px bottom)
      const totalEstimatedHeight = (messages.length * estimatedMessageHeight) + connectionContextHeight + paddingHeight;

      // Instant bottom: Set container height and scroll position BEFORE rendering
      container.style.height = `${totalEstimatedHeight}px`;
      container.scrollTop = container.scrollHeight;

      // Instant bottom: Force immediate positioning without any animation
      // Use multiple requestAnimationFrame calls to ensure positioning happens after DOM updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container) {
            // Instant bottom: Force scroll to absolute bottom
            container.scrollTop = container.scrollHeight;

            // Mark that we've positioned to bottom
            hasScrolledToBottom.current = true;
            isInitialLoad.current = false;

            log.debug('Component', '🔍 [MessageList] Instant bottom positioning completed:', {
              scrollTop: container.scrollTop,
              scrollHeight: container.scrollHeight,
              clientHeight: container.clientHeight,
              messageCount: messages.length,
              estimatedHeight: totalEstimatedHeight
            });
          }
        });
      });
    }
  }, [shouldShowConnectionContext, isConnectionContextLoading, messages.length, messagesContainerRef, hasScrolledToBottom, isInitialLoad]);

  // Handle NEW messages with instant positioning (no animation)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !messages.length) return;

    // Don't scroll if ConnectionContext is still loading
    if (shouldShowConnectionContext && isConnectionContextLoading) {
      log.debug('Component', '🗨️ [MessageList] Skipping scroll - ConnectionContext still loading');
      return;
    }

    // Don't scroll on initial load - Effect 1 handles that
    if (isInitialLoad.current || !hasScrolledToBottom.current) {
      log.debug('Component', '🗨️ [MessageList] Skipping scroll - Initial load handled by Effect 1');
      return;
    }

    // Only handle NEW messages, not initial load
    const currentMessageCount = messages.length;
    const previousCount = previousMessagesLength.current;

    if (currentMessageCount <= previousCount) {
      log.debug('Component', '🗨️ [MessageList] Skipping scroll - No new messages', {
        current: currentMessageCount,
        previous: previousCount
      });
      return;
    }

    // Update previous count
    previousMessagesLength.current = currentMessageCount;

    const currentScrollHeight = container.scrollHeight;
    const currentScrollTop = container.scrollTop;
    const currentClientHeight = container.clientHeight;

    // Calculate: Are we near the bottom?
    const isNearBottom = (currentScrollHeight - currentScrollTop - currentClientHeight) < 100;

    // Instant bottom: Only scroll if user was near bottom, and use instant positioning
    if (isNearBottom) {
      // Instant bottom: Use immediate positioning, no animation
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: 'auto', // Changed from 'smooth' to 'auto' for instant positioning
          block: 'end',
          inline: 'nearest'
        });
      }
    }
  }, [messages.length, shouldShowConnectionContext, isConnectionContextLoading, messagesEndRef, messagesContainerRef, isInitialLoad, hasScrolledToBottom, previousMessagesLength]);

  return (
    <>
      {/* Connection Context - Stable rendering with reserved space */}
      {shouldShowConnectionContext ? (
        otherParticipant ? (
          <ConnectionContext
            otherUserId={otherParticipant.user_id}
            otherUserName={otherParticipant.full_name || 'User'}
            otherUserAvatar={otherParticipant.avatar_url}
            onLoadingStateChange={onConnectionContextLoadingChange}
          />
        ) : (
          // Reserved space: Placeholder to prevent layout shift while loading participant data
          <div className="connection-context-placeholder bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse">
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading connection info...</div>
          </div>
        )
      ) : null}

      {/* Loading spinner */}
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin h-6 w-6 border-t-2 border-blue-500 rounded-full"></div>
        </div>
      ) : (shouldShowConnectionContext && isConnectionContextLoading) ? (
        // Show placeholder while ConnectionContext is loading to maintain visual order
        <div className="flex justify-center items-center h-32">
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading connection context...</div>
        </div>
      ) : messages.length > 0 ? (
        // Render messages using MessageBubble component
        messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwnMessage={msg.sender_id === user?.id}
            user={user}
          />
        ))
      ) : null}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </>
  );
};

MessageList.displayName = 'MessageList';

export default MessageList;
