/**
 * Chat Services Index
 * 
 * Central export point for all chat services.
 * This provides a clean API for consuming components.
 */

// Core services
export { ChatApiService, chatApiService } from './ChatApiService';
export { ChatRealtimeService, chatRealtimeService } from './ChatRealtimeService';

// Types
export type { 
  Message, 
  Conversation 
} from './ChatApiService';

export type { 
  RealtimeEvent, 
  RealtimeEventType, 
  RealtimeEventListener,
  ConversationChangeEvent,
  NewMessageEvent,
  MessageUpdateEvent,
  ConnectionChangeEvent
} from './ChatRealtimeService'; 