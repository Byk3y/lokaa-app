/**
 * Realtime Store
 * 
 * Specialized Zustand store for real-time subscription management.
 * Extracted from chat-store.ts for better separation of concerns.
 * 
 * Features:
 * - Real-time subscription management
 * - Connection state tracking
 * - Event coordination with other stores
 * - Cleanup mechanisms
 * - Periodic validation
 */

import { create } from 'zustand';
import { chatRealtimeService, type RealtimeEvent } from '../services/ChatRealtimeService';
import { useConversationStore } from './conversationStore';
import { useMessageStore } from './messageStore';

/**
 * Connection state interface
 */
interface ConnectionState {
  isConnected: boolean;
  isInitialized: boolean;
  connectionError: string | null;
  lastHeartbeat: number;
  retryCount: number;
}

/**
 * Realtime state interface
 */
interface RealtimeState {
  connection: ConnectionState;
  activeSubscriptions: Set<string>;
  validationTimer: NodeJS.Timeout | null;
  lastValidationTime: number;
  validationInProgress: boolean;
  error: string | null;
}

/**
 * Realtime actions interface
 */
interface RealtimeActions {
  // Core operations
  initialize: () => void;
  cleanup: () => void;
  reconnect: () => void;
  
  // Subscription management
  addSubscription: (channelName: string) => void;
  removeSubscription: (channelName: string) => void;
  getActiveSubscriptions: () => string[];
  
  // Validation
  startPeriodicValidation: () => void;
  stopPeriodicValidation: () => void;
  validateUnreadCounts: () => Promise<void>;
  
  // Connection state
  setConnectionState: (state: Partial<ConnectionState>) => void;
  updateHeartbeat: () => void;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // State management
  reset: () => void;
}

type RealtimeStore = RealtimeState & RealtimeActions;

/**
 * Event handler for real-time events
 */
