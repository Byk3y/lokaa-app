/**
 * Chat API Service
 * 
 * Handles all database operations for the chat system.
 * Uses the new chat tables and user_conversations view.
 * 
 * Features:
 * - User conversation management
 * - Message CRUD operations
 * - Direct conversation creation
 * - Mobile browser protection via IndexedDB bridge
 * - Mobile URL slug integration
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { getProtectedCurrentUser } from '@/utils/protectedAuth';
import { migrationAdapter } from '@/utils/indexeddb/migration/MigrationAdapter';
import { generateConversationSlug, findConversationIdFromSlug } from '@/utils/conversationUrlUtils';

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
  name?: string | null;
  is_group: boolean;
  created_at: string;
  last_message_at?: string | null;
  last_message?: string | null;
  latest_message_content?: string | null;
  latest_message_time?: string | null;
  latest_message_sender?: string | null;
  unread_count: number;
  participants?: Array<{
    user_id: string;
    user?: {
      full_name: string | null;
      avatar_url: string | null;
    };
    full_name?: string | null;
    avatar_url?: string | null;
  }>;
  other_participants?: Array<{
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
}

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Chat API Service class
 */
export class ChatApiService {
  /**
   * Get user conversations with mobile browser protection
   * 
   * @param userId User ID to fetch conversations for
   * @param options Optional parameters
   * @returns Promise with conversations data
   */
  async getUserConversations(
    userId: string, 
    options: { forceNetwork?: boolean } = {}
  ): Promise<ApiResponse<Conversation[]>> {
    try {
      console.log('[ChatApiService] 📱 Using migration adapter for user:', userId);
      
      // Use migrationAdapter for mobile browser protection and caching
      const result = await migrationAdapter.getUserConversations(userId, {
        forceNetwork: options.forceNetwork
      });
        
      if (result.error) {
        console.error('[ChatApiService] Migration adapter error:', result.error);
        throw result.error;
      }
      
      console.log('[ChatApiService] Data received from migration adapter:', result.data?.length || 0, 'conversations');
      console.log('[ChatApiService] Source:', result.fromCache ? 'cache' : 'network', result.reason ? `(${result.reason})` : '');
      
      const transformedData: Conversation[] = (result.data || []).map((record: any) => 
        this.transformConversationRecord(record)
      );
      
      console.log('[ChatApiService] Transformed data:', transformedData.length, 'conversations');
      
      return { data: transformedData, error: null };
      
    } catch (error) {
      console.error('[ChatApiService] Error fetching conversations:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Failed to fetch conversations')
      };
    }
  }

  /**
   * Get messages for a specific conversation
   * 
   * @param conversationId Conversation ID to fetch messages for
   * @returns Promise with messages data
   */
  async getMessages(conversationId: string): Promise<ApiResponse<Message[]>> {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }

      const { data, error } = await getSupabaseClient()
        .from('chat_messages')
        .select(`
          id, 
          content, 
          created_at, 
          sender_id, 
          is_edited, 
          attachment_url, 
          attachment_type,
          read_by_ids,
          sender:sender_id(id, full_name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      // Transform to match Message interface
      const transformedMessages: Message[] = (data || []).map((msg: any) => ({
        ...msg,
        read_by_ids: msg.read_by_ids || []
      }));
      
      return { data: transformedMessages, error: null };
      
    } catch (error) {
      console.error('[ChatApiService] Error fetching messages:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Failed to fetch messages')
      };
    }
  }

  /**
   * Send a message to a conversation
   * 
   * @param conversationId Target conversation ID
   * @param senderId ID of the message sender
   * @param content Message content
   * @param attachmentUrl Optional attachment URL
   * @param attachmentType Optional attachment type
   * @returns Promise with created message data
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    options: {
      attachmentUrl?: string;
      attachmentType?: string;
    } = {}
  ): Promise<ApiResponse<Message>> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          attachment_url: options.attachmentUrl,
          attachment_type: options.attachmentType,
          read_by_ids: [senderId]
        })
        .select('*, sender:users(id, full_name, avatar_url)')
        .single();

      if (error) throw error;

      // Update conversation's last_message_at
      await getSupabaseClient()
        .from('chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return { data, error: null };
    } catch (error) {
      console.error('[ChatApiService] Error sending message:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to send message')
      };
    }
  }

  /**
   * Mark a conversation as read for a user
   * 
   * @param conversationId Conversation ID to mark as read
   * @param userId User ID who is marking as read
   * @returns Promise with success status
   */
  async markConversationAsRead(
    conversationId: string,
    userId: string
  ): Promise<ApiResponse<void>> {
    try {
      const { error } = await getSupabaseClient()
        .rpc('mark_conversation_as_read', {
          p_conversation_id: conversationId,
          p_user_id: userId
        });

      if (error) throw error;

      return { data: undefined, error: null };
    } catch (error) {
      console.error('[ChatApiService] Error marking conversation as read:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to mark conversation as read')
      };
    }
  }

  /**
   * Create a new conversation
   * 
   * @param userIds Array of user IDs to include in conversation
   * @param isGroup Whether this is a group conversation
   * @param creatorId ID of the user creating the conversation
   * @param name Optional name for group conversations
   * @returns Promise with created conversation ID
   */
  async createConversation(
    userIds: string[], 
    isGroup: boolean, 
    creatorId: string,
    name?: string
  ): Promise<ApiResponse<string>> {
    try {
      if (!userIds.length || !creatorId) {
        throw new Error('User IDs and creator ID are required');
      }

      if (!isGroup && userIds.length === 1) {
        // For direct messages, use get_or_create_conversation
        const { data, error } = await getSupabaseClient()
          .rpc('get_or_create_conversation', {
            user1: creatorId,
            user2: userIds[0]
          });
          
        if (error) throw error;
        return { data, error: null };
      }

      // For group conversations
      const { data, error } = await getSupabaseClient()
        .from('chat_conversations')
        .insert({
          is_group: isGroup,
          name: name,
          created_by: creatorId
        })
        .select('id')
        .single();
        
      if (error) throw error;
      
      const conversationId = data.id;
      
      // Add all participants including the creator
      const participants = [creatorId, ...userIds].map(userId => ({
        conversation_id: conversationId,
        user_id: userId,
        joined_at: new Date().toISOString(),
        is_admin: userId === creatorId
      }));
      
      const { error: participantsError } = await getSupabaseClient()
        .from('chat_participants')
        .insert(participants);
        
      if (participantsError) throw participantsError;
      
      return { data: conversationId, error: null };
    } catch (error) {
      console.error('[ChatApiService] Error creating conversation:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Failed to create conversation')
      };
    }
  }

  /**
   * NEW: Get conversation by URL slug (mobile integration)
   * 
   * @param slug Shortened URL slug
   * @param conversations Available conversations to search through
   * @returns Promise with conversation data or null
   */
  async getConversationBySlug(
    slug: string, 
    conversations: Conversation[]
  ): Promise<ApiResponse<Conversation>> {
    try {
      if (!slug) {
        throw new Error('Slug is required');
      }

      // Use conversation URL utilities to find the conversation
      const conversationId = findConversationIdFromSlug(slug, conversations);
      
      if (!conversationId) {
        return { data: null, error: new Error('Conversation not found for slug') };
      }

      const conversation = conversations.find(conv => conv.conversation_id === conversationId);
      
      if (!conversation) {
        return { data: null, error: new Error('Conversation not found in provided list') };
      }

      return { data: conversation, error: null };
      
    } catch (error) {
      console.error('[ChatApiService] Error finding conversation by slug:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Failed to find conversation by slug')
      };
    }
  }

  /**
   * Transform raw conversation record from database to Conversation interface
   * 
   * @param record Raw database record
   * @returns Transformed conversation object
   */
  private transformConversationRecord(record: any): Conversation {
    // Handle participants with proper error handling
    let participants = [];
    try {
      // The new view structure puts other participants in 'other_participants' field
      if (record.other_participants) {
        participants = Array.isArray(record.other_participants) ? record.other_participants : [record.other_participants];
      } else if (record.participants) {
        // Fallback to 'participants' field for compatibility
        participants = Array.isArray(record.participants) ? record.participants : [record.participants];
      }
    } catch (err) {
      console.error('[ChatApiService] Error parsing participants:', err);
      participants = [];
    }

    return {
      conversation_id: record.conversation_id || record.id,
      name: record.conversation_name || record.name || null,
      is_group: record.is_group || false,
      created_at: record.created_at || new Date().toISOString(),
      last_message_at: record.last_message_at || null,
      last_message: record.latest_message_content || null,
      latest_message_content: record.latest_message_content || null,
      latest_message_time: record.latest_message_time || record.last_message_at || null,
      latest_message_sender: record.latest_message_sender || null,
      unread_count: record.unread_count || 0,
      other_participants: participants,
      participants: participants.map(p => ({
        user_id: p.user_id,
        user: {
          full_name: p.full_name || null,
          avatar_url: p.avatar_url || null
        }
      }))
    };
  }

  /**
   * Get current authenticated user
   * 
   * @returns Current user or null
   */
  async getCurrentUser() {
    try {
      // Use migrationAdapter for mobile browser protection and caching
      const userResponse = await migrationAdapter.getCurrentUser();
      
      if (userResponse.error) {
        console.error('[ChatApiService] Migration adapter error for current user:', userResponse.error);
        // Fallback to protected auth if migration adapter fails
        const fallbackResponse = await getProtectedCurrentUser();
        return fallbackResponse?.data?.user || null;
      }
      
      return userResponse?.data?.user || null;
    } catch (error) {
      console.error('[ChatApiService] Error getting current user:', error);
      return null;
    }
  }
}

// Export singleton instance
export const chatApiService = new ChatApiService(); 