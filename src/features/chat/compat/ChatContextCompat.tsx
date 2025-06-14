/**
 * Chat Context Compatibility Wrapper
 * 
 * This file provides backward compatibility for components still using the old ChatContext.
 * It wraps the new Zustand-based chat store to maintain the same API.
 * 
 * @deprecated This is a temporary compatibility layer. Use the new useChat hook instead.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useChat } from '../hooks/useChat';

// Re-export types for backward compatibility
export type { Message, Conversation } from '../store/chat-store';

/**
 * Legacy chat context value interface for backward compatibility
 */
export interface ChatContextValue {
  conversations: any[];
  loadingConversations: boolean;
  fetchConversations: () => Promise<void>;
  
  messages: Record<string, any[]>;
  loadingMessages: Record<string, boolean>;
  fetchMessages: (conversationId: string) => Promise<void>;
  
  sendMessage: (conversationId: string, content: string, attachmentUrl?: string, attachmentType?: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  createConversation: (userIds: string[], isGroup: boolean, name?: string) => Promise<string>;
  
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  
  getUnreadCount: () => number;
  getConversationById: (id: string) => any;
  
  lastMessageUpdate: number;
}

/**
 * Legacy context for backward compatibility
 */
const ChatContext = createContext<ChatContextValue | undefined>(undefined);

/**
 * Compatibility provider that uses the new Zustand store
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const chatHook = useChat();
  
  // Map the new hook API to the old context API
  const contextValue: ChatContextValue = {
    conversations: chatHook.conversations,
    loadingConversations: chatHook.loadingConversations,
    fetchConversations: chatHook.fetchConversations,
    
    messages: chatHook.messages,
    loadingMessages: chatHook.loadingMessages,
    fetchMessages: chatHook.fetchMessages,
    
    sendMessage: chatHook.sendMessage,
    markConversationAsRead: chatHook.markConversationAsRead,
    createConversation: chatHook.createConversation,
    
    activeConversationId: chatHook.activeConversationId,
    setActiveConversationId: chatHook.setActiveConversationId,
    
    getUnreadCount: chatHook.getUnreadCount,
    getConversationById: chatHook.getConversationById,
    
    lastMessageUpdate: chatHook.lastMessageUpdate,
  };
  
  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

/**
 * Legacy hook for backward compatibility
 * 
 * @deprecated Use the new useChat hook from '@/features/chat' instead
 */
export function useChat_Legacy() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
} 