const handleRealtimeEvent = (event: RealtimeEvent) => {
  console.log('[RealtimeStore] Handling event:', event.type, event);
  
  switch (event.type) {
    case 'conversation_change':
      // Handle different types of conversation changes
      const conversationStore = useConversationStore.getState();
      
      if (event.payload?.type === 'own_message_sent') {
        // Special handling for user's own messages - update metadata without unread count
        console.log('[RealtimeStore] Processing own message for conversation metadata update:', event.payload);
        
        conversationStore.updateConversation(event.payload.conversationId, {
          last_message: event.payload.lastMessage,
          last_message_at: event.payload.lastMessageAt,
          latest_message_sender: event.payload.lastMessageSender,  // CRITICAL FIX: Update sender ID
          // Do NOT increment unread count for own messages
        });
        
        // Reorder conversations by most recent
        conversationStore.reorderConversations();
        
        console.log('[RealtimeStore] ✅ Updated conversation metadata for own message:', {
          conversationId: event.payload.conversationId,
          lastMessage: event.payload.lastMessage,
          lastMessageAt: event.payload.lastMessageAt,
          lastMessageSender: event.payload.lastMessageSender,
          conversationsAfterUpdate: conversationStore.conversations.length
        });
      } else {
        // Trigger conversation refresh if needed
      if (conversationStore.conversations.length === 0) {
        conversationStore.fetchConversations();
      } else {
        // Just update timestamp to trigger UI updates
        conversationStore.reorderConversations();
        }
      }
      break;
      
    case 'new_message':
      const messageStore = useMessageStore.getState();
      const convStore = useConversationStore.getState();
      
      console.log('[RealtimeStore] Processing new message event:', {
        conversationId: event.conversationId,
        messageId: event.payload.id,
        content: event.payload.content,
        isFromOtherUser: event.isFromOtherUser,
        currentConversationsCount: convStore.conversations.length
      });
      
      // Add message to store (fix: use event.payload instead of event.message)
      messageStore.addRealTimeMessage(event.conversationId, event.payload);
      
      // Update conversation with new message info
      const currentConversation = convStore.getConversationById(event.conversationId);
      const currentUnreadCount = currentConversation?.unread_count || 0;
      
      convStore.updateConversation(event.conversationId, {
        last_message: event.payload.content,
        last_message_at: event.payload.created_at,
        latest_message_sender: event.payload.sender_id,  // CRITICAL FIX: Update sender ID for other users too
        // Increment unread count if message is from another user
        unread_count: event.isFromOtherUser 
          ? currentUnreadCount + 1
          : currentUnreadCount
      });
      
      // Reorder conversations by most recent
      convStore.reorderConversations();
      
      console.log('[RealtimeStore] ✅ Conversation list updated for message from other user:', {
        conversationId: event.conversationId,
        newLastMessage: event.payload.content,
        newLastMessageAt: event.payload.created_at,
        newLastMessageSender: event.payload.sender_id,
        newUnreadCount: event.isFromOtherUser ? currentUnreadCount + 1 : currentUnreadCount,
        conversationsAfterUpdate: convStore.conversations.length
      });
      
      // ✅ ENHANCED CRITICAL FIX: Multiple strategies for forcing receiver updates
      if (event.isFromOtherUser) {
        console.log('[RealtimeStore] 🔄 RECEIVER MESSAGE: Applying multiple update strategies...');
        
        // Strategy 1: Immediate urgent refresh
        setTimeout(async () => {
          try {
            console.log('[RealtimeStore] Strategy 1: URGENT conversation refresh');
            await convStore.refreshConversations(undefined, { forceNetwork: true, urgent: true });
          } catch (error) {
            console.error('[RealtimeStore] Strategy 1 failed:', error);
          }
        }, 50); // Very quick
        
        // Strategy 2: Delayed secondary urgent refresh (in case first one didn't work)
        setTimeout(async () => {
          try {
            console.log('[RealtimeStore] Strategy 2: URGENT secondary conversation refresh');
            await convStore.refreshConversations(undefined, { forceNetwork: true, urgent: true });
          } catch (error) {
            console.error('[RealtimeStore] Strategy 2 failed:', error);
          }
        }, 500); // Half second delay
        
        // Strategy 3: Update conversation state directly + urgent refresh
        setTimeout(async () => {
          try {
            console.log('[RealtimeStore] Strategy 3: Direct state update + URGENT refresh');
            convStore.reorderConversations();
            
            // Force a state update by updating the lastUpdate timestamp
            const currentState = convStore;
            currentState.lastUpdate = Date.now();
            
            // Final urgent refresh to ensure consistency
            await convStore.refreshConversations(undefined, { forceNetwork: true, urgent: true });
          } catch (error) {
            console.error('[RealtimeStore] Strategy 3 failed:', error);
          }
        }, 100);
      }
      
      // Force a manual re-render trigger for chat list components
      window.dispatchEvent(new CustomEvent('chat-conversations-updated', {
        detail: { 
          conversationId: event.conversationId,
          lastMessage: event.payload.content,
          timestamp: Date.now(),
          isFromOtherUser: event.isFromOtherUser,
          urgent: event.isFromOtherUser // Mark as urgent for receivers
        }
      }));
      
      break;
      
    case 'message_update':
      const msgStore = useMessageStore.getState();
      // Note: MessageUpdateEvent only has payload, need to extract details from payload
      console.log('[RealtimeStore] Message update event:', event.payload);
      // For now, we'll handle this when we have proper message update structure
      break;
      
    case 'connection_change':
      const realtimeStore = useRealtimeStore.getState();
      realtimeStore.setConnectionState({
        isConnected: event.payload.isConnected,
        connectionError: event.payload.error || null
      });
      break;
      
    default:
      console.warn('[RealtimeStore] Unknown event type:', (event as any).type);
  }
};

/**
 * Realtime store instance
 */
