/**
 * Chat API Service Adapter
 * 
 * Bridges the data format gap between ChatApiService expectations 
 * and the V2 ConversationService implementation
 */

import { migrationAdapter } from '@/utils/indexeddb/migration/MigrationAdapter';
import type { ProcessedUserConversation } from '@/utils/indexeddb/services/ConversationService';

// ChatApiService expected format (matches user_conversations view)
export interface LegacyChatConversation {
  user_id: string;
  conversation_id: string;
  conversation_name?: string | null;
  is_group: boolean;
  created_at: string;
  last_message_at?: string | null;
  latest_message_content?: string | null;
  latest_message_time?: string | null;
  latest_message_sender?: string | null;
  unread_count: number;
  other_participants: Array<{
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
}

/**
 * Data adapter for ChatApiService integration with V2 system
 */
export class ChatApiServiceAdapter {
  /**
   * Get user conversations with proper data format transformation
   */
  async getUserConversations(
    userId: string,
    options: { forceNetwork?: boolean } = {}
  ): Promise<{
    data: LegacyChatConversation[] | null;
    error: Error | null;
    fromCache?: boolean;
    reason?: string;
  }> {
    try {
      // Use migration adapter to get data from V2 system
      const result = await migrationAdapter.getUserConversations(userId, {
        forceNetwork: options.forceNetwork
      });

      if (result.error) {
        console.warn('[ChatApiServiceAdapter] V2 system error:', result.error.message);
        return {
          data: null,
          error: result.error,
          fromCache: result.fromCache,
          reason: result.reason
        };
      }

      // Transform V2 format to ChatApiService expected format
      const transformedData = this.transformUserConversations(result.data || [], userId);

      return {
        data: transformedData,
        error: null,
        fromCache: result.fromCache,
        reason: result.reason
      };

    } catch (error) {
      console.error('[ChatApiServiceAdapter] Adapter error:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        fromCache: false
      };
    }
  }

  /**
   * Transform V2 ProcessedUserConversation format to ChatApiService expected format
   */
  private transformUserConversations(
    v2Conversations: ProcessedUserConversation[], 
    currentUserId: string
  ): LegacyChatConversation[] {
    return v2Conversations.map(conv => this.transformSingleConversation(conv, currentUserId));
  }

  /**
   * Transform a single conversation from V2 format to legacy format
   */
  private transformSingleConversation(
    v2Conv: ProcessedUserConversation, 
    currentUserId: string
  ): LegacyChatConversation {
    // Create participant data from other_participants field
    const participants = this.createParticipantsFromConversation(v2Conv, currentUserId);
    
    // Calculate unread count (use the provided unread_count)
    const unreadCount = v2Conv.unread_count || 0;
    
    const result: LegacyChatConversation = {
      // Use the correct field names from ProcessedUserConversation
      user_id: v2Conv.user_id,
      conversation_id: v2Conv.conversation_id,
      conversation_name: v2Conv.conversation_title, // ProcessedUserConversation.conversation_title → conversation_name
      is_group: v2Conv.is_group,
      created_at: v2Conv.created_at,
      last_message_at: v2Conv.last_message_at,
      latest_message_content: v2Conv.latest_message_content,
      latest_message_time: v2Conv.latest_message_time,
      latest_message_sender: v2Conv.latest_message_sender,
      unread_count: unreadCount,
      other_participants: participants
    };

    return result;
  }

  /**
   * Create participant data from other_participants field
   */
  private createParticipantsFromConversation(
    v2Conv: ProcessedUserConversation, 
    currentUserId: string
  ): Array<{
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  }> {
    // Use the other_participants field directly from the database
    if (v2Conv.other_participants && Array.isArray(v2Conv.other_participants)) {
      return v2Conv.other_participants.map(participant => ({
        user_id: participant.user_id,
        full_name: participant.full_name,
        avatar_url: participant.avatar_url
      }));
    }

    // Log warning only if we expect participants but don't find them
    if (!v2Conv.is_group) {
      console.warn('[ChatApiServiceAdapter] No participants found for direct conversation:', v2Conv.conversation_id);
    }

    return [];
  }

  /**
   * Test method to verify data transformation
   */
  async testTransformation(userId: string) {
    console.log(`[ChatApiServiceAdapter] Testing transformation for user: ${userId}`);
    
    try {
      const result = await this.getUserConversations(userId);
      
      console.log('[ChatApiServiceAdapter] Transformation test results:', {
        success: !result.error,
        dataCount: result.data?.length || 0,
        fromCache: result.fromCache,
        reason: result.reason,
        sampleData: result.data?.[0] || null
      });
      
      return result;
    } catch (error) {
      console.error('[ChatApiServiceAdapter] Transformation test failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const chatApiServiceAdapter = new ChatApiServiceAdapter(); 