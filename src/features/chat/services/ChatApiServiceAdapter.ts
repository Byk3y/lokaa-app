/**
 * Chat API Service Adapter
 * 
 * Bridges the data format gap between ChatApiService expectations 
 * and the V2 ConversationService implementation
 */

import { migrationAdapter } from '@/utils/indexeddb/migration/MigrationAdapter';
import type { UserConversation } from '@/utils/indexeddb/services/ConversationService';

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
  other_participants?: Array<{
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
        return {
          data: null,
          error: result.error,
          fromCache: result.fromCache,
          reason: result.reason
        };
      }

      // Transform V2 format to ChatApiService expected format
      const transformedData = this.transformUserConversations(result.data || []);

      return {
        data: transformedData,
        error: null,
        fromCache: result.fromCache,
        reason: result.reason
      };

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        fromCache: false
      };
    }
  }

  /**
   * Transform V2 UserConversation format to ChatApiService expected format
   */
  private transformUserConversations(v2Conversations: UserConversation[]): LegacyChatConversation[] {
    return v2Conversations.map(conv => this.transformSingleConversation(conv));
  }

  /**
   * Transform a single conversation from V2 format to legacy format
   */
  private transformSingleConversation(v2Conv: UserConversation): LegacyChatConversation {
    return {
      // Map V2 fields to ChatApiService expected fields
      user_id: v2Conv.participant_user_id,
      conversation_id: v2Conv.conversation_id,
      conversation_name: v2Conv.conversation_title || null,
      is_group: v2Conv.conversation_type === 'group',
      created_at: v2Conv.conversation_created_at,
      last_message_at: v2Conv.conversation_last_message_at || null,
      latest_message_content: v2Conv.last_message_content || null,
      latest_message_time: v2Conv.last_message_created_at || v2Conv.conversation_last_message_at || null,
      latest_message_sender: v2Conv.last_message_user_id || null,
      unread_count: 0, // TODO: Calculate from message data
      other_participants: [] // TODO: Get from participant data
    };
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