/**
 * Chat Hook
 * 
 * This hook provides a convenient interface for chat operations.
 * It wraps the useChatStore with more domain-specific methods.
 */

import { useCallback, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useChatStore } from '../store/chat-store';

export function useChat() {
  const store = useChatStore();
  
  // Initialize real-time subscriptions when hook is first used
  useEffect(() => {
    if (!store.hasInitialized) {
      store.initializeRealtime();
    }
    
    // Cleanup on unmount
    return () => {
      // Don't cleanup here as other components might be using the store
    };
  }, [store.hasInitialized]);

  /**
   * Start a direct conversation with a user (with retry logic)
   */
  const startDirectConversation = useCallback(async (userId: string) => {
    const maxRetries = 2;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[useChat] Starting direct conversation with user: ${userId} (attempt ${attempt})`);
        
        // Get user with retry logic for auth issues
        const { data: { user }, error: authError } = await getSupabaseClient().auth.getUser();
        
        if (authError) {
          console.warn(`[useChat] Auth error on attempt ${attempt}:`, authError);
          if (attempt < maxRetries) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw authError;
        }
        
        if (!user) {
          const error = new Error('User not authenticated - no user returned');
          console.warn(`[useChat] No user on attempt ${attempt}:`, error);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw error;
        }

        // Try the RPC call
        const { data, error } = await (getSupabaseClient().rpc as any)(
          'get_or_create_direct_conversation',
          {
            user1_id: user.id,
            user2_id: userId
          }
        );
        
        if (error) {
          console.warn(`[useChat] RPC error on attempt ${attempt}:`, error);
          if (attempt < maxRetries && (error.message?.includes('network') || error.message?.includes('connection'))) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw error;
        }
        
        console.log('[useChat] Created/found conversation:', data);
        
        // Refresh conversations to get the new/updated conversation
        store.fetchConversations();
        
        return data;
        
      } catch (error) {
        lastError = error;
        console.warn(`[useChat] Attempt ${attempt} failed:`, error);
        
        // If it's a network-related error and we have retries left, try again
        if (attempt < maxRetries && (
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('ERR_CONNECTION_CLOSED') ||
          error.message?.includes('network') ||
          error.message?.includes('connection')
        )) {
          console.log(`[useChat] Network error detected, retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // If it's not retryable or we're out of retries, break
        break;
      }
    }
    
    // All attempts failed
    console.error(`[useChat] All ${maxRetries} attempts failed. Last error:`, lastError);
    throw lastError || new Error('Failed to start conversation after multiple attempts');
  }, [store]);

  return {
    // Store state
    conversations: store.conversations,
    loadingConversations: store.loadingConversations,
    messages: store.messages,
    loadingMessages: store.loadingMessages,
    activeConversationId: store.activeConversationId,
    lastMessageUpdate: store.lastMessageUpdate,
    error: store.error,
    isConnected: store.isConnected,
    
    // Store actions
    fetchConversations: store.fetchConversations,
    refreshConversations: store.refreshConversations,
    fetchMessages: store.fetchMessages,
    sendMessage: store.sendMessage,
    markConversationAsRead: store.markConversationAsRead,
    createConversation: store.createConversation,
    setActiveConversationId: store.setActiveConversationId,
    getUnreadCount: store.getUnreadCount,
    getConversationById: store.getConversationById,
    
    // Utility functions for ChatView compatibility
    getMessagesForConversation: (conversationId: string) => {
      return store.messages[conversationId] || [];
    },
    isLoadingMessages: (conversationId: string) => {
      return store.loadingMessages[conversationId] || false;
    },
    
    // Custom methods
    startDirectConversation,
  };
} 