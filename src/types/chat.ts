/**
 * Chat and Messaging Type Definitions
 * 
 * This file contains type definitions for the chat and messaging system
 * to replace 'any' usage in chat components and services.
 */

import { UserProfile } from './common';

/**
 * Message data structure
 */
export interface MessageData {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'voice' | 'video' | 'system';
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  is_read: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  reply_to_id: string | null;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  sender?: UserProfile;
  reply_to?: MessageData;
}

/**
 * Conversation data structure
 */
export interface ConversationData {
  id: string;
  type: 'direct' | 'group' | 'channel';
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  is_archived: boolean;
  is_muted: boolean;
  participant_count: number;
  unread_count: number;
  last_message?: MessageData;
  participants?: ConversationParticipant[];
  settings?: ConversationSettings;
}

/**
 * Conversation participant structure
 */
export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
  is_muted: boolean;
  last_read_at: string | null;
  last_seen_at: string | null;
  nickname: string | null;
  user?: UserProfile;
}

/**
 * Message attachment structure
 */
export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  created_at: string;
}

/**
 * Message reaction structure
 */
export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: UserProfile;
}

/**
 * Conversation settings structure
 */
export interface ConversationSettings {
  id: string;
  conversation_id: string;
  allow_invites: boolean;
  allow_file_sharing: boolean;
  allow_voice_messages: boolean;
  allow_video_messages: boolean;
  message_retention_days: number | null;
  require_approval: boolean;
  max_participants: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Chat store state
 */
export interface ChatStoreState {
  conversations: ConversationData[];
  currentConversation: ConversationData | null;
  messages: Record<string, MessageData[]>;
  participants: Record<string, ConversationParticipant[]>;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  typingUsers: Record<string, string[]>;
  unreadCount: number;
}

/**
 * Message creation payload
 */
export interface CreateMessagePayload {
  conversation_id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'voice' | 'video';
  reply_to_id?: string;
  attachments?: File[];
  mention_user_ids?: string[];
}

/**
 * Conversation creation payload
 */
export interface CreateConversationPayload {
  type: 'direct' | 'group' | 'channel';
  name?: string;
  description?: string;
  participant_ids: string[];
  avatar?: File;
  settings?: Partial<ConversationSettings>;
}

/**
 * Message update payload
 */
export interface UpdateMessagePayload {
  content?: string;
  attachments?: File[];
}

/**
 * Chat filters
 */
export interface ChatFilters {
  type?: 'direct' | 'group' | 'channel';
  archived?: boolean;
  muted?: boolean;
  unread_only?: boolean;
  search?: string;
  participant_id?: string;
}

/**
 * Typing indicator data
 */
export interface TypingIndicatorData {
  conversation_id: string;
  user_id: string;
  user_name: string;
  started_at: string;
}

/**
 * Message search result
 */
export interface MessageSearchResult {
  message: MessageData;
  conversation: ConversationData;
  context_messages: MessageData[];
  highlight_positions: number[];
}

/**
 * Chat notification data
 */
export interface ChatNotificationData {
  id: string;
  type: 'message' | 'mention' | 'reaction' | 'invitation';
  conversation_id: string;
  message_id: string | null;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  conversation?: ConversationData;
  message?: MessageData;
  sender?: UserProfile;
}

/**
 * Chat event types for real-time updates
 */
export interface ChatEventData {
  message_sent: {
    message: MessageData;
    conversation_id: string;
  };
  message_updated: {
    message: MessageData;
    conversation_id: string;
  };
  message_deleted: {
    message_id: string;
    conversation_id: string;
  };
  reaction_added: {
    reaction: MessageReaction;
    message_id: string;
    conversation_id: string;
  };
  reaction_removed: {
    reaction_id: string;
    message_id: string;
    conversation_id: string;
  };
  typing_started: {
    user_id: string;
    conversation_id: string;
  };
  typing_stopped: {
    user_id: string;
    conversation_id: string;
  };
  participant_joined: {
    participant: ConversationParticipant;
    conversation_id: string;
  };
  participant_left: {
    participant_id: string;
    conversation_id: string;
  };
  conversation_updated: {
    conversation: ConversationData;
  };
  conversation_archived: {
    conversation_id: string;
  };
  conversation_unarchived: {
    conversation_id: string;
  };
}

/**
 * Chat analytics data
 */
export interface ChatAnalytics {
  total_conversations: number;
  total_messages: number;
  active_users: number;
  message_frequency: {
    hour: number;
    count: number;
  }[];
  popular_conversations: ConversationData[];
  user_activity: {
    user_id: string;
    user_name: string;
    message_count: number;
    last_active: string;
  }[];
}

/**
 * Voice message data
 */
export interface VoiceMessageData {
  id: string;
  message_id: string;
  duration: number;
  file_url: string;
  waveform_data: number[];
  transcript: string | null;
  created_at: string;
}

/**
 * Chat preferences
 */
export interface ChatPreferences {
  id: string;
  user_id: string;
  sound_enabled: boolean;
  desktop_notifications: boolean;
  mobile_notifications: boolean;
  message_preview: boolean;
  online_status_visible: boolean;
  read_receipts_enabled: boolean;
  typing_indicators_enabled: boolean;
  theme: 'light' | 'dark' | 'system';
  font_size: 'small' | 'medium' | 'large';
  emoji_suggestions: boolean;
  auto_download_media: boolean;
  message_grouping: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Chat connection status
 */
export interface ChatConnectionStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  last_connected: string | null;
  reconnect_attempts: number;
  ping_latency: number | null;
  server_time_offset: number;
}