import { log } from '@/utils/logger';
/**
 * Chat Realtime Service
 * 
 * Handles all real-time subscription logic for the chat system.
 * Extracted from chat-store.ts to improve maintainability and separation of concerns.
 * 
 * Features:
 * - Real-time message subscriptions
 * - Conversation change notifications
 * - Connection state management
 * - Subscription cleanup
 * - Enhanced unread count logic for messages from other users
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { getProtectedCurrentUser } from '@/utils/protectedAuth';
import type { Message } from './ChatApiService';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];
type ChatConversationRow = Database['public']['Tables']['chat_conversations']['Row'];

/**
 * Real-time event types
 */
export type RealtimeEventType =
  | 'conversation_change'
  | 'new_message'
  | 'message_update'
  | 'connection_change';

// Custom event this service emits when the current user sends a message.
// Distinguished from a postgres change by its `type` discriminator so
// downstream listeners can tell the two apart without checking shape.
export interface OwnMessageSentPayload {
  type: 'own_message_sent';
  conversationId: string;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSender: string;
}

/**
 * Event payload interfaces
 */
export interface ConversationChangeEvent {
  type: 'conversation_change';
  // Either a raw postgres_changes payload on chat_conversations or the
  // service's own synthetic "I just sent a message" event.
  payload: RealtimePostgresChangesPayload<ChatConversationRow> | OwnMessageSentPayload;
}

export interface NewMessageEvent {
  type: 'new_message';
  payload: Message;
  conversationId: string;
  isFromOtherUser: boolean;
}

export interface MessageUpdateEvent {
  type: 'message_update';
  payload: RealtimePostgresChangesPayload<ChatMessageRow>;
}

export interface ConnectionChangeEvent {
  type: 'connection_change';
  payload: {
    isConnected: boolean;
    error?: string;
  };
}

export type RealtimeEvent =
  | ConversationChangeEvent
  | NewMessageEvent
  | MessageUpdateEvent
  | ConnectionChangeEvent;

/**
 * Event listener callback
 */
export type RealtimeEventListener = (event: RealtimeEvent) => void;

/**
 * Global subscription manager to prevent multiple connections
 */
interface SubscriptionManager {
  global?: RealtimeChannel;
  conversations: Record<string, RealtimeChannel>;
  validationTimer?: NodeJS.Timeout;
}

/**
 * Chat Realtime Service class
 */
export class ChatRealtimeService {
  private subscriptions: SubscriptionManager = { conversations: {} };
  private listeners: Set<RealtimeEventListener> = new Set();
  private isConnected = false;
  private connectionError: string | null = null;

