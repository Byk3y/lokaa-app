/**
 * Conversation Service
 * 
 * Specialized service for handling chat conversation data with caching
 * Critical service for chat system - handles getUserConversations() integration
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { SupabaseBridgeResult, CacheOptions } from '../types';
import { userConversationsCacheService } from '../core/CacheService';
import { mobileBrowserService } from '../core/MobileBrowserService';

export interface ChatConversation {
  id: string;
  created_at: string;
  updated_at: string;
  type: 'direct' | 'group';
  title?: string;
  description?: string;
  space_id?: string;
  created_by: string;
  is_active: boolean;
  last_message_at?: string;
}

export interface ChatParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  role: 'member' | 'admin';
  is_active: boolean;
  last_read_at?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  created_at: string;
  updated_at?: string;
  is_edited: boolean;
  replied_to_id?: string;
  attachments?: any[];
}

export interface UserConversation {
  conversation_id: string;
  conversation_type: 'direct' | 'group';
  conversation_title?: string;
  conversation_created_at: string;
  conversation_updated_at: string;
  conversation_space_id?: string;
  conversation_created_by: string;
  conversation_is_active: boolean;
  conversation_last_message_at?: string;
  participant_id: string;
  participant_user_id: string;
  participant_joined_at: string;
  participant_role: 'member' | 'admin';
  participant_is_active: boolean;
  participant_last_read_at?: string;
  last_message_id?: string;
  last_message_content?: string;
  last_message_user_id?: string;
  last_message_created_at?: string;
  last_message_type?: string;
}

export interface ConversationOptions {
  spaceId?: string;
  conversationType?: 'direct' | 'group';
  forceNetwork?: boolean;
  limit?: number;
}

/**
 * Conversation Service
 * 
 * Handles all chat conversation operations with mobile-safe caching
 * CRITICAL: This handles the getUserConversations() method used by ChatApiService.ts
 */
