/**
 * Chat Feature Exports
 * 
 * This file exports all chat-related functionality for easy importing.
 */

// Store
export { useChatStore, type Message, type Conversation } from './store/chat-store';

// Hooks
export { useChat } from './hooks/useChat';

// Re-export commonly used types
export type {
  Message as ChatMessage,
  Conversation as ChatConversation,
} from './store/chat-store'; 