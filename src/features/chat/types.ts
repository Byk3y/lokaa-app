import type { Conversation } from './store';
// 🎯 PHASE 3 FIX: Import global console flags
import { globalConsoleFlags } from '@/utils/developmentLogger';

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
  // ✅ ENHANCED: Better debugging and null safety for participant data
  if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
    console.log('🔄 [ConversationTransform] Transforming conversation:', {
      conversationId: conversation.conversation_id,
      isGroup: conversation.is_group,
      hasParticipants: !!conversation.participants,
      participantsLength: conversation.participants?.length || 0,
      participantsRaw: conversation.participants,
      // ✅ CRITICAL: Debug message fields
      messageFields: {
        last_message: conversation.last_message,
        last_message_at: conversation.last_message_at,
        latest_message_sender: conversation.latest_message_sender
      },
      currentUserId
    });
  }

  // ✅ ENHANCED: Robust participant extraction with fallbacks
  let otherParticipants: any[] = [];
  
  // 🎯 PHASE 3 FIX: Conditional logging for participant debug
  if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
    console.log('🔧 [ConversationTransform] Participant debug:', {
      hasParticipants: !!conversation.participants,
      participantsType: typeof conversation.participants,
      participantsIsArray: Array.isArray(conversation.participants),
      participantsLength: conversation.participants?.length,
      currentUserId,
      firstParticipant: conversation.participants?.[0]
    });
  }
  
  if (conversation.participants && Array.isArray(conversation.participants)) {
    // ✅ CRITICAL FIX: More flexible participant filtering
    otherParticipants = conversation.participants
      .filter(p => {
        if (!p || !p.user_id) return false;
        
        // ✅ CRITICAL: Don't filter out if currentUserId is undefined
        if (!currentUserId) return true;
        
        // Only filter out if the user ID actually matches
        const isCurrentUser = p.user_id === currentUserId;
        // 🎯 PHASE 3 FIX: Conditional logging for participant filter
        if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
          console.log('🔧 [ConversationTransform] Participant filter:', {
            participantId: p.user_id.substring(0, 8) + '...',
            currentUserId: currentUserId?.substring(0, 8) + '...' || 'undefined',
            isCurrentUser,
            willInclude: !isCurrentUser
          });
        }
        
        return !isCurrentUser;
      })
      .map(p => ({
        user_id: p.user_id,
        full_name: p.user?.full_name || `User ${p.user_id.slice(0, 8)}`, // ✅ Fallback name
        avatar_url: p.user?.avatar_url || null,
        profile_url: null,
        last_seen_at: null,
        is_online: false
      }));
      
    // 🎯 PHASE 3 FIX: Conditional logging for filtered participants  
    if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
      console.log('🔧 [ConversationTransform] Filtered participants:', {
        inputCount: conversation.participants.length,
        outputCount: otherParticipants.length,
        participants: otherParticipants.map(p => ({
          id: p.user_id.substring(0, 8) + '...',
          name: p.full_name,
          hasAvatar: !!p.avatar_url
        }))
      });
    }
    
    // ✅ CRITICAL FIX: Handle corrupted direct conversations with only current user
    if (!conversation.is_group && otherParticipants.length === 0 && conversation.participants.length === 1) {
      const singleParticipant = conversation.participants[0];
      if (singleParticipant.user_id === currentUserId) {
        console.warn('⚠️ [ConversationTransform] CORRUPTED CONVERSATION: Direct conversation only has current user as participant!', {
          conversationId: conversation.conversation_id,
          participantId: singleParticipant.user_id?.substring(0, 8) + '...',
          currentUserId: currentUserId?.substring(0, 8) + '...'
        });
        
        // Create a fallback "unknown user" participant to prevent UI breaks
        otherParticipants = [{
          user_id: 'unknown-user',
          full_name: 'Unknown User',
          avatar_url: null,
          profile_url: null,
          last_seen_at: null,
          is_online: false
        }];
        
        // 🎯 PHASE 3 FIX: Conditional logging for fallback participant
        if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
          console.log('🔧 [ConversationTransform] Created fallback participant for corrupted conversation');
        }
      }
    }
  } else {
    console.warn('⚠️ [ConversationTransform] No participants found for conversation:', conversation.conversation_id);
    
    // ✅ ENHANCED: For incognito mode, try to create a minimal participant from conversation name or other data
    if (!conversation.is_group && conversation.name) {
      // If it's a direct conversation and we have a name, create a fallback participant
      otherParticipants = [{
        user_id: 'unknown', // This will need to be handled gracefully
        full_name: conversation.name,
        avatar_url: null,
        profile_url: null,
        last_seen_at: null,
        is_online: false
      }];
      // 🎯 PHASE 3 FIX: Conditional logging for name fallback
      if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
        console.log('🔧 [ConversationTransform] Created fallback participant from conversation name');
      }
    }
  }

  // ✅ CRITICAL: Enhanced message content extraction with fallbacks
  let messageContent = conversation.last_message || null;
  let messageTime = conversation.last_message_at || null;
  let messageSender = conversation.latest_message_sender || null;
  
  // ✅ Fallback: If transformation missed the content, try other possible field names
  if (!messageContent && (conversation as any).latest_message_content) {
    messageContent = (conversation as any).latest_message_content;
    // 🎯 PHASE 3 FIX: Conditional logging for fallback content
    if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
      console.log('🔧 [ConversationTransform] Used fallback latest_message_content field');
    }
  }
  
  if (!messageTime && (conversation as any).latest_message_time) {
    messageTime = (conversation as any).latest_message_time;
    // 🎯 PHASE 3 FIX: Conditional logging for fallback time
    if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
      console.log('🔧 [ConversationTransform] Used fallback latest_message_time field');
    }
  }

  const result = {
    conversation_id: conversation.conversation_id,
    conversation_name: conversation.name || null,
    is_group: conversation.is_group,
    created_at: conversation.created_at,
    last_message_at: conversation.last_message_at || null,
    latest_message_content: messageContent,
    latest_message_time: messageTime,
    latest_message_sender: messageSender,
    unread_count: conversation.unread_count,
    other_participants: otherParticipants
  };

  // 🎯 PHASE 3 FIX: Conditional logging for transformation result
  if (!globalConsoleFlags?.DISABLE_CHAT_DEBUG_LOGS) {
    console.log('✅ [ConversationTransform] Transformation result:', {
      conversationId: result.conversation_id,
      otherParticipantsCount: result.other_participants.length,
      hasParticipantNames: result.other_participants.some(p => p.full_name),
      hasParticipantAvatars: result.other_participants.some(p => p.avatar_url),
      latestMessage: {
        content: result.latest_message_content,
        time: result.latest_message_time,
        sender: result.latest_message_sender,
        isCurrentUserSender: result.latest_message_sender === currentUserId,
        // ✅ CRITICAL: Show what was actually mapped
        sourceMapping: {
          from_last_message: conversation.last_message,
          to_latest_message_content: result.latest_message_content,
          mapping_worked: conversation.last_message === result.latest_message_content
        }
      }
    });
  }

  return result;
} 