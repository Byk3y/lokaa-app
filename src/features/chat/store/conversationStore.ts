import { log } from '@/utils/logger';
/**
 * Conversation Store
 * 
 * Specialized Zustand store for conversation management.
 * Extracted from chat-store.ts for better separation of concerns.
 * 
 * Features:
 * - Conversation CRUD operations
 * - Participant management
 * - Active conversation tracking
 * - Mobile browser protection
 * - Cache integration with ChatApiService
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { chatApiService, type Conversation } from '../services/ChatApiService';
import { globalConsoleFlags } from '@/utils/developmentLogger';

/**
 * Conversation state interface
 */
interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  loading: boolean;
  error: string | null;
  hasInitialized: boolean;
  lastUpdate: number;
}

/**
 * Conversation actions interface
 */
interface ConversationActions {
  // Core operations
  fetchConversations: (userId?: string, options?: { forceNetwork?: boolean; urgent?: boolean }) => Promise<void>;
  refreshConversations: (userId?: string, options?: { forceNetwork?: boolean; urgent?: boolean }) => Promise<void>;
  createConversation: (userIds: string[], isGroup: boolean, name?: string, creatorId?: string) => Promise<string>;
  
  // Active conversation management
  setActiveConversationId: (id: string | null) => void;
  getActiveConversation: () => Conversation | undefined;
  
  // Conversation queries
  getConversationById: (id: string) => Conversation | undefined;
  getConversationBySlug: (slug: string) => Promise<Conversation | null>;
  
  // Unread count management
  getUnreadCount: () => number;
  updateConversationUnreadCount: (conversationId: string, count: number) => void;
  
  // Real-time updates
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  reorderConversations: () => void;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // State management
  setLoading: (loading: boolean) => void;
  markAsInitialized: () => void;
  reset: () => void;
}

type ConversationStore = ConversationState & ConversationActions;

/**
 * Conversation store instance
 */
