/**
 * Chat API Service
 * 
 * Handles all database operations for the chat system.
 * Extracted from chat-store.ts to improve maintainability and testability.
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
import { supabaseIndexedDBBridge } from '@/utils/supabaseIndexedDBBridge';
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
  is_group: boolean;
  name?: string;
  created_by: string;
  created_at: string;
  last_message?: string;
  last_message_at?: string;
  latest_message_sender?: string;
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
      // Use cache-first approach for mobile browser protection
      const shouldUseCacheFirst = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      let data, error;
      
      if (shouldUseCacheFirst && !options.forceNetwork) {
        // Try to get from cache first on mobile
        try {
          const cachedResult = await supabaseIndexedDBBridge.getUserConversations(userId);
          if (cachedResult.data && cachedResult.data.length > 0) {
            console.log('[ChatApiService] 📱 Using cached conversations on mobile');
            data = cachedResult.data;
            error = null;
          } else {
            throw new Error('No cached data available');
          }
        } catch (cacheError) {
          console.log('[ChatApiService] 📱 Cache miss, trying network...', cacheError);
          // Fallback to network call
          const result = await getSupabaseClient()
            .from('user_conversations')
            .select('*')
            .eq('user_id', userId)
            .order('last_message_at', { ascending: false });
          data = result.data;
          error = result.error;
        }
      } else {
        // Desktop or forced network: direct network call
        console.log('[ChatApiService]', shouldUseCacheFirst ? '📱 MOBILE: Forcing network bypass cache' : '🖥️ DESKTOP: Direct network call');
        const result = await getSupabaseClient()
          .from('user_conversations')
          .select('*')
          .eq('user_id', userId)
          .order('last_message_at', { ascending: false });
        data = result.data;
        error = result.error;
      }
        
      if (error) throw error;
      
      const transformedData: Conversation[] = (data || []).map((record: any) => 
        this.transformConversationRecord(record)
      );
      
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
    attachmentUrl?: string,
    attachmentType?: string
  ): Promise<ApiResponse<Message>> {
    try {
      if (!conversationId || !senderId || !content.trim()) {
        throw new Error('Conversation ID, sender ID, and content are required');
      }

      const { data, error } = await getSupabaseClient()
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: content.trim(),
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
        })
        .select(`
          id, 
          content, 
          created_at, 
          sender_id, 
          is_edited, 
          attachment_url, 
          attachment_type,
          read_by_ids
        `)
        .single();
        
      if (error) throw error;
      
      const message: Message = {
        ...data,
        read_by_ids: data.read_by_ids || []
      };
      
      return { data: message, error: null };
      
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
  async markAsRead(conversationId: string, userId: string): Promise<ApiResponse<boolean>> {
    try {
      if (!conversationId || !userId) {
        throw new Error('Conversation ID and user ID are required');
      }

      // Try the RPC function first
      const { error: rpcError } = await getSupabaseClient()
        .rpc('mark_conversation_as_read', {
          p_conversation_id: conversationId,
          p_user_id: userId,
          p_before_timestamp: new Date().toISOString()
        });
        
      if (rpcError) {
        // If RPC function doesn't exist, fall back to direct database update
        console.warn('[ChatApiService] RPC function failed, using direct database update:', rpcError);
        
        const { error: directError } = await getSupabaseClient()
          .from('chat_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);
          
        if (directError) {
          throw directError;
        }
        
        console.log('[ChatApiService] Successfully marked conversation as read via direct update:', conversationId);
      } else {
        console.log('[ChatApiService] Successfully marked conversation as read via RPC:', conversationId);
      }
      
      return { data: true, error: null };
      
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
        // For direct messages, use get_or_create_direct_conversation
        const { data, error } = await getSupabaseClient()
          .rpc('get_or_create_direct_conversation', {
            user1_id: creatorId,
            user2_id: userIds[0]
          });
          
        if (error) throw error;
        return { data, error: null };
      } else {
        // For group conversations, create manually
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
      }
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
      console.error('[ChatApiService] Error parsing other_participants:', err);
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
      latest_message_sender: record.latest_message_sender, // Include sender info
      unread_count: record.unread_count || 0,
      participants: participants,
    };
  }

  /**
   * Get current authenticated user
   * 
   * @returns Current user or null
   */
  async getCurrentUser() {
    try {
      const userResponse = await getProtectedCurrentUser();
      return userResponse?.data?.user || null;
    } catch (error) {
      console.error('[ChatApiService] Error getting current user:', error);
      return null;
    }
  }
}

// Export singleton instance
export const chatApiService = new ChatApiService(); 