export class ConversationService {
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    networkRequests: 0,
    mobileBlocking: 0,
    errors: 0
  };

  /**
   * Get user conversations - CRITICAL METHOD for chat system
   */
  async getUserConversations(
    userId: string,
    options: ConversationOptions = {}
  ): Promise<SupabaseBridgeResult<UserConversation[]>> {
    this.metrics.totalRequests++;
    
    try {
      const networkResult = await this.executeUserConversationsQuery(userId, options);
      this.metrics.networkRequests++;
      
      if (networkResult.error) {
        throw networkResult.error;
      }

      this.metrics.cacheMisses++;
      return {
        data: networkResult.data,
        error: null,
        fromCache: false
      };

    } catch (error) {
      this.metrics.errors++;
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        fromCache: false
      };
    }
  }

  /**
   * Get specific conversation details
   */
  async getConversation(
    conversationId: string,
    options: { includeParticipants?: boolean; forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult<ChatConversation>> {
    this.metrics.totalRequests++;
    
    const { includeParticipants = true, forceNetwork = false } = options;
    const cacheKey = `conversation_${conversationId}_${includeParticipants ? 'with_participants' : 'basic'}`;

    try {
      // Check if we should use cache-first approach
      const shouldUseCacheFirst = mobileBrowserService.shouldUseCacheFirst();
      
      if (!forceNetwork && shouldUseCacheFirst) {
        const cachedData = await userConversationsCacheService.get(cacheKey);
        if (cachedData) {
          this.metrics.cacheHits++;
          return {
            data: cachedData as unknown as ChatConversation,
            error: null,
            fromCache: true,
            reason: 'mobile_blocking'
          };
        }
      }

      // Execute network request
      const networkResult = await this.executeConversationQuery(conversationId, options);
      this.metrics.networkRequests++;
      
      if (networkResult.error) {
        throw networkResult.error;
      }

      // Cache successful response
      if (networkResult.data) {
        const cacheOptions: CacheOptions = {
          metadata: {
            query: 'conversation',
            params: { conversationId, includeParticipants }
          }
        };
        
        await userConversationsCacheService.set(cacheKey, networkResult.data, cacheOptions);
      }

      this.metrics.cacheMisses++;
      return {
        data: networkResult.data,
        error: null,
        fromCache: false
      };

    } catch (error) {
      this.metrics.errors++;
      
      // Mobile blocking fallback
      if (mobileBrowserService.isMobileBrowserBlocking(error)) {
        this.metrics.mobileBlocking++;
        const cachedData = await userConversationsCacheService.get(cacheKey, { skipCache: true });
        if (cachedData) {
          return {
            data: cachedData as unknown as ChatConversation,
            error: null,
            fromCache: true,
            reason: 'mobile_browser_blocking'
          };
        }
      }

      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        fromCache: false
      };
    }
  }

  /**
   * Get conversation participants
   */
  async getConversationParticipants(
    conversationId: string,
    options: { includeUserProfiles?: boolean; forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult<ChatParticipant[]>> {
    this.metrics.totalRequests++;
    
    const { includeUserProfiles = false, forceNetwork = false } = options;
    const cacheKey = `conversation_participants_${conversationId}_${includeUserProfiles ? 'with_profiles' : 'basic'}`;

    try {
      // Mobile-safe cache check
      if (!forceNetwork && mobileBrowserService.shouldUseCacheFirst()) {
        const cachedData = await userConversationsCacheService.get(cacheKey);
        if (cachedData) {
          this.metrics.cacheHits++;
          return {
            data: cachedData as unknown as ChatParticipant[],
            error: null,
            fromCache: true,
            reason: 'mobile_blocking'
          };
        }
      }

      // Execute network request
      const networkResult = await this.executeParticipantsQuery(conversationId, options);
      this.metrics.networkRequests++;
      
      if (networkResult.error) {
        throw networkResult.error;
      }

      // Cache successful response
      if (networkResult.data) {
        const cacheOptions: CacheOptions = {
          metadata: {
            query: 'conversation_participants',
            params: { conversationId, includeUserProfiles }
          }
        };
        
        await userConversationsCacheService.set(cacheKey, networkResult.data, cacheOptions);
      }

      this.metrics.cacheMisses++;
      return {
        data: networkResult.data,
        error: null,
        fromCache: false
      };

    } catch (error) {
      this.metrics.errors++;
      
      // Mobile blocking fallback
      if (mobileBrowserService.isMobileBrowserBlocking(error)) {
        this.metrics.mobileBlocking++;
        const cachedData = await userConversationsCacheService.get(cacheKey, { skipCache: true });
        if (cachedData) {
          return {
            data: cachedData as unknown as ChatParticipant[],
            error: null,
            fromCache: true,
            reason: 'mobile_browser_blocking'
          };
        }
      }

      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        fromCache: false
      };
    }
  }

  /**
   * Invalidate cache for a specific user's conversations
   */
  async invalidateUserConversationsCache(userId: string): Promise<void> {
    try {
      // Get all cache entries for this user and remove them
      const entries = await userConversationsCacheService.getByMetadata('userId', userId);
      
      for (const entry of entries) {
        await userConversationsCacheService.invalidate(entry.key);
      }

      console.log(`[ConversationService] Invalidated conversation cache for user: ${userId}`);
    } catch (error) {
      console.error('[ConversationService] Error invalidating conversation cache:', error);
    }
  }

  /**
   * Invalidate cache for a specific conversation
   */
  async invalidateConversationCache(conversationId: string): Promise<void> {
    try {
      // Clear all cache entries related to this conversation
      const conversationKeys = [
        `conversation_${conversationId}_with_participants`,
        `conversation_${conversationId}_basic`,
        `conversation_participants_${conversationId}_with_profiles`,
        `conversation_participants_${conversationId}_basic`
      ];

      for (const key of conversationKeys) {
        await userConversationsCacheService.invalidate(key);
      }

      // Also clear user conversation caches that might include this conversation
      const allEntries = await userConversationsCacheService.getAll();
      for (const entry of allEntries) {
        if (entry.key.startsWith('user_conversations_') && entry.data) {
          const conversations = Array.isArray(entry.data) ? entry.data : [];
          const hasConversation = conversations.some((conv: any) => 
            conv.conversation?.id === conversationId
          );
          
          if (hasConversation) {
            await userConversationsCacheService.invalidate(entry.key);
          }
        }
      }

      console.log(`[ConversationService] Invalidated cache for conversation: ${conversationId}`);
    } catch (error) {
      console.error('[ConversationService] Error invalidating conversation cache:', error);
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      averageAge: 0,
      oldestEntry: 0,
      newestEntry: 0
    };
  }

  /**
   * Clear all cached conversation data
   */
  async clearCache(): Promise<void> {
    await userConversationsCacheService.clear();
    console.log('[ConversationService] Cleared all conversation cache');
  }

  // Private helper methods

  /**
   * Execute the actual Supabase user conversations query
   */
  private async executeUserConversationsQuery(
    userId: string,
    options: ConversationOptions
  ): Promise<{ data: UserConversation[] | null; error: any }> {
    try {
      const { spaceId, conversationType, limit = 50 } = options;

      // Use the user_conversations view for efficient querying
      let query = getSupabaseClient()
        .from('user_conversations')
        .select(`*`)
        .eq('participant_user_id', userId)
        .eq('participant_is_active', true)
        .order('conversation_last_message_at', { ascending: false })
        .limit(limit);

      // Add space filter if specified
      if (spaceId) {
        query = query.eq('conversation_space_id', spaceId);
      }

      // Add conversation type filter if specified
      if (conversationType) {
        query = query.eq('conversation_type', conversationType);
      }

      const { data, error } = await query;

      return { data: data as UserConversation[], error };

    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Execute conversation query
   */
  private async executeConversationQuery(
    conversationId: string,
    options: { includeParticipants?: boolean }
  ): Promise<{ data: ChatConversation | null; error: any }> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      return {
        data: data as ChatConversation,
        error
      };

    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Execute participants query
   */
  private async executeParticipantsQuery(
    conversationId: string,
    options: { includeUserProfiles?: boolean }
  ): Promise<{ data: ChatParticipant[] | null; error: any }> {
    try {
      let selectQuery = '*';
      
      if (options.includeUserProfiles) {
        selectQuery = `
          *,
          users!inner(id, full_name, profile_url)
        `;
      }

      const { data, error } = await getSupabaseClient()
        .from('chat_participants')
        .select(selectQuery)
        .eq('conversation_id', conversationId)
        .eq('is_active', true);

      return {
        data: data as ChatParticipant[],
        error
      };

    } catch (error) {
      return { data: null, error };
    }
  }
}

// Export singleton instance
export const conversationService = new ConversationService(); 