export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: [],
      activeConversationId: null,
      loading: false,
      error: null,
      hasInitialized: false,
      lastUpdate: Date.now(),

      // Fetch conversations
      fetchConversations: async (userId?: string, options: { forceNetwork?: boolean; urgent?: boolean } = {}) => {
        const state = get();
        
        if (!userId) {
          log.warn('App', '[ConversationStore] No user ID provided, cannot fetch conversations - user may not be authenticated yet');
          set({ error: 'User not authenticated', loading: false });
          return;
        }
        
        // ✅ CRITICAL FIX: Check urgent flag FIRST to bypass all blocking
        if (options.urgent) {
          if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
            log.debug('App', '[ConversationStore] ⚡ URGENT: Bypassing initialization check, forcing refresh (user:', userId?.substring(0, 8) + '...)');
          }
          // Reset any blocking states for urgent requests
          if (state.loading) {
            if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
              log.debug('App', '[ConversationStore] ⚡ URGENT: Resetting loading state to allow immediate refresh');
            }
            set({ loading: false });
          }
        } else if (state.hasInitialized || state.loading) {
          if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
            log.debug('App', '[ConversationStore] Already initialized or loading, skipping... (user:', userId?.substring(0, 8) + '...)');
          }
          return;
        }

        set({ loading: true, error: null });
        
        try {
          const result = await chatApiService.getUserConversations(userId, options);
          
          if (result.error) {
            throw result.error;
          }
          
          const newConversations = result.data || [];
          
          // ✅ CRITICAL FIX: Preserve activeConversationId if it exists and conversation still exists
          // This prevents losing activeConversationId when conversations are refreshed
          const currentState = get();
          let preservedActiveId = currentState.activeConversationId;
          
          // If activeConversationId exists but conversation not in new list, clear it
          if (preservedActiveId && !newConversations.find(c => c.conversation_id === preservedActiveId)) {
            log.debug('App', '[ConversationStore] Active conversation no longer exists, clearing activeConversationId');
            preservedActiveId = null;
          }
          
          set({ 
            conversations: newConversations, 
            loading: false, 
            hasInitialized: true,
            activeConversationId: preservedActiveId, // Preserve or clear based on above check
            lastUpdate: Date.now()
          });
          
          const urgentLabel = options.urgent ? '⚡ URGENT' : '';
          const networkLabel = options.forceNetwork ? '(forced network)' : '(cache-first)';
          if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
            log.debug('App', `[ConversationStore] ${urgentLabel} Fetched conversations:`, result.data?.length || 0, networkLabel);
          }
        } catch (error) {
          log.error('App', '[ConversationStore] Error fetching conversations:', error);
          set({ 
            loading: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch conversations'
          });
        }
      },

      // Force refresh conversations
      refreshConversations: async (userId?: string, options: { forceNetwork?: boolean; urgent?: boolean } = {}) => {
        if (!options.urgent) {
          set({ hasInitialized: false });
        }
        
        await get().fetchConversations(userId, { 
          forceNetwork: true, 
          urgent: options.urgent || false,
          ...options 
        });
      },

      // Create new conversation  
      createConversation: async (userIds: string[], isGroup: boolean, name?: string, creatorId?: string) => {
        try {
          if (!creatorId) {
            throw new Error('Creator ID is required');
          }
          
          const result = await chatApiService.createConversation(userIds, isGroup, creatorId, name);
          
          if (result.error) {
            throw result.error;
          }
          
          // Refresh conversations to include the new one
          await get().refreshConversations(creatorId);
          
          return result.data!;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
          set({ error: errorMessage });
          throw error;
        }
      },

      // Active conversation management
      setActiveConversationId: (id: string | null) => {
        if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
          log.debug('App', '[ConversationStore] Setting active conversation:', id);
        }
        set({ activeConversationId: id });
      },

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find(conv => conv.conversation_id === activeConversationId);
      },

      // Conversation queries
      getConversationById: (id: string) => {
        const { conversations } = get();
        return conversations.find(conv => conv.conversation_id === id);
      },

      getConversationBySlug: async (slug: string) => {
        try {
          const { conversations } = get();
          const result = await chatApiService.getConversationBySlug(slug, conversations);
          return result.data;
        } catch (error) {
          log.error('App', '[ConversationStore] Error getting conversation by slug:', error);
          return null;
        }
      },

      // Unread count management
      getUnreadCount: () => {
        const { conversations } = get();
        return conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0);
      },

      updateConversationUnreadCount: (conversationId: string, count: number) => {
        set(state => ({
          conversations: state.conversations.map(conv =>
            conv.conversation_id === conversationId
              ? { ...conv, unread_count: count }
              : conv
          ),
          lastUpdate: Date.now()
        }));
      },

      // Real-time updates
      updateConversation: (conversationId: string, updates: Partial<Conversation>) => {
        set(state => ({
          conversations: state.conversations.map(conv =>
            conv.conversation_id === conversationId
              ? { ...conv, ...updates }
              : conv
          ),
          lastUpdate: Date.now()
        }));
      },

      reorderConversations: () => {
        set(state => ({
          conversations: [...state.conversations].sort((a, b) => {
            const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return bTime - aTime; // Most recent first
          }),
          lastUpdate: Date.now()
        }));
      },

      // Error handling
      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // State management
      setLoading: (loading: boolean) => {
        set({ loading });
      },

      markAsInitialized: () => {
        set({ hasInitialized: true });
      },

      reset: () => {
        set({
          conversations: [],
          activeConversationId: null,
          loading: false,
          error: null,
          hasInitialized: false,
          lastUpdate: Date.now()
        });
      }
    }),
    {
      name: 'conversation-store',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        hasInitialized: state.hasInitialized
      })
    }
  )
);

/**
 * Conversation store singleton for external access
 */
export const conversationStore = {
  getState: () => useConversationStore.getState(),
  setState: useConversationStore.setState,
  subscribe: useConversationStore.subscribe
}; 