/**
 * Chat Store Exports
 * 
 * This file exports all chat store functionality for easy importing.
 * Updated to include only the new specialized stores from the refactoring.
 * 
 * ✅ REFACTORING COMPLETED:
 * - Old monolithic chat-store.ts removed
 * - Only specialized stores remain
 */

// Specialized stores (Phase 2-3)
export { useConversationStore } from './conversationStore';
export { useMessageStore } from './messageStore';
export { useRealtimeStore } from './realtimeStore';
export { useNavigationStore } from './navigationStore';

// Re-export types for convenience
export type { Message, Conversation } from '../services/ChatApiService';
export type { RealtimeEvent, RealtimeEventType } from '../services/ChatRealtimeService'; 