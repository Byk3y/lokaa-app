/**
 * Chat Hook
 * 
 * This hook provides a convenient interface for chat operations.
 * It wraps the useChatStore with more domain-specific methods.
 */

import { useCallback, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { getProtectedCurrentUser } from '@/utils/protectedAuth';
import { useChatStore } from '../store/chat-store';

export function useChat() {
  const store = useChatStore();
  
  // Initialize real-time subscriptions when hook is first used
  useEffect(() => {
    if (!store.hasInitialized) {
      store.initializeRealtime();
    }
    
    // ROCK SOLID: Self-healing monitoring system
    const setupSelfHealing = async () => {
      try {
        // Check if chat system monitoring is available
        if (typeof window !== 'undefined' && (window as any).chatSystemMonitor) {
          const monitor = (window as any).chatSystemMonitor;
          
          // Run initial health check
          const health = await monitor.runHealthCheck();
          
          if (health.overallHealth === 'critical' || health.overallHealth === 'concerning') {
            console.warn('🚨 [useChat] Chat system health issues detected, attempting auto-recovery...');
            
            // Attempt basic recovery
            try {
              // Clear caches and refresh
              const bridge = (window as any).supabaseIndexedDBBridge;
              if (bridge) {
                await bridge.clearCache();
                console.log('✅ [useChat] Cache cleared during auto-recovery');
              }
              
              // Reinitialize real-time connections
              store.cleanupRealtime();
              store.initializeRealtime();
              console.log('✅ [useChat] Real-time connections reinitialized');
              
              // Set up automatic recovery tracking
              (window as any).__chatAutoRecoveryCount = ((window as any).__chatAutoRecoveryCount || 0) + 1;
              
            } catch (recoveryError) {
              console.error('❌ [useChat] Auto-recovery failed:', recoveryError);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ [useChat] Self-healing setup failed (non-critical):', error);
      }
    };
    
    // Run self-healing setup after a delay to ensure all systems are loaded
    const healingTimeout = setTimeout(setupSelfHealing, 5000);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(healingTimeout);
      // Don't cleanup real-time here as other components might be using the store
    };
  }, [store.hasInitialized]);

  /**
   * Start a direct conversation with a user (ROCK SOLID VERSION with comprehensive error prevention)
   */
  const startDirectConversation = useCallback(async (targetUserId: string): Promise<string> => {
    const maxRetries = 5; // Increased from 3 for extra reliability
    let attempt = 1;
    const startTime = Date.now();
    
    // ROCK SOLID: Pre-flight validation
    if (!targetUserId || targetUserId.length !== 36) {
      throw new Error(`Invalid target user ID: ${targetUserId}`);
    }
    
    while (attempt <= maxRetries) {
      try {
        console.log(`[useChat] 🚀 ROCK SOLID: Starting direct conversation with user: ${targetUserId} (attempt ${attempt}/${maxRetries})`);
        
        const userResponse = await getProtectedCurrentUser();
        if (!userResponse?.data?.user?.id) {
          throw new Error('User not authenticated or invalid auth response');
        }
        
        const user = userResponse.data.user;
        console.log(`[useChat] ✅ Current user validated: ${user.id}`);
        
        // ROCK SOLID: Prevent self-conversation
        if (user.id === targetUserId) {
          throw new Error('Cannot create conversation with yourself');
        }
        
        let conversationId: string | null = null;
        let rpcError: any = null;
        
        // ROCK SOLID: Primary approach with comprehensive error handling
        try {
          console.log(`[useChat] 🎯 Attempting RPC call (attempt ${attempt})`);
          const { data, error } = await getSupabaseClient()
            .rpc('get_or_create_direct_conversation', {
              user1_id: user.id,
              user2_id: targetUserId
            });
          
          if (error) {
            rpcError = error;
            console.warn(`[useChat] ⚠️ RPC error (attempt ${attempt}):`, error);
          } else if (data) {
            conversationId = data;
            console.log(`[useChat] ✅ RPC success (attempt ${attempt}): Created/found conversation: ${conversationId}`);
          } else {
            rpcError = new Error('RPC returned null data');
            console.warn(`[useChat] ⚠️ RPC returned null data (attempt ${attempt})`);
          }
        } catch (rpcException) {
          rpcError = rpcException;
          console.warn(`[useChat] ⚠️ RPC exception (attempt ${attempt}):`, rpcException);
        }
        
        // ROCK SOLID: Fallback to direct database approach if RPC fails
        if (!conversationId && rpcError) {
          console.log(`[useChat] 🔄 RPC failed, trying direct database approach (attempt ${attempt})`);
          try {
            // Check if conversation already exists
            const { data: existingConversations, error: queryError } = await getSupabaseClient()
              .from('chat_participants')
              .select('conversation_id')
              .in('user_id', [user.id, targetUserId]);
            
            if (!queryError && existingConversations && existingConversations.length >= 2) {
              // Find conversation that has both users
              const conversationCounts = existingConversations.reduce((acc: Record<string, number>, p: any) => {
                acc[p.conversation_id] = (acc[p.conversation_id] || 0) + 1;
                return acc;
              }, {});
              
              const existingConvId = Object.keys(conversationCounts).find(id => conversationCounts[id] >= 2);
              if (existingConvId) {
                conversationId = existingConvId;
                console.log(`[useChat] ✅ Found existing conversation via direct query: ${conversationId}`);
              }
            }
            
            // Create new conversation if none exists
            if (!conversationId) {
              console.log(`[useChat] 🆕 Creating new conversation via direct database approach`);
              
              // Create conversation
              const newConvId = crypto.randomUUID();
              const { error: createError } = await getSupabaseClient()
                .from('chat_conversations')
                .insert({
                  id: newConvId,
                  is_group: false,
                  created_by: user.id
                });
              
              if (createError) throw createError;
              
              // Add participants
              const { error: participantsError } = await getSupabaseClient()
                .from('chat_participants')
                .insert([
                  { conversation_id: newConvId, user_id: user.id, is_admin: false },
                  { conversation_id: newConvId, user_id: targetUserId, is_admin: false }
                ]);
              
              if (participantsError) throw participantsError;
              
              conversationId = newConvId;
              console.log(`[useChat] ✅ Successfully created conversation via direct approach: ${conversationId}`);
            }
          } catch (directError) {
            console.error(`[useChat] ❌ Direct database approach failed (attempt ${attempt}):`, directError);
            if (attempt === maxRetries) {
              throw new Error(`All approaches failed. RPC error: ${rpcError?.message}, Direct error: ${directError}`);
            }
          }
        }
        
        if (!conversationId) {
          console.error(`[useChat] ❌ No conversation ID obtained (attempt ${attempt})`);
          if (attempt === maxRetries) {
            throw new Error(`Failed to create conversation after ${maxRetries} attempts. Last RPC error: ${rpcError?.message}`);
          }
          
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`[useChat] ⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
            continue;
        }
        
        // ROCK SOLID: Aggressive cache clearing before refresh
        console.log(`[useChat] 🧹 ROCK SOLID: Clearing all conversation-related caches`);
        
        // Clear IndexedDB cache
        if (typeof window !== 'undefined' && (window as any).supabaseIndexedDBBridge) {
          try {
            const bridge = (window as any).supabaseIndexedDBBridge;
            await bridge.clearUserConversationsCache?.(user.id);
            console.log(`[useChat] ✅ Cleared IndexedDB user conversations cache for user: ${user.id}`);
          } catch (clearError) {
            console.warn(`[useChat] ⚠️ Failed to clear IndexedDB cache:`, clearError);
          }
        }
        
        // Clear Zustand store cache by resetting hasInitialized flag
        const store = useChatStore.getState();
        store.reset();
        console.log(`[useChat] ✅ Reset chat store state`);
        
        // ROCK SOLID: Forced refresh with validation
        console.log(`[useChat] 🔄 ROCK SOLID: Force refreshing conversations`);
        await store.refreshConversations();
        
        // ROCK SOLID: Verify conversation exists in store with timeout
        const verificationTimeout = 10000; // 10 seconds
        const verificationStartTime = Date.now();
        let conversationFound = false;
        
        while (!conversationFound && (Date.now() - verificationStartTime) < verificationTimeout) {
          const currentStore = useChatStore.getState();
          const foundConversation = currentStore.getConversationById(conversationId);
          
          console.log(`[useChat] 🔍 Verification check: {conversationId: '${conversationId}', existsInStore: ${!!foundConversation}, storeConversationsCount: ${currentStore.conversations.length}, storeConversationIds: [${currentStore.conversations.map(c => c.conversation_id).join(', ')}]}`);
          
          if (foundConversation) {
            conversationFound = true;
            console.log(`[useChat] ✅ ROCK SOLID: Conversation verified in store: ${conversationId}`);
            break;
          }
          
          // Wait a bit and try refresh again if not found
          if (Date.now() - verificationStartTime < verificationTimeout - 1000) {
            console.log(`[useChat] ⏳ Conversation not found in store, waiting 500ms and trying refresh again...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            await store.refreshConversations();
          }
        }
        
        if (!conversationFound) {
          console.error(`[useChat] ❌ ROCK SOLID: Conversation ${conversationId} not found in store after ${verificationTimeout}ms`);
          if (attempt === maxRetries) {
            // ROCK SOLID: Emergency fallback - try to navigate anyway
            console.log(`[useChat] 🚨 EMERGENCY FALLBACK: Attempting navigation with unverified conversation`);
            return conversationId;
          }
          
          // Retry with longer delay
          const retryDelay = Math.min(2000 * attempt, 8000);
          console.log(`[useChat] ⏳ Retrying after ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          attempt++;
          continue;
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`[useChat] 🎉 ROCK SOLID SUCCESS: Conversation ready in ${totalTime}ms after ${attempt} attempts`);
        
        // ROCK SOLID: Final monitoring and analytics
        if (typeof window !== 'undefined') {
          (window as any).__chatMetrics = {
            lastSuccess: Date.now(),
            totalAttempts: attempt,
            totalTime: totalTime,
            conversationId: conversationId,
            method: rpcError ? 'direct_database' : 'rpc',
            userId: user.id,
            targetUserId: targetUserId
          };
        }
        
        return conversationId;
        
      } catch (error) {
        console.error(`[useChat] ❌ Error starting conversation (attempt ${attempt}):`, error);
        
        if (attempt === maxRetries) {
          // ROCK SOLID: Comprehensive error reporting
          const totalTime = Date.now() - startTime;
          const errorReport = {
            error: error instanceof Error ? error.message : String(error),
            attempts: attempt,
            totalTime: totalTime,
            targetUserId: targetUserId,
            timestamp: new Date().toISOString()
          };
          
          console.error(`[useChat] 💥 ROCK SOLID: Final failure report:`, errorReport);
          
          // Store error metrics for debugging
          if (typeof window !== 'undefined') {
            (window as any).__chatErrors = (window as any).__chatErrors || [];
            (window as any).__chatErrors.push(errorReport);
            
            // Keep only last 10 errors
            if ((window as any).__chatErrors.length > 10) {
              (window as any).__chatErrors = (window as any).__chatErrors.slice(-10);
            }
          }
          
          throw new Error(`ROCK SOLID: Conversation failed after ${attempt} attempts in ${totalTime}ms: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Exponential backoff for retries
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[useChat] ⏳ Waiting ${delay}ms before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      }
    }
    
    throw new Error('ROCK SOLID: Unexpected exit from retry loop');
  }, []);

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