  /**
   * Initialize real-time subscriptions
   */
  initializeRealtime(): void {
    log.debug('Service', '[ChatRealtimeService] Initializing real-time subscriptions');

    // Clean up existing subscriptions first
    this.cleanupGlobalSubscription();

    // Set up global conversation changes subscription
    const globalChannel = getSupabaseClient()
      .channel('global-chat-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_conversations'
      }, (payload) => {
        log.debug('Service', '[ChatRealtimeService] Conversation change detected:', payload);
        this.emitEvent({
          type: 'conversation_change',
          payload
        });
      })
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            await this.handleNewMessage(payload);
          } else {
            log.debug('Service', '[ChatRealtimeService] Message change detected:', payload.eventType, payload);
            this.emitEvent({
              type: 'message_update',
              payload
            });
          }
        })
      .subscribe((status) => {
        log.debug('Service', '[ChatRealtimeService] Global subscription status:', status);
        const isConnected = status === 'SUBSCRIBED';
        const error = status === 'CHANNEL_ERROR' ? 'Connection failed' : null;

        this.isConnected = isConnected;
        this.connectionError = error;

        this.emitEvent({
          type: 'connection_change',
          payload: { isConnected, error: error || undefined }
        });
      });

    this.subscriptions.global = globalChannel;

    // Set up periodic validation timer (every 3 minutes)
    this.setupValidationTimer();

    log.debug('Service', '[ChatRealtimeService] Real-time subscriptions initialized');
  }

  /**
   * Handle new message from real-time subscription
   */
  private async handleNewMessage(
    payload: RealtimePostgresChangesPayload<ChatMessageRow>
  ): Promise<void> {
    try {
      log.debug('Service', '[ChatRealtimeService] New message detected:', payload);
      // `payload.new` is the row on INSERT; on DELETE it's an empty object.
      // This handler is only wired to INSERT events, but narrow defensively
      // so a future caller can't silently slip a DELETE through.
      const newMessage = payload.new as ChatMessageRow | null;

      if (!newMessage?.sender_id || !newMessage?.conversation_id) {
        log.warn('Service', '[ChatRealtimeService] Invalid message payload, skipping');
        return;
      }

      // Get current user for unread count logic
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        log.warn('Service', '[ChatRealtimeService] No current user, skipping message processing');
        return;
      }

      // Check if message is from another user
      const isFromOtherUser = newMessage.sender_id !== currentUser.id;

      log.debug('Service', '[ChatRealtimeService] Message sender analysis:', {
        conversationId: newMessage.conversation_id,
        senderId: newMessage.sender_id,
        currentUserId: currentUser.id,
        isFromOtherUser,
        messageContent: newMessage.content
      });

      // CRITICAL FIX: Handle user's own messages differently
      // Their own messages are already handled optimistically by the message store
      // But we still need to update conversation metadata for proper ordering
      if (!isFromOtherUser) {
        log.debug('Service', '[ChatRealtimeService] Processing own message for conversation metadata update only');

        // Emit a conversation change event to update conversation metadata for ordering
        this.emitEvent({
          type: 'conversation_change',
          payload: {
            type: 'own_message_sent',
            conversationId: newMessage.conversation_id,
            lastMessage: newMessage.content,
            lastMessageAt: newMessage.created_at,
            lastMessageSender: newMessage.sender_id  // CRITICAL FIX: Include sender ID
          }
        });

        return;
      }

      // Only process messages from OTHER users for real-time updates
      log.debug('Service', '[ChatRealtimeService] Processing message from other user for real-time updates');

      // Fetch the sender information for the new message
      try {
        const { data: senderData, error } = await getSupabaseClient()
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

        log.debug('Service', '[ChatRealtimeService] Emitting real-time event for message from other user:', {
          conversationId: newMessage.conversation_id,
          senderId: newMessage.sender_id,
          content: newMessage.content
        });

        // Emit new message event with all necessary data
        this.emitEvent({
          type: 'new_message',
          payload: messageWithSender,
          conversationId: newMessage.conversation_id,
          isFromOtherUser: true // Always true since we filtered out own messages
        });

      } catch (error: any) {
        log.error('Service', '[ChatRealtimeService] Error fetching sender for real-time message:', error);

        // Still emit the event even if sender fetch fails
        const messageWithoutSender: Message = {
          id: newMessage.id,
          content: newMessage.content,
          created_at: newMessage.created_at,
          sender_id: newMessage.sender_id,
          is_edited: newMessage.is_edited || false,
          attachment_url: newMessage.attachment_url,
          attachment_type: newMessage.attachment_type,
          read_by_ids: newMessage.read_by_ids || []
        };

        this.emitEvent({
          type: 'new_message',
          payload: messageWithoutSender,
          conversationId: newMessage.conversation_id,
          isFromOtherUser: true // Always true since we filtered out own messages
        });
      }
    } catch (error: any) {
      log.error('Service', '[ChatRealtimeService] Error handling new message:', error);
    }
  }

  /**
   * Set up periodic validation timer
   */
  private setupValidationTimer(): void {
    if (this.subscriptions.validationTimer) {
      clearInterval(this.subscriptions.validationTimer);
    }

    this.subscriptions.validationTimer = setInterval(() => {
      log.debug('Service', '[ChatRealtimeService] Triggering periodic unread count validation...');
      this.emitEvent({
        type: 'conversation_change',
        payload: { type: 'validation_trigger' }
      });
    }, 180000); // 3 minutes

    log.debug('Service', '[ChatRealtimeService] Periodic validation timer started (3 minute intervals)');
  }

  /**
   * Clean up real-time subscriptions
   */
  cleanupRealtime(): void {
    log.debug('Service', '[ChatRealtimeService] Cleaning up real-time subscriptions');

    this.cleanupGlobalSubscription();
    this.cleanupConversationSubscriptions();
    this.cleanupValidationTimer();

    this.isConnected = false;
    this.connectionError = null;

    this.emitEvent({
      type: 'connection_change',
      payload: { isConnected: false }
    });
  }

  /**
   * Clean up global subscription
   */
  private cleanupGlobalSubscription(): void {
    if (this.subscriptions.global) {
      getSupabaseClient().removeChannel(this.subscriptions.global);
      this.subscriptions.global = undefined;
    }
  }

  /**
   * Clean up conversation-specific subscriptions
   */
  private cleanupConversationSubscriptions(): void {
    Object.values(this.subscriptions.conversations).forEach(channel => {
      getSupabaseClient().removeChannel(channel);
    });
    this.subscriptions.conversations = {};
  }

  /**
   * Clean up validation timer
   */
  private cleanupValidationTimer(): void {
    if (this.subscriptions.validationTimer) {
      clearInterval(this.subscriptions.validationTimer);
      this.subscriptions.validationTimer = undefined;
      log.debug('Service', '[ChatRealtimeService] Periodic validation timer cleaned up');
    }
  }

  /**
   * Subscribe to conversation-specific real-time events
   */
  subscribeToConversation(conversationId: string): void {
    if (this.subscriptions.conversations[conversationId]) {
      log.debug('Service', '[ChatRealtimeService] Already subscribed to conversation:', conversationId);
      return;
    }

    log.debug('Service', '[ChatRealtimeService] Subscribing to conversation:', conversationId);

    const channel = getSupabaseClient()
      .channel(`conversation-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        log.debug('Service', '[ChatRealtimeService] Conversation message change:', payload);
        this.emitEvent({
          type: 'message_update',
          payload
        });
      })
      .subscribe((status) => {
        log.debug('Service', `[ChatRealtimeService] Conversation ${conversationId} subscription status:`, status);
      });

    this.subscriptions.conversations[conversationId] = channel;
  }

  /**
   * Unsubscribe from conversation-specific real-time events
   */
  unsubscribeFromConversation(conversationId: string): void {
    const channel = this.subscriptions.conversations[conversationId];
    if (channel) {
      log.debug('Service', '[ChatRealtimeService] Unsubscribing from conversation:', conversationId);
      getSupabaseClient().removeChannel(channel);
      delete this.subscriptions.conversations[conversationId];
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: RealtimeEventListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: RealtimeEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: RealtimeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        log.error('Service', '[ChatRealtimeService] Error in event listener:', error);
      }
    });
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { isConnected: boolean; error: string | null } {
    return {
      isConnected: this.isConnected,
      error: this.connectionError
    };
  }

  /**
   * Get current authenticated user
   */
  private async getCurrentUser() {
    try {
      const userResponse = await getProtectedCurrentUser();
      return userResponse?.data?.user || null;
    } catch (error) {
      log.error('Service', '[ChatRealtimeService] Error getting current user:', error);
      return null;
    }
  }

  /**
   * Force reconnection (useful for recovery scenarios)
   */
  reconnect(): void {
    log.debug('Service', '[ChatRealtimeService] Forcing reconnection...');
    this.cleanupRealtime();

    // Wait a bit before reconnecting
    setTimeout(() => {
      this.initializeRealtime();
    }, 1000);
  }

  /**
   * Get active subscription count (for debugging)
   */
  getActiveSubscriptionCount(): number {
    const globalCount = this.subscriptions.global ? 1 : 0;
    const conversationCount = Object.keys(this.subscriptions.conversations).length;
    return globalCount + conversationCount;
  }
}

// Export singleton instance
export const chatRealtimeService = new ChatRealtimeService();

// Make available globally for testing (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).chatRealtimeService = chatRealtimeService;
} 