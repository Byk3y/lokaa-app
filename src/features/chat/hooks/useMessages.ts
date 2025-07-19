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

import { useCallback, useEffect } from 'react';
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

  // Auto-fetch messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      log.debug('Hook', '[useMessages] Auto-fetching messages for conversation:', conversationId);
      fetchMessages(conversationId);
    }
  }, [conversationId, fetchMessages]);

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
  const refreshMessages = useCallback(async () => {
    if (conversationId) {
      await fetchMessages(conversationId);
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