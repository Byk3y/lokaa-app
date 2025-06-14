import type { Conversation } from './store';

export interface LegacyConversation {
  conversation_id: string;
  conversation_name: string | null;
  is_group: boolean;
  created_at: string;
  last_message_at: string | null;
  latest_message_content: string | null;
  latest_message_time: string | null;
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
  const otherParticipants = conversation.participants
    ?.filter(p => p.user_id !== currentUserId)
    .map(p => ({
      user_id: p.user_id,
      full_name: p.user?.full_name || null,
      avatar_url: p.user?.avatar_url || null,
      profile_url: null,
      last_seen_at: null,
      is_online: false
    })) || [];

  return {
    conversation_id: conversation.conversation_id,
    conversation_name: conversation.name || null,
    is_group: conversation.is_group,
    created_at: conversation.created_at,
    last_message_at: conversation.last_message_at || null,
    latest_message_content: conversation.last_message || null,
    latest_message_time: conversation.last_message_at || null,
    unread_count: conversation.unread_count,
    other_participants: otherParticipants
  };
} 