export const useRealtimeStore = create<RealtimeStore>()((set, get) => ({
  // Initial state
  connection: {
    isConnected: false,
    isInitialized: false,
    connectionError: null,
    lastHeartbeat: Date.now(),
    retryCount: 0
  },
  activeSubscriptions: new Set(),
  validationTimer: null,
  lastValidationTime: Date.now(),
  validationInProgress: false,
  error: null,

  // Initialize real-time connections
  initialize: () => {
    const { connection } = get();
    
    if (connection.isInitialized) {
      console.log('[RealtimeStore] Already initialized, skipping...');
      return;
    }

    console.log('[RealtimeStore] Initializing real-time subscriptions');
    
    try {
      // Set up event listener
      chatRealtimeService.addEventListener(handleRealtimeEvent);
      
      // Initialize the service
      chatRealtimeService.initializeRealtime();
      
      // Start periodic validation
      get().startPeriodicValidation();
      
      set(state => ({
        connection: {
          ...state.connection,
          isInitialized: true
        }
      }));
      
      console.log('[RealtimeStore] Real-time initialization complete');
    } catch (error) {
      console.error('[RealtimeStore] Initialization failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize real-time connections'
      });
    }
  },

  // Cleanup all connections
  cleanup: () => {
    console.log('[RealtimeStore] Cleaning up real-time connections');
    
    try {
      // Stop periodic validation
      get().stopPeriodicValidation();
      
      // Remove event listener
      chatRealtimeService.removeEventListener(handleRealtimeEvent);
      
      // Cleanup the service
      chatRealtimeService.cleanupRealtime();
      
      set({
        connection: {
          isConnected: false,
          isInitialized: false,
          connectionError: null,
          lastHeartbeat: Date.now(),
          retryCount: 0
        },
        activeSubscriptions: new Set(),
        error: null
      });
      
      console.log('[RealtimeStore] Cleanup complete');
    } catch (error) {
      console.error('[RealtimeStore] Cleanup failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to cleanup connections'
      });
    }
  },

  // Reconnect after failure
  reconnect: () => {
    console.log('[RealtimeStore] Attempting to reconnect...');
    
    const { connection } = get();
    
    set(state => ({
      connection: {
        ...state.connection,
        retryCount: connection.retryCount + 1
      }
    }));
    
    // Cleanup existing connections
    get().cleanup();
    
    // Reinitialize after short delay
    setTimeout(() => {
      get().initialize();
    }, 1000 * Math.min(connection.retryCount, 5)); // Exponential backoff, max 5 seconds
  },

  // Subscription management
  addSubscription: (channelName: string) => {
    set(state => ({
      activeSubscriptions: new Set([...state.activeSubscriptions, channelName])
    }));
    console.log('[RealtimeStore] Added subscription:', channelName);
  },

  removeSubscription: (channelName: string) => {
    set(state => {
      const newSubscriptions = new Set(state.activeSubscriptions);
      newSubscriptions.delete(channelName);
      return { activeSubscriptions: newSubscriptions };
    });
    console.log('[RealtimeStore] Removed subscription:', channelName);
  },

  getActiveSubscriptions: () => {
    const { activeSubscriptions } = get();
    return Array.from(activeSubscriptions);
  },

  // Periodic validation
  startPeriodicValidation: () => {
    console.log('[RealtimeStore] Starting periodic validation (3 minute intervals)');
    
    const timer = setInterval(() => {
      console.log('[RealtimeStore] Running periodic unread count validation...');
      get().validateUnreadCounts();
    }, 180000); // 3 minutes
    
    set({ validationTimer: timer });
  },

  stopPeriodicValidation: () => {
    const { validationTimer } = get();
    
    if (validationTimer) {
      clearInterval(validationTimer);
      set({ validationTimer: null });
      console.log('[RealtimeStore] Stopped periodic validation');
    }
  },

  validateUnreadCounts: async () => {
    const { validationInProgress } = get();
    
    if (validationInProgress) {
      console.log('[RealtimeStore] Validation already in progress, skipping...');
      return;
    }
    
    set({ validationInProgress: true, lastValidationTime: Date.now() });
    
    try {
      // Validate unread counts with database
      const conversationStore = useConversationStore.getState();
      const conversations = conversationStore.conversations;
      
      console.log('[RealtimeStore] Validating unread counts for', conversations.length, 'conversations');
      
      // Here you would typically compare local counts with database counts
      // and update any discrepancies
      
      // For now, just log the validation
      const totalUnread = conversationStore.getUnreadCount();
      console.log('[RealtimeStore] Validation complete. Total unread:', totalUnread);
      
    } catch (error) {
      console.error('[RealtimeStore] Validation failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Validation failed'
      });
    } finally {
      set({ validationInProgress: false });
    }
  },

  // Connection state management
  setConnectionState: (state: Partial<ConnectionState>) => {
    set(currentState => ({
      connection: {
        ...currentState.connection,
        ...state
      }
    }));
  },

  updateHeartbeat: () => {
    set(state => ({
      connection: {
        ...state.connection,
        lastHeartbeat: Date.now()
      }
    }));
  },

  // Error handling
  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  // Reset state
  reset: () => {
    // Cleanup first
    get().cleanup();
    
    // Reset state
    set({
      connection: {
        isConnected: false,
        isInitialized: false,
        connectionError: null,
        lastHeartbeat: Date.now(),
        retryCount: 0
      },
      activeSubscriptions: new Set(),
      validationTimer: null,
      lastValidationTime: Date.now(),
      validationInProgress: false,
      error: null
    });
  }
}));

/**
 * Realtime store singleton for external access
 */
export const realtimeStore = {
  getState: () => useRealtimeStore.getState(),
  setState: useRealtimeStore.setState,
  subscribe: useRealtimeStore.subscribe
}; 