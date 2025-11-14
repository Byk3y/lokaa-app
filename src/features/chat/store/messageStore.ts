import { log } from '@/utils/logger';
/**
 * Message Store
 * 
 * Specialized Zustand store for message management.
 * Extracted from chat-store.ts for better separation of concerns.
 * 
 * Features:
 * - Message CRUD operations
 * - Optimistic updates
 * - Retry mechanism for failed messages
 * - Real-time message integration
 * - Read status management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { chatApiService, type Message } from '../services/ChatApiService';
import { v4 as uuidv4 } from 'uuid';
import { useConversationStore } from './conversationStore';

/**
 * Retry queue item interface
 */
interface RetryQueueItem {
  tempId: string;
  conversationId: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attempts: number;
  lastAttempt: number;
}

/**
 * Message state interface
 */
interface MessageState {
  messages: Record<string, Message[]>; // conversationId -> messages
  loadingMessages: Record<string, boolean>; // conversationId -> loading state
  retryQueue: RetryQueueItem[];
  error: string | null;
  lastUpdate: number;
}

/**
 * Message actions interface
 */
interface MessageActions {
  // Core operations
  fetchMessages: (conversationId: string, options?: { force?: boolean }) => Promise<void>;
  sendMessage: (conversationId: string, content: string, attachmentUrl?: string, attachmentType?: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  
  // Message queries
  getMessages: (conversationId: string) => Message[];
  getLatestMessage: (conversationId: string) => Message | undefined;
  
  // Optimistic updates
  addOptimisticMessage: (conversationId: string, content: string, attachmentUrl?: string, attachmentType?: string) => Promise<string>;
  addOptimisticMessageWithUser: (conversationId: string, user: any, content: string, attachmentUrl?: string, attachmentType?: string) => string;
  confirmOptimisticMessage: (tempId: string, realMessage: Message) => void;
  markOptimisticMessageFailed: (tempId: string) => void;
  
  // Real-time updates
  addRealTimeMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  
  // Retry mechanism
  addToRetryQueue: (item: RetryQueueItem) => void;
  retryFailedMessages: () => Promise<void>;
  removeFromRetryQueue: (tempId: string) => void;
  
  // State management
  setLoading: (conversationId: string, loading: boolean) => void;
  clearMessages: (conversationId: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
  getLastFetchTime: (conversationId: string) => number;
  isStale: (conversationId: string, staleTime?: number) => boolean;
}

type MessageStore = MessageState & MessageActions;

/**
 * Message store instance
 */
export const useMessageStore = create<MessageStore>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: {},
      loadingMessages: {},
      retryQueue: [],
      error: null,
      lastUpdate: Date.now(),
      lastFetchTimes: {},

      // Fetch messages for a conversation
      fetchMessages: async (conversationId: string, options: { force?: boolean } = {}) => {
        const { loadingMessages } = get();
        // Allow force refresh even if already loading
        if (loadingMessages[conversationId] && !options.force) {
          log.debug('App', '[MessageStore] Already loading messages for conversation:', conversationId);
          return;
        }

        set(state => ({
          loadingMessages: { ...state.loadingMessages, [conversationId]: true },
          error: null
        }));

        try {
          const result = await chatApiService.getMessages(conversationId);
          
          if (result.error) {
            throw result.error;
          }

          set(state => ({
            messages: {
              ...state.messages,
              [conversationId]: result.data || []
            },
            loadingMessages: {
              ...state.loadingMessages,
              [conversationId]: false
            },
            lastFetchTimes: {
              ...state.lastFetchTimes,
              [conversationId]: Date.now()
            },
            lastUpdate: Date.now()
          }));

          log.debug('App', '[MessageStore] Fetched messages for conversation:', conversationId, result.data?.length || 0);
        } catch (error) {
          log.error('App', '[MessageStore] Error fetching messages:', error);
          set(state => ({
            loadingMessages: {
              ...state.loadingMessages,
              [conversationId]: false
            },
            error: error instanceof Error ? error.message : 'Failed to fetch messages'
          }));
        }
      },

      // Send a message with optimistic updates
      sendMessage: async (conversationId: string, content: string, attachmentUrl?: string, attachmentType?: string) => {
        // Get current user first
        const currentUser = await chatApiService.getCurrentUser();
        if (!currentUser) {
          const error = new Error('No authenticated user found');
          log.error('App', '[MessageStore] Failed to send message:', error);
          set({ error: error.message });
          return;
        }

        // Add optimistic message immediately
        const tempId = get().addOptimisticMessageWithUser(conversationId, currentUser, content, attachmentUrl, attachmentType);

        try {
          const result = await chatApiService.sendMessage(conversationId, currentUser.id, content, {
            attachmentUrl,
            attachmentType
          });
          
          if (result.error) {
            throw result.error;
          }

          // Replace optimistic message with real message
          get().confirmOptimisticMessage(tempId, result.data!);
          
          log.debug('App', '[MessageStore] Message sent successfully:', result.data?.id);

          // Update conversation list with the new latest message
          try {
            const conversationStore = useConversationStore.getState();
            const sentMessage = result.data!;

            // Update the conversation with latest message info
            conversationStore.updateConversation(conversationId, {
              last_message: sentMessage.content,
              last_message_at: sentMessage.created_at,
              latest_message_sender: sentMessage.sender_id
            });

            // Reorder conversations to show this one at the top
            conversationStore.reorderConversations();

            log.debug('App', '[MessageStore] ✅ Updated conversation list with new message:', sentMessage.content?.substring(0, 50) + '...');

          } catch (storeError) {
            log.warn('App', '[MessageStore] Failed to update conversation store after sending message:', storeError);
          }
        } catch (error) {
          log.error('App', '[MessageStore] Failed to send message:', error);
          
          // Mark optimistic message as failed
          get().markOptimisticMessageFailed(tempId);
          
          // Add to retry queue
          get().addToRetryQueue({
            tempId,
            conversationId,
            content,
            attachmentUrl,
            attachmentType,
            attempts: 0,
            lastAttempt: Date.now()
          });
          
          set({ error: error instanceof Error ? error.message : 'Failed to send message' });
        }
      },

      // Mark conversation as read
      markAsRead: async (conversationId: string) => {
        try {
          const currentUser = await chatApiService.getCurrentUser();
          if (!currentUser) {
            throw new Error('No authenticated user found');
          }

          const result = await chatApiService.markConversationAsRead(conversationId, currentUser.id);
          
          if (result.error) {
            throw result.error;
          }
          
          log.debug('App', '[MessageStore] Marked conversation as read:', conversationId);

          // Update conversation store to reflect read status
          try {
            const conversationStore = useConversationStore.getState();

            // Update the conversation's unread count to 0
            conversationStore.updateConversationUnreadCount(conversationId, 0);

            log.debug('App', '[MessageStore] ✅ Updated conversation list after marking as read:', conversationId);
          } catch (storeError) {
            log.warn('App', '[MessageStore] Failed to update conversation store:', storeError);
          }
          
        } catch (error) {
          log.error('App', '[MessageStore] Error marking as read:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to mark as read' });
        }
      },

