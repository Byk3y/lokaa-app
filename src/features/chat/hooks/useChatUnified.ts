import { log } from '@/utils/logger';
/**
 * useChatUnified Hook - Backward compatibility wrapper
 * 
 * Combines all specialized hooks to provide the same API as the legacy useChat hook.
 * This enables gradual migration while maintaining full functionality.
 */

import { useCallback } from 'react';
import { useConversations } from './useConversations';
import { useMessages } from './useMessages';
import { useChatRealtime } from './useChatRealtime';
import { useChatNavigation } from './useChatNavigation';

/**
 * Unified chat hook for backward compatibility
 */
export function useChatUnified() {
  // Specialized hooks
  const conversations = useConversations();
  const messages = useMessages(conversations.activeConversationId || undefined);
  const realtime = useChatRealtime();
  const navigation = useChatNavigation();

  /**
   * Legacy startDirectConversation - enhanced with comprehensive error handling
   */
  const startDirectConversation = useCallback(async (targetUserId: string): Promise<string> => {
    log.debug('Hook', '[useChatUnified] Starting direct conversation with:', targetUserId);
    
    try {
      const conversationId = await conversations.startDirectConversation(targetUserId);
      
      // Navigate to the conversation
      navigation.navigateToConversation(conversationId);
      
      return conversationId;
    } catch (error) {
      log.error('Hook', '[useChatUnified] Failed to start conversation:', error);
      throw error;
    }
  }, [conversations.startDirectConversation, navigation.navigateToConversation]);

  /**
   * Legacy getMessagesForConversation
   */
  const getMessagesForConversation = useCallback((conversationId: string) => {
    return messages.messages; // Current hook is already scoped to active conversation
  }, [messages.messages]);

  /**
   * Legacy isLoadingMessages
   */
  const isLoadingMessages = useCallback((conversationId: string) => {
    return messages.isLoading;
  }, [messages.isLoading]);

  // Return unified API that matches legacy useChat hook
  return {
    // Conversation state (legacy names)
    conversations: conversations.legacyConversations,
    loadingConversations: conversations.loading,
    activeConversationId: conversations.activeConversationId,
    
    // Message state (legacy names)
    messages: messages.messages || {},
    loadingMessages: { [conversations.activeConversationId || '']: messages.isLoading },
    lastMessageUpdate: Date.now(), // Simplified for now
    
    // Connection state (legacy names)
    isConnected: realtime.connectionStatus.isConnected,
    connectionError: realtime.connectionStatus.errorMessage,
    error: conversations.error || messages.error || realtime.diagnostics.systemError,
    hasInitialized: conversations.hasInitialized,
    
    // Core conversation operations
    fetchConversations: conversations.fetchConversations,
    refreshConversations: conversations.refreshConversations,
    createConversation: conversations.createConversation,
    setActiveConversationId: conversations.setActiveConversationId,
    getConversationById: conversations.getConversationById,
    
    // Message operations
    fetchMessages: messages.fetchMessages,
    sendMessage: messages.sendMessage,
    markConversationAsRead: messages.markAsRead,
    
    // Real-time operations
    initializeRealtime: realtime.initialize,
    cleanupRealtime: realtime.cleanup,
    
    // Utility functions
    getUnreadCount: () => conversations.unreadCount,
    getMessagesForConversation,
    isLoadingMessages,
    startDirectConversation,
    
    // Error handling
    setError: conversations.setError,
    clearError: conversations.clearError,
    
    // Additional unified functionality
    navigation: {
      // Mobile URL navigation
      navigateToConversation: navigation.navigateToConversation,
      navigateToConversationList: navigation.navigateToConversationList,
      generateConversationUrl: navigation.generateConversationUrl,
      parseCurrentUrl: navigation.parseCurrentUrl,
      isNavigationActive: navigation.isNavigationActive
    },
    
    realtime: {
      // Real-time diagnostics
      connectionStatus: realtime.connectionStatus,
      subscriptionInfo: realtime.subscriptionInfo,
      isHealthy: realtime.isHealthy,
      diagnostics: realtime.diagnostics
    },
    
    // Hook-specific operations
    hooks: {
      conversations,
      messages,
      realtime,
      navigation
    }
  };
}

/**
 * Type export for external use
 */
export type UseChatUnifiedReturn = ReturnType<typeof useChatUnified>; 