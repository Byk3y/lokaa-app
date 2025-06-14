/**
 * Enhanced Chat Store with Real-time Updates
 * 
 * This implements the improved chat functionality with:
 * - Real-time message updates
 * - Optimistic UI updates
 * - Message retry mechanism
 * - Better error handling
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabaseClient } from '@/integrations/supabase/client';

/**
 * Message interface
 */
export interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  is_edited: boolean;
  attachment_url?: string;
  attachment_type?: string;
  read_by_ids: string[];
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  // For optimistic updates
  _isOptimistic?: boolean;
  _failed?: boolean;
}

/**
 * Conversation interface
 */
export interface Conversation {
  conversation_id: string;
  is_group: boolean;
  name?: string;
  created_by: string;
  created_at: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  participants: Array<{
    user_id: string;
    is_admin: boolean;
    user?: {
      id: string;
      full_name: string;
      avatar_url?: string;
    };
  }>;
}

/**
 * Chat state interface
 */
interface ChatState {
  conversations: Conversation[];
  loadingConversations: boolean;
  messages: Record<string, Message[]>;
  loadingMessages: Record<string, boolean>;
  activeConversationId: string | null;
  lastMessageUpdate: number;
  error: string | null;
  hasInitialized: boolean; // Flag to prevent multiple initialization attempts
  // Real-time connection state
  isConnected: boolean;
  connectionError: string | null;
  // Retry queue for failed messages
  retryQueue: Array<{
    tempId: string;
    conversationId: string;
    content: string;
    attachmentUrl?: string;
    attachmentType?: string;
    attempts: number;
  }>;
}

/**
 * Chat actions interface
 */
interface ChatActions {
  // Conversations
  fetchConversations: () => Promise<void>;
  refreshConversations: () => Promise<void>; // Force refresh ignoring cache
  createConversation: (userIds: string[], isGroup: boolean, name?: string) => Promise<string>;
  getConversationById: (id: string) => Conversation | undefined;
  
  // Messages
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, attachmentUrl?: string, attachmentType?: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  
  // Real-time
  initializeRealtime: () => void;
  cleanupRealtime: () => void;
  
  // Active conversation
  setActiveConversationId: (id: string | null) => void;
  
  // Utilities
  getUnreadCount: () => number;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Retry mechanism
  retryFailedMessages: () => Promise<void>;
  
  // Reset
  reset: () => void;
}

type ChatStore = ChatState & ChatActions;

// Global subscription manager to prevent multiple connections
let globalSubscriptions: {
  global?: any;
  conversations: Record<string, any>;
} = {
  conversations: {}
};

/**
 * Chat store with real-time capabilities
 */