      // Message queries
      getMessages: (conversationId: string) => {
        const { messages } = get();
        return messages[conversationId] || [];
      },

      getLatestMessage: (conversationId: string) => {
        const messages = get().getMessages(conversationId);
        return messages[messages.length - 1];
      },

      // Optimistic updates with user object (preferred)
      addOptimisticMessageWithUser: (conversationId: string, user: any, content: string, attachmentUrl?: string, attachmentType?: string) => {
        const tempId = `temp-${uuidv4()}`;

        const optimisticMessage: Message = {
          id: tempId,
          content,
          created_at: new Date().toISOString(),
          sender_id: user.id,
          is_edited: false,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          read_by_ids: [user.id],
          sender: {
            id: user.id,
            full_name: user.full_name || 'You',
            avatar_url: user.avatar_url
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
          lastUpdate: Date.now()
        }));

        return tempId;
      },

      // Legacy optimistic updates (deprecated - use addOptimisticMessageWithUser)
      addOptimisticMessage: async (conversationId: string, content: string, attachmentUrl?: string, attachmentType?: string) => {
        const tempId = `temp-${uuidv4()}`;
        
        try {
          const currentUser = await chatApiService.getCurrentUser();
          
          if (!currentUser) {
            log.warn('App', '[MessageStore] No current user found for optimistic message');
            return tempId;
          }

          const optimisticMessage: Message = {
            id: tempId,
            content,
            created_at: new Date().toISOString(),
            sender_id: currentUser.id,
            is_edited: false,
            attachment_url: attachmentUrl,
            attachment_type: attachmentType,
            read_by_ids: [currentUser.id],
            sender: {
              id: currentUser.id,
              full_name: currentUser.full_name || 'You',
              avatar_url: currentUser.avatar_url
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
            lastUpdate: Date.now()
          }));

        } catch (error) {
          log.error('App', '[MessageStore] Failed to add optimistic message:', error);
        }

        return tempId;
      },

      confirmOptimisticMessage: (tempId: string, realMessage: Message) => {
        set(state => {
          const newMessages = { ...state.messages };
          
          // Find and replace the optimistic message
          Object.keys(newMessages).forEach(conversationId => {
            const messages = newMessages[conversationId];
            const index = messages.findIndex(msg => msg.id === tempId);
            
            if (index !== -1) {
              newMessages[conversationId] = [
                ...messages.slice(0, index),
                realMessage,
                ...messages.slice(index + 1)
              ];
            }
          });
          
          return {
            messages: newMessages,
            lastUpdate: Date.now()
          };
        });
      },

      markOptimisticMessageFailed: (tempId: string) => {
        set(state => {
          const newMessages = { ...state.messages };
          
          // Mark the optimistic message as failed
          Object.keys(newMessages).forEach(conversationId => {
            const messages = newMessages[conversationId];
            const index = messages.findIndex(msg => msg.id === tempId);
            
            if (index !== -1) {
              newMessages[conversationId] = [
                ...messages.slice(0, index),
                { ...messages[index], _failed: true },
                ...messages.slice(index + 1)
              ];
            }
          });
          
          return {
            messages: newMessages,
            lastUpdate: Date.now()
          };
        });
      },

      // Real-time updates
      addRealTimeMessage: (conversationId: string, message: Message) => {
        set(state => {
          const existingMessages = state.messages[conversationId] || [];
          
          // Check if message already exists (prevent duplicates)
          const exists = existingMessages.some(msg => msg.id === message.id);
          if (exists) {
            return state;
          }
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...existingMessages, message]
            },
            lastUpdate: Date.now()
          };
        });
      },

      updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => {
        set(state => ({
          messages: {
            ...state.messages,
            [conversationId]: (state.messages[conversationId] || []).map(msg =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            )
          },
          lastUpdate: Date.now()
        }));
      },

      // Retry mechanism
      addToRetryQueue: (item: RetryQueueItem) => {
        set(state => ({
          retryQueue: [...state.retryQueue, item]
        }));
      },

      retryFailedMessages: async () => {
        const { retryQueue } = get();
        const maxAttempts = 3;
        const retryDelay = 1000; // 1 second between retries

        for (const item of retryQueue) {
          if (item.attempts >= maxAttempts) {
            log.warn('App', '[MessageStore] Max retry attempts reached for message:', item.tempId);
            get().removeFromRetryQueue(item.tempId);
            continue;
          }

          // Check if enough time has passed since last attempt
          if (Date.now() - item.lastAttempt < retryDelay * Math.pow(2, item.attempts)) {
            continue;
          }

          try {
            log.debug('App', '[MessageStore] Retrying failed message:', item.tempId, `attempt ${item.attempts + 1}`);
            
            // Get current user for retry
            const currentUser = await chatApiService.getCurrentUser();
            if (!currentUser) {
              throw new Error('No authenticated user found for retry');
            }
            
            const result = await chatApiService.sendMessage(
              item.conversationId,
              currentUser.id,
              item.content,
              {
                attachmentUrl: item.attachmentUrl,
                attachmentType: item.attachmentType
              }
            );

            if (result.error) {
              throw result.error;
            }

            // Success - remove from queue and update message
            get().removeFromRetryQueue(item.tempId);
            get().confirmOptimisticMessage(item.tempId, result.data!);
            
            log.debug('App', '[MessageStore] Retry successful for message:', item.tempId);
          } catch (error) {
            log.error('App', '[MessageStore] Retry failed for message:', item.tempId, error);
            
            // Update retry count and last attempt time
            set(state => ({
              retryQueue: state.retryQueue.map(queueItem =>
                queueItem.tempId === item.tempId
                  ? {
                      ...queueItem,
                      attempts: queueItem.attempts + 1,
                      lastAttempt: Date.now()
                    }
                  : queueItem
              )
            }));
          }
        }
      },

      removeFromRetryQueue: (tempId: string) => {
        set(state => ({
          retryQueue: state.retryQueue.filter(item => item.tempId !== tempId)
        }));
      },

      // State management
      setLoading: (conversationId: string, loading: boolean) => {
        set(state => ({
          loadingMessages: {
            ...state.loadingMessages,
            [conversationId]: loading
          }
        }));
      },

      clearMessages: (conversationId: string) => {
        set(state => {
          const newMessages = { ...state.messages };
          delete newMessages[conversationId];
          
          const newLoadingMessages = { ...state.loadingMessages };
          delete newLoadingMessages[conversationId];
          
          return {
            messages: newMessages,
            loadingMessages: newLoadingMessages,
            lastUpdate: Date.now()
          };
        });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          messages: {},
          loadingMessages: {},
          retryQueue: [],
          error: null,
          lastUpdate: Date.now(),
          lastFetchTimes: {}
        });
      },

      // Get last fetch time for a conversation
      getLastFetchTime: (conversationId: string) => {
        const { lastFetchTimes } = get();
        return lastFetchTimes[conversationId] || 0;
      },

      // Check if messages are stale (older than 5 minutes)
      isStale: (conversationId: string, staleTime: number = 5 * 60 * 1000) => {
        const { lastFetchTimes, messages } = get();
        const lastFetch = lastFetchTimes[conversationId] || 0;
        const hasMessages = messages[conversationId] && messages[conversationId].length > 0;
        
        // If no messages, consider it stale
        if (!hasMessages) return true;
        
        // If messages exist but are older than staleTime, consider stale
        return Date.now() - lastFetch > staleTime;
      }
    }),
    {
      name: 'message-store',
      partialize: (state) => ({
        messages: state.messages,
        retryQueue: state.retryQueue,
        lastFetchTimes: state.lastFetchTimes
      })
    }
  )
);

/**
 * Message store singleton for external access
 */
export const messageStore = {
  getState: () => useMessageStore.getState(),
  setState: useMessageStore.setState,
  subscribe: useMessageStore.subscribe
}; 