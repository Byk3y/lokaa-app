import { log } from '@/utils/logger';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useMessages } from '@/features/chat';
import type { LegacyConversation } from '@/features/chat/types';

/**
 * Custom hook for managing chat business logic
 *
 * Extracts shared business logic from ChatView to support mobile/desktop split.
 * Handles message fetching, sending, conversation state, and connection context management.
 *
 * @param initialConversation - The conversation to manage
 * @param onConversationUpdated - Optional callback when conversation is updated
 * @returns Chat logic state and handlers
 */
export function useChatLogic(
  initialConversation: LegacyConversation,
  onConversationUpdated?: () => void
) {
  const { user } = useOptimizedAuth();

  // Message store system
  const {
    messages,
    isLoading,
    sendMessage,
    refreshMessages
  } = useMessages(initialConversation.conversation_id);

  // Check localStorage for cached messages before showing spinner
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  const [cachedMessages, setCachedMessages] = useState<Array<{
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    [key: string]: unknown;
  }>>([]);

  useEffect(() => {
    // Check localStorage immediately for cached messages
    if (!hasCheckedStorage && initialConversation.conversation_id) {
      import('@/utils/chatPersistenceRecovery').then(({ getMessagesFromStorage }) => {
        const storedMessages = getMessagesFromStorage(initialConversation.conversation_id);
        if (storedMessages.length > 0) {
          log.debug('Hook', '🗨️ [useChatLogic] Found cached messages in storage:', storedMessages.length);
          setCachedMessages(storedMessages);
        }
        setHasCheckedStorage(true);
      });
    }
  }, [hasCheckedStorage, initialConversation.conversation_id]);

  // Clear cached messages when store messages become available
  useEffect(() => {
    if (messages.length > 0 && cachedMessages.length > 0) {
      log.debug('Hook', '🗨️ [useChatLogic] Store messages loaded, clearing cached messages');
      setCachedMessages([]);
    }
  }, [messages.length, cachedMessages.length]);

  // Use cached messages if store messages are empty but we have cached ones
  const displayMessages = messages.length > 0 ? messages : (cachedMessages.length > 0 ? cachedMessages : []);
  const shouldShowLoading = isLoading && messages.length === 0 && cachedMessages.length === 0;

  const [sending, setSending] = useState(false);
  const [currentConversation, setCurrentConversation] = useState(initialConversation);

  // Early stable determination of connection context
  const [shouldShowConnectionContext, setShouldShowConnectionContext] = useState(() => {
    // Determine this immediately on first render to prevent layout shifts
    const isDirectConversation = !initialConversation.is_group;
    const hasOtherParticipant = isDirectConversation && initialConversation.other_participants?.length > 0;
    return hasOtherParticipant;
  });

  // Track ConnectionContext loading state to prevent layout shift
  const [isConnectionContextLoading, setIsConnectionContextLoading] = useState(() => {
    // If we should show connection context, assume it's loading initially
    const isDirectConversation = !initialConversation.is_group;
    const hasOtherParticipant = isDirectConversation && initialConversation.other_participants?.length > 0;
    return hasOtherParticipant;
  });

  // Scroll preservation refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef<boolean>(true);
  const previousMessagesLength = useRef<number>(0);
  const connectionContextLoaded = useRef<boolean>(false);
  const hasScrolledToBottom = useRef<boolean>(false);

  /**
   * Handle ConnectionContext loading state changes
   */
  const handleConnectionContextLoadingChange = useCallback((isLoading: boolean) => {
    log.debug('Hook', '🗨️ [useChatLogic] ConnectionContext loading state changed:', isLoading);
    setIsConnectionContextLoading(isLoading);
  }, []);

  // Get other participant info
  const isDirectConversation = !currentConversation.is_group;
  const otherParticipant = isDirectConversation && currentConversation.other_participants?.[0];

  // Update conversation when initialConversation changes
  useEffect(() => {
    setCurrentConversation(initialConversation);

    // Update connection context visibility only if it changes significantly
    const newIsDirectConversation = !initialConversation.is_group;
    const newHasOtherParticipant = newIsDirectConversation && initialConversation.other_participants?.length > 0;

    // Only update if this represents a significant change
    if (newHasOtherParticipant !== shouldShowConnectionContext && initialConversation.other_participants?.length > 0) {
      log.debug('Hook', '🗨️ [useChatLogic] 🔄 Connection context visibility updated:', newHasOtherParticipant);
      setShouldShowConnectionContext(newHasOtherParticipant);
    }
  }, [initialConversation, shouldShowConnectionContext]);

  // Auto-refresh messages when conversation changes
  useEffect(() => {
    if (currentConversation?.conversation_id) {
      log.debug('Hook', '🗨️ [useChatLogic] Conversation changed, refreshing messages for:', currentConversation.conversation_id);

      // Reset flags for new conversation
      isInitialLoad.current = true;
      connectionContextLoaded.current = false;
      previousMessagesLength.current = 0;
      hasScrolledToBottom.current = false;

      refreshMessages();

      // Mark conversation as read when sender opens it
      if (user?.id) {
        import('@/features/chat/store/messageStore').then(({ useMessageStore }) => {
          useMessageStore.getState().markAsRead(currentConversation.conversation_id);
          log.debug('Hook', '🗨️ [useChatLogic] ✅ Marked conversation as read for current user');
        }).catch(error => {
          log.warn('Hook', '🗨️ [useChatLogic] ⚠️ Failed to mark as read:', error);
        });
      }
    }
  }, [currentConversation?.conversation_id, user?.id, refreshMessages]);

  // Ensure messages are fetched if empty on mount (handles persistence rehydration delay)
  useEffect(() => {
    if (!currentConversation?.conversation_id) return;

    // Small delay to allow persistence to rehydrate first
    const timeoutId = setTimeout(() => {
      // Access messages directly from store to avoid stale closure
      import('@/features/chat/store/messageStore').then(({ useMessageStore }) => {
        const store = useMessageStore.getState();
        const currentMessages = store.getMessages(currentConversation.conversation_id);
        const isLoading = store.loadingMessages[currentConversation.conversation_id] || false;

        if (currentMessages.length === 0 && !isLoading) {
          log.debug('Hook', '🗨️ [useChatLogic] Messages still empty after delay, fetching:', currentConversation.conversation_id);
          store.fetchMessages(currentConversation.conversation_id, { force: true });
        }
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [currentConversation?.conversation_id]);

  /**
   * Handle sending a message
   */
  const handleSendMessage = async (content: string) => {
    if (!user || !currentConversation?.conversation_id) return;
    setSending(true);
    try {
      await sendMessage(content);

      if (onConversationUpdated) {
        onConversationUpdated();
      }
    } catch (error) {
      log.error('Hook', "Error sending message:", error as Error);
    } finally {
      setSending(false);
    }
  };

  return {
    // Messages
    messages: displayMessages,
    isLoading: shouldShowLoading,
    sending,
    handleSendMessage,

    // Conversation state
    currentConversation,
    otherParticipant,

    // Connection context
    shouldShowConnectionContext,
    isConnectionContextLoading,
    handleConnectionContextLoadingChange,

    // Scroll management refs
    messagesEndRef,
    messagesContainerRef,
    isInitialLoad,
    previousMessagesLength,
    hasScrolledToBottom,

    // User
    user
  };
}

/**
 * Return type for useChatLogic hook
 */
export type UseChatLogicReturn = ReturnType<typeof useChatLogic>;