export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: [],
      loadingConversations: false,
      messages: {},
      loadingMessages: {},
      activeConversationId: null,
      lastMessageUpdate: Date.now(),
      error: null,
      hasInitialized: false,
      isConnected: false,
      connectionError: null,
      retryQueue: [],

      // Initialize real-time subscriptions
      initializeRealtime: () => {
        console.log('[ChatStore] Initializing real-time subscriptions');

        if (globalSubscriptions.global) {
          getSupabaseClient().removeChannel(globalSubscriptions.global);
        }

        const globalChannel = getSupabaseClient()
          .channel('global-chat-updates')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'chat_conversations'
          }, (payload) => {
            console.log('[ChatStore] Conversation change detected:', payload);
            get().fetchConversations();
          })
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages'
          }, async (payload) => {
            console.log('[ChatStore] New message detected:', payload);
            const newMessage = payload.new as any;
            
            if (newMessage?.conversation_id) {
              // Fetch the sender information for the new message
              try {
                const { data: senderData, error } = await (getSupabaseClient() as any)
                  .from('users')
                  .select('id, full_name, avatar_url')
                  .eq('id', newMessage.sender_id)
                  .single();
                
              const messageWithSender: Message = {
                id: newMessage.id,
                content: newMessage.content,
                created_at: newMessage.created_at,
                sender_id: newMessage.sender_id,
                is_edited: newMessage.is_edited || false,
                attachment_url: newMessage.attachment_url,
                attachment_type: newMessage.attachment_type,
                read_by_ids: newMessage.read_by_ids || [],
                  sender: !error && senderData ? {
                    id: senderData.id,
                    full_name: senderData.full_name,
                    avatar_url: senderData.avatar_url,
                  } : undefined
              };

              set(state => ({
                messages: {
                  ...state.messages,
                  [newMessage.conversation_id]: [
                    ...(state.messages[newMessage.conversation_id] || []),
                    messageWithSender
                  ]
                },
                lastMessageUpdate: Date.now()
              }));

              get().fetchConversations();
              } catch (error) {
                console.error('[ChatStore] Error fetching sender for real-time message:', error);
              }
            }
          })
          .subscribe((status) => {
            console.log('[ChatStore] Global subscription status:', status);
            set({
              isConnected: status === 'SUBSCRIBED',
              connectionError: status === 'CHANNEL_ERROR' ? 'Connection failed' : null
            });
          });

        globalSubscriptions.global = globalChannel;
      },

      // Clean up real-time subscriptions
      cleanupRealtime: () => {
        console.log('[ChatStore] Cleaning up real-time subscriptions');
        
        if (globalSubscriptions.global) {
          getSupabaseClient().removeChannel(globalSubscriptions.global);
          globalSubscriptions.global = undefined;
        }
        
        Object.values(globalSubscriptions.conversations).forEach(channel => {
          getSupabaseClient().removeChannel(channel);
        });
        globalSubscriptions.conversations = {};
        
        set({ isConnected: false, connectionError: null });
      },

      // Fetch conversations
      fetchConversations: async () => {
        const user = await getCurrentUser();
        if (!user) return;
        
        const { loadingConversations } = get();
        if (loadingConversations) return;
        
        set({ loadingConversations: true, error: null });
        
        try {
          // Use type assertion for chat tables
          const { data, error } = await (getSupabaseClient() as any)
            .from('user_conversations')
            .select('*')
            .eq('user_id', user.id)
            .order('last_message_at', { ascending: false });
            
          if (error) throw error;
          
          const transformedData: Conversation[] = (data || []).map((record: any) => {
            let otherParticipants = [];
            try {
              if (Array.isArray(record.other_participants)) {
                otherParticipants = record.other_participants;
              } else if (typeof record.other_participants === 'string') {
                otherParticipants = JSON.parse(record.other_participants);
              } else if (typeof record.other_participants === 'object' && record.other_participants !== null) {
                otherParticipants = Array.isArray(record.other_participants) 
                  ? record.other_participants 
                  : [record.other_participants];
              }
            } catch (err) {
              console.error('Error parsing other_participants:', err);
              otherParticipants = [];
            }
            
            const participants = otherParticipants.map((p: any) => ({
              user_id: p.user_id,
              is_admin: false,
              user: {
                id: p.user_id,
                full_name: p.full_name,
                avatar_url: p.avatar_url,
              }
            }));
            
            return {
              conversation_id: record.conversation_id,
              is_group: record.is_group,
              name: record.conversation_name,
              created_by: '',
              created_at: record.created_at,
              last_message: record.latest_message_content,
              last_message_at: record.last_message_at,
              unread_count: record.unread_count || 0,
              participants: participants,
            };
          });
          
          set({ conversations: transformedData, loadingConversations: false, hasInitialized: true });
          
          if (!get().isConnected) {
            get().initializeRealtime();
          }
        } catch (error) {
          console.error('[ChatStore] Error fetching conversations:', error);
          set({ 
            loadingConversations: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch conversations'
          });
        }
      },
      
      // Force refresh conversations (ignores cache)
      refreshConversations: async () => {
        const user = await getCurrentUser();
        if (!user) return;
        
        const { loadingConversations } = get();
        if (loadingConversations) return;
        
        set({ loadingConversations: true, error: null, hasInitialized: false });
        
        try {
          const { data, error } = await (getSupabaseClient() as any)
            .from('user_conversations')
            .select('*')
            .eq('user_id', user.id)
            .order('last_message_at', { ascending: false });
            
          if (error) throw error;
          
          const transformedData: Conversation[] = (data || []).map((record: any) => {
            let otherParticipants = [];
            try {
              if (Array.isArray(record.other_participants)) {
                otherParticipants = record.other_participants;
              } else if (typeof record.other_participants === 'string') {
                otherParticipants = JSON.parse(record.other_participants);
              } else if (typeof record.other_participants === 'object' && record.other_participants !== null) {
                otherParticipants = Array.isArray(record.other_participants) 
                  ? record.other_participants 
                  : [record.other_participants];
              }
            } catch (err) {
              console.error('Error parsing other_participants:', err);
              otherParticipants = [];
            }
            
            const participants = otherParticipants.map((p: any) => ({
              user_id: p.user_id,
              is_admin: false,
              user: {
                id: p.user_id,
                full_name: p.full_name,
                avatar_url: p.avatar_url,
              }
            }));
            
            return {
              conversation_id: record.conversation_id,
              is_group: record.is_group,
              name: record.conversation_name,
              created_by: '',
              created_at: record.created_at,
              last_message: record.latest_message_content,
              last_message_at: record.last_message_at,
              unread_count: record.unread_count || 0,
              participants: participants,
            };
          });
          
          set({ conversations: transformedData, loadingConversations: false, hasInitialized: true });
        } catch (error) {
          console.error('[ChatStore] Error refreshing conversations:', error);
          set({ 
            loadingConversations: false, 
            hasInitialized: true,
            error: error instanceof Error ? error.message : 'Failed to refresh conversations'
          });
        }
      },
      
      // Fetch messages for a conversation
      fetchMessages: async (conversationId: string) => {
        const user = await getCurrentUser();
        if (!user || !conversationId) return;
        
        set(state => ({
          loadingMessages: { ...state.loadingMessages, [conversationId]: true },
          error: null
        }));
        
        try {
          const { data, error } = await (getSupabaseClient() as any)
            .from('chat_messages')
            .select('id, content, created_at, sender_id, is_edited, attachment_url, attachment_type, read_by_ids, sender:sender_id(id, full_name, avatar_url)')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
            
          if (error) throw error;
          
          const existingMessages = get().messages[conversationId] || [];
          const newMessages = data || [];
          
          const existingMap = new Map(existingMessages.map(msg => [msg.id, msg]));
          const mergedMessages = [...existingMessages];
          
          newMessages.forEach((newMsg: any) => {
            if (!existingMap.has(newMsg.id)) {
              mergedMessages.push(newMsg);
            } else {
              const existingIndex = mergedMessages.findIndex(msg => msg.id === newMsg.id);
              if (existingIndex >= 0 && mergedMessages[existingIndex]._isOptimistic) {
                mergedMessages[existingIndex] = { ...newMsg, _isOptimistic: false };
              }
            }
          });
          
          mergedMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          set(state => ({
            messages: {
              ...state.messages,
              [conversationId]: mergedMessages
            },
            loadingMessages: { ...state.loadingMessages, [conversationId]: false },
            lastMessageUpdate: Date.now()
          }));
          
        } catch (error) {
          console.error('[ChatStore] Error fetching messages:', error);
          set(state => ({
            loadingMessages: { ...state.loadingMessages, [conversationId]: false },
            error: error instanceof Error ? error.message : 'Failed to fetch messages'
          }));
        }
      },
      
      // Send a message with optimistic updates and retry logic
      sendMessage: async (conversationId: string, content: string, attachmentUrl?: string, attachmentType?: string) => {
        const user = await getCurrentUser();
        if (!user || !conversationId || !content.trim()) return;
        
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const optimisticMessage: Message = {
          id: tempId,
          content: content.trim(),
          created_at: new Date().toISOString(),
          sender_id: user.id,
          is_edited: false,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          read_by_ids: [],
          sender: {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email || 'You',
            avatar_url: user.user_metadata?.avatar_url,
          },
          _isOptimistic: true
        };
        
        set(state => ({
          messages: {
            ...state.messages,
            [conversationId]: [
              ...(state.messages[conversationId] || []),
              optimisticMessage
            ]
          },
          lastMessageUpdate: Date.now()
        }));
        
        try {
          const { data, error } = await (getSupabaseClient() as any)
            .from('chat_messages')
            .insert({
              conversation_id: conversationId,
              sender_id: user.id,
              content: content.trim(),
              attachment_url: attachmentUrl,
              attachment_type: attachmentType,
            })
            .select('id, content, created_at, sender_id, is_edited, attachment_url, attachment_type, read_by_ids')
            .single();
            
          if (error) throw error;
          
          const realMessage: Message = {
            ...data,
            sender: {
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email || 'You',
              avatar_url: user.user_metadata?.avatar_url,
            }
          };
          
          set(state => ({
            messages: {
              ...state.messages,
              [conversationId]: (state.messages[conversationId] || []).map(msg =>
                msg.id === tempId ? realMessage : msg
              )
            },
            lastMessageUpdate: Date.now()
          }));
          
        } catch (error) {
          console.error('[ChatStore] Error sending message:', error);
          
          set(state => ({
            messages: {
              ...state.messages,
              [conversationId]: (state.messages[conversationId] || []).map(msg =>
                msg.id === tempId ? { ...msg, _failed: true } : msg
              )
            },
            retryQueue: [
              ...state.retryQueue,
              {
                tempId,
                conversationId,
                content: content.trim(),
                attachmentUrl,
                attachmentType,
                attempts: 1
              }
            ]
          }));
          
          setTimeout(() => {
            get().retryFailedMessages();
          }, 2000);
        }
      },

      // Retry failed messages
      retryFailedMessages: async () => {
        const { retryQueue } = get();
        if (retryQueue.length === 0) return;

        console.log('[ChatStore] Retrying failed messages:', retryQueue.length);

        for (const queueItem of retryQueue) {
          if (queueItem.attempts >= 3) {
            console.log('[ChatStore] Max retries reached for message:', queueItem.tempId);
            continue;
          }

          try {
            const user = await getCurrentUser();
            if (!user) continue;

            const { data, error } = await (getSupabaseClient() as any)
              .from('chat_messages')
              .insert({
                conversation_id: queueItem.conversationId,
                sender_id: user.id,
                content: queueItem.content,
                attachment_url: queueItem.attachmentUrl,
                attachment_type: queueItem.attachmentType,
              })
              .select('id, content, created_at, sender_id, is_edited, attachment_url, attachment_type, read_by_ids')
              .single();

            if (error) throw error;

            const realMessage: Message = {
              ...data,
              sender: {
                id: user.id,
                full_name: user.user_metadata?.full_name || user.email || 'You',
                avatar_url: user.user_metadata?.avatar_url,
              }
            };

            set(state => ({
              messages: {
                ...state.messages,
                [queueItem.conversationId]: (state.messages[queueItem.conversationId] || []).map(msg =>
                  msg.id === queueItem.tempId ? realMessage : msg
                )
              },
              retryQueue: state.retryQueue.filter(item => item.tempId !== queueItem.tempId),
              lastMessageUpdate: Date.now()
            }));

          } catch (error) {
            console.error('[ChatStore] Retry failed for message:', queueItem.tempId, error);
            
            set(state => ({
              retryQueue: state.retryQueue.map(item =>
                item.tempId === queueItem.tempId
                  ? { ...item, attempts: item.attempts + 1 }
                  : item
              )
            }));
          }
        }
      },
      
      // Mark conversation as read
      markConversationAsRead: async (conversationId: string) => {
        const user = await getCurrentUser();
        if (!user || !conversationId) return;
        
        try {
          const { error } = await (getSupabaseClient() as any)
            .from('chat_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('user_id', user.id);
            
          if (error) throw error;
          
          set(state => ({
            conversations: state.conversations.map(conv =>
              conv.conversation_id === conversationId
                ? { ...conv, unread_count: 0 }
                : conv
            )
          }));
          
        } catch (error) {
          console.error('[ChatStore] Error marking conversation as read:', error);
        }
      },
      
      // Create a new conversation
      createConversation: async (userIds: string[], isGroup: boolean, name?: string) => {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        try {
          // For direct messages between two users, use the existing function
          if (!isGroup && userIds.length === 1) {
            const { data, error } = await (getSupabaseClient() as any).rpc(
              'get_or_create_conversation',
              {
                user1: user.id,
                user2: userIds[0]
              }
            );
            
            if (error) throw error;
            
            console.log('[ChatStore] Created/found direct conversation:', data);
            
            // Fetch updated conversations list
            get().fetchConversations();
            return data;
          }
          
          // For group conversations - this requires the chat_conversations table
          // For now, throw an error since the database doesn't support this yet
          throw new Error('Group conversations are not yet supported');
        } catch (error) {
          console.error('[ChatStore] Error creating conversation:', error);
          throw error;
        }
      },
      
      // Get conversation by ID
      getConversationById: (id: string) => {
        return get().conversations.find(conv => conv.conversation_id === id);
      },
      
      // Set active conversation
      setActiveConversationId: (id: string | null) => {
        set({ activeConversationId: id });
      },
      
      // Get total unread count
      getUnreadCount: () => {
        return get().conversations.reduce((total, conv) => total + conv.unread_count, 0);
      },
      
      // Error handling
      setError: (error: string | null) => {
        set({ error });
      },
      
      clearError: () => {
        set({ error: null });
      },
      
      // Reset store
      reset: () => {
        get().cleanupRealtime();
        set({
          conversations: [],
          loadingConversations: false,
          messages: {},
          loadingMessages: {},
          activeConversationId: null,
          lastMessageUpdate: Date.now(),
          error: null,
          hasInitialized: false,
          isConnected: false,
          connectionError: null,
          retryQueue: []
        });
      },
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        // Only persist essential data, not loading states or subscriptions
        conversations: state.conversations,
        messages: state.messages,
        hasInitialized: state.hasInitialized,
      }),
    }
  )
);

async function getCurrentUser() {
  const { data: { user } } = await getSupabaseClient().auth.getUser();
  return user;
} 