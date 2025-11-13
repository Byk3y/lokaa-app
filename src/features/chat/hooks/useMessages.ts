import { log } from '@/utils/logger';
/**
 * useMessages Hook
 * 
 * Provides message management functionality using the specialized MessageStore.
 * Replaces message-related logic from the monolithic useChat hook.
 * 
 * Features:
 * - Message fetching and sending
 * - Optimistic updates
 * - Message retry mechanism
 * - Real-time message handling
 * - Read status management
 */

import { useCallback, useEffect, useRef } from 'react';
import { useMessageStore } from '../store/messageStore';
import { useConversationStore } from '../store/conversationStore';
import type { Message } from '../services/ChatApiService';

/**
 * Hook for message management for a specific conversation
 */
export function useMessages(conversationId?: string) {
  // Store selectors
  const {
    messages,
    loadingMessages,
    retryQueue,
    error,
    fetchMessages,
    sendMessage,
    markAsRead,
    getMessages,
    getLatestMessage,
    addRealTimeMessage,
    retryFailedMessages,
    setError,
    reset
  } = useMessageStore();

  const {
    updateConversation,
    reorderConversations
  } = useConversationStore();

  // Track visibility state
  const wasVisibleRef = useRef(true);

  // Auto-fetch messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      log.debug('Hook', '[useMessages] Auto-fetching messages for conversation:', conversationId);
      fetchMessages(conversationId);
    }
  }, [conversationId, fetchMessages]);

  // ✅ CRITICAL FIX: Visibility-aware refresh - detect when page becomes visible again
  // Wait for rehydration before checking if messages are empty
  useEffect(() => {
    if (!conversationId) return;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      // Only handle when page becomes visible (not when it becomes hidden)
      if (isVisible && !wasVisibleRef.current) {
        log.debug('Hook', '[useMessages] Page became visible - waiting for rehydration before checking');
        
        // ✅ CRITICAL FIX: Wait for persistence rehydration before checking messages
        // This prevents false empty checks when messages exist but haven't loaded yet
        setTimeout(() => {
          // ✅ FIX: Access store directly inside handler to avoid function reference dependencies
          const store = useMessageStore.getState();
          
          // Check localStorage first as fallback
          import('@/utils/chatPersistenceRecovery').then(({ 
            getMessagesFromStorage, 
            getLastFetchTimeFromStorage,
            hasMessagesInStorage 
          }) => {
            // Access store functions directly from store state
            const storeMessages = store.getMessages(conversationId);
            const storedMessages = getMessagesFromStorage(conversationId);
            const hasStoredMessages = hasMessagesInStorage(conversationId);
            
            // Use store messages if available, otherwise check storage
            const messages = storeMessages.length > 0 ? storeMessages : storedMessages;
            const isEmpty = !messages || messages.length === 0;
            
            // Get fetch time from store or storage
            const storeFetchTime = store.getLastFetchTime(conversationId);
            const storedFetchTime = getLastFetchTimeFromStorage(conversationId);
            const lastFetch = storeFetchTime || storedFetchTime;
            
            // Only check staleness if we have messages
            const isStaleData = isEmpty ? true : store.isStale(conversationId, 0);
            const timeSinceFetch = lastFetch > 0 ? Date.now() - lastFetch : Infinity;
            
            log.debug('Hook', '[useMessages] Visibility check after rehydration:', {
              conversationId,
              storeMessagesCount: storeMessages.length,
              storedMessagesCount: storedMessages.length,
              isEmpty,
              hasStoredMessages,
              lastFetch,
              timeSinceFetch,
              isStaleData
            });
            
            if (isEmpty && !hasStoredMessages) {
              // Truly empty - no cached data, fetch immediately
              log.debug('Hook', '[useMessages] No messages found (store or storage), fetching:', conversationId);
              store.fetchMessages(conversationId, { force: true });
            } else if (!isEmpty && timeSinceFetch > 30000) {
              // Messages exist but might be stale (>30 seconds) - refresh in background
              log.debug('Hook', '[useMessages] Messages exist but stale, refreshing in background');
              store.fetchMessages(conversationId, { force: true });
            } else if (hasStoredMessages && storeMessages.length === 0) {
              // Messages exist in storage but not in store yet - wait for rehydration
              // Don't trigger fetch, let rehydration happen naturally
              log.debug('Hook', '[useMessages] Messages exist in storage, waiting for rehydration');
            } else {
              log.debug('Hook', '[useMessages] Messages are fresh, no refresh needed');
            }
          });
        }, 200); // Wait 200ms for rehydration to complete
      }
      
      wasVisibleRef.current = isVisible;
    };

    // Set initial visibility state
    wasVisibleRef.current = !document.hidden;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [conversationId]); // ✅ FIX: Only depend on conversationId - access store directly inside handler

  /**
   * Get messages for the current conversation
   */
  const conversationMessages = conversationId ? getMessages(conversationId) : [];

  /**
   * Check if messages are loading for the current conversation
   */
  const isLoading = conversationId ? (loadingMessages[conversationId] || false) : false;

  /**
   * Get latest message for the current conversation
   */
  const latestMessage = conversationId ? getLatestMessage(conversationId) : undefined;

  /**
   * Enhanced send message with conversation updates
   */
  const sendMessageEnhanced = useCallback(async (
    content: string,
    attachmentUrl?: string,
    attachmentType?: string
  ) => {
    if (!conversationId) {
      throw new Error('No conversation selected');
    }

    try {
      await sendMessage(conversationId, content, attachmentUrl, attachmentType);
      
      // Update conversation with new message
      updateConversation(conversationId, {
        last_message: content,
        last_message_at: new Date().toISOString()
      });
      
      // Reorder conversations to bring this one to the top
      reorderConversations();
      
    } catch (error) {
      log.error('Hook', '[useMessages] Failed to send message:', error);
      throw error;
    }
  }, [conversationId, sendMessage, updateConversation, reorderConversations]);

  /**
   * Enhanced mark as read with conversation updates
   */
  const markConversationAsRead = useCallback(async () => {
    if (!conversationId) {
      throw new Error('No conversation selected');
    }

    try {
      await markAsRead(conversationId);
      
      // Update conversation unread count
      updateConversation(conversationId, {
        unread_count: 0
      });
      
    } catch (error) {
      log.error('Hook', '[useMessages] Failed to mark as read:', error);
      throw error;
    }
  }, [conversationId, markAsRead, updateConversation]);

  /**
   * Handle real-time message updates
   */
  const handleRealTimeMessage = useCallback((message: Message, isFromOtherUser: boolean) => {
    if (!conversationId) return;

    // Add message to store
    addRealTimeMessage(conversationId, message);
    
    // Update conversation data
    updateConversation(conversationId, {
      last_message: message.content,
      last_message_at: message.created_at
    });
    
    // Increment unread count if message is from another user
    if (isFromOtherUser) {
      const currentConversation = useConversationStore.getState().getConversationById(conversationId);
      const currentUnread = currentConversation?.unread_count || 0;
      
      updateConversation(conversationId, {
        unread_count: currentUnread + 1
      });
    }
    
    // Reorder conversations
    reorderConversations();
  }, [conversationId, addRealTimeMessage, updateConversation, reorderConversations]);

  /**
   * Retry failed messages for current conversation
   */
  const retryConversationMessages = useCallback(async () => {
    if (!conversationId) return;
    
    // Filter retry queue for current conversation
    const conversationRetries = retryQueue.filter(item => 
      item.conversationId === conversationId
    );
    
    if (conversationRetries.length > 0) {
      log.debug('Hook', '[useMessages] Retrying', conversationRetries.length, 'failed messages for conversation:', conversationId);
      await retryFailedMessages();
    }
  }, [conversationId, retryQueue, retryFailedMessages]);

  /**
   * Get failed messages for current conversation
   */
  const failedMessages = conversationId 
    ? retryQueue.filter(item => item.conversationId === conversationId)
    : [];

  /**
   * Check if there are failed messages for current conversation
   */
  const hasFailedMessages = failedMessages.length > 0;

  /**
   * Get messages with optimistic and failed state indicators
   */
  const messagesWithState = conversationMessages.map(message => ({
    ...message,
    isOptimistic: message._isOptimistic || false,
    isFailed: message._failed || false,
    isRetrying: failedMessages.some(failed => failed.tempId === message.id)
  }));

  /**
   * Refresh messages for current conversation
   */
  const refreshMessages = useCallback(async (force: boolean = false) => {
    if (conversationId) {
      await fetchMessages(conversationId, { force });
    }
  }, [conversationId, fetchMessages]);

  /**
   * Clear messages for current conversation
   */
  const clearConversationMessages = useCallback(() => {
    if (conversationId) {
      // Implementation would need to be added to MessageStore
      log.debug('Hook', '[useMessages] Clear messages for conversation:', conversationId);
    }
  }, [conversationId]);

  return {
    // State
    messages: conversationMessages,
    messagesWithState,
    isLoading,
    error,
    latestMessage,
    
    // Failed message state
    failedMessages,
    hasFailedMessages,
    retryQueue: failedMessages, // Only for current conversation
    
    // Core operations
    fetchMessages: () => conversationId ? fetchMessages(conversationId) : Promise.resolve(),
    sendMessage: sendMessageEnhanced,
    markAsRead: markConversationAsRead,
    refreshMessages,
    
    // Real-time updates
    handleRealTimeMessage,
    addRealTimeMessage: (message: Message) => 
      conversationId ? addRealTimeMessage(conversationId, message) : undefined,
    
    // Retry mechanism
    retryFailedMessages: retryConversationMessages,
    
    // Error handling
    setError,
    clearError: () => setError(null),
    
    // Utilities
    clearMessages: clearConversationMessages,
    reset
  };
}

/**
 * Hook for global message operations (not tied to specific conversation)
 */
export function useGlobalMessages() {
  const {
    messages,
    loadingMessages,
    retryQueue,
    error,
    retryFailedMessages,
    setError,
    reset
  } = useMessageStore();

  return {
    // Global state
    allMessages: messages,
    allLoadingMessages: loadingMessages,
    globalRetryQueue: retryQueue,
    error,
    
    // Global operations
    retryAllFailedMessages: retryFailedMessages,
    
    // Error handling
    setError,
    clearError: () => setError(null),
    
    // Utilities
    reset
  };
}

/**
 * Type exports for external use
 */
export type UseMessagesReturn = ReturnType<typeof useMessages>;
export type UseGlobalMessagesReturn = ReturnType<typeof useGlobalMessages>; 