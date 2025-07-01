import type { Conversation as StoreConversation } from './store';
// 🎯 PHASE 3 FIX: Import global console flags
import { globalConsoleFlags } from '@/utils/developmentLogger';

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

export interface LegacyConversation {
  conversation_id: string;
  conversation_name: string | null;
  is_group: boolean;
  created_at: string;
  last_message_at: string | null;
  latest_message_content: string | null;
  latest_message_time: string | null;
  latest_message_sender: string | null;
  unread_count: number;
  other_participants: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    profile_url: string | null;
    last_seen_at?: string | null;
    is_online?: boolean;
  }[];
}

export function transformConversationToLegacy(conversation: Conversation, currentUserId?: string): LegacyConversation {
  // Extract participants with proper error handling
  let otherParticipants: any[] = [];
  
  try {
    // Prioritize other_participants from the view
    if (conversation.other_participants && Array.isArray(conversation.other_participants)) {
      otherParticipants = conversation.other_participants.map(p => ({
        user_id: p.user_id,
        full_name: p.full_name || 'Unknown User',
        avatar_url: p.avatar_url || null,
        profile_url: null,
        last_seen_at: null,
        is_online: false
      }));
    } else if (conversation.participants && Array.isArray(conversation.participants)) {
      // Fallback to participants field and filter current user
      otherParticipants = conversation.participants
        .filter(p => {
          if (!p || !p.user_id) return false;
          return !currentUserId || p.user_id !== currentUserId;
        })
        .map(p => ({
          user_id: p.user_id,
          full_name: p.user?.full_name || p.full_name || 'Unknown User',
          avatar_url: p.user?.avatar_url || p.avatar_url || null,
          profile_url: null,
          last_seen_at: null,
          is_online: false
        }));
    }
  } catch (error) {
    console.error('Error transforming conversation participants:', error);
  }

  // Handle direct conversations with no participants
  if (!conversation.is_group && otherParticipants.length === 0) {
    console.warn('⚠️ [ConversationTransform] Direct conversation has no participants:', conversation.conversation_id);
    
    // Try to create a fallback participant from conversation name
    if (conversation.name) {
      otherParticipants = [{
        user_id: 'unknown',
        full_name: conversation.name,
        avatar_url: null,
        profile_url: null,
        last_seen_at: null,
        is_online: false
      }];
    } else {
      // Last resort fallback
      otherParticipants = [{
        user_id: 'unknown',
        full_name: 'Unknown User',
        avatar_url: null,
        profile_url: null,
        last_seen_at: null,
        is_online: false
      }];
    }
  }

  return {
    conversation_id: conversation.conversation_id,
    conversation_name: conversation.name || null,
    is_group: conversation.is_group,
    created_at: conversation.created_at,
    last_message_at: conversation.last_message_at || null,
    latest_message_content: conversation.last_message || conversation.latest_message_content || null,
    latest_message_time: conversation.last_message_at || conversation.latest_message_time || null,
    latest_message_sender: conversation.latest_message_sender || null,
    unread_count: conversation.unread_count || 0,
    other_participants: otherParticipants
  };
} 