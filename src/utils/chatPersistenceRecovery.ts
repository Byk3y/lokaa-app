import { log } from '@/utils/logger';

/**
 * Chat Persistence Recovery Utility
 * 
 * Provides fallback methods to read conversation state directly from localStorage
 * when Zustand persistence hasn't rehydrated yet (common on mobile after minimize).
 */

const CONVERSATION_STORE_KEY = 'conversation-store';
const MESSAGE_STORE_KEY = 'message-store';

/**
 * Read activeConversationId directly from localStorage
 * Useful when Zustand persist hasn't rehydrated yet
 */
export function getActiveConversationIdFromStorage(): string | null {
  try {
    const stored = localStorage.getItem(CONVERSATION_STORE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return parsed.state?.activeConversationId || null;
  } catch (error) {
    log.warn('Utils', '[ChatPersistenceRecovery] Failed to read activeConversationId from storage:', error);
    return null;
  }
}

/**
 * Read conversations array directly from localStorage
 */
export function getConversationsFromStorage(): any[] {
  try {
    const stored = localStorage.getItem(CONVERSATION_STORE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.state?.conversations || [];
  } catch (error) {
    log.warn('Utils', '[ChatPersistenceRecovery] Failed to read conversations from storage:', error);
    return [];
  }
}

/**
 * Check if conversation store has been persisted
 */
export function hasPersistedConversationStore(): boolean {
  try {
    return localStorage.getItem(CONVERSATION_STORE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Get conversation by ID from storage (fallback)
 */
export function getConversationByIdFromStorage(conversationId: string): any | null {
  try {
    const conversations = getConversationsFromStorage();
    return conversations.find((conv: any) => conv.conversation_id === conversationId) || null;
  } catch (error) {
    log.warn('Utils', '[ChatPersistenceRecovery] Failed to get conversation from storage:', error);
    return null;
  }
}

/**
 * Read messages for a conversation directly from localStorage
 * Useful when Zustand persist hasn't rehydrated yet
 */
export function getMessagesFromStorage(conversationId: string): any[] {
  try {
    const stored = localStorage.getItem(MESSAGE_STORE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    const messages = parsed.state?.messages || {};
    return messages[conversationId] || [];
  } catch (error) {
    log.warn('Utils', '[ChatPersistenceRecovery] Failed to read messages from storage:', error);
    return [];
  }
}

/**
 * Check if messages exist in storage for a conversation
 */
export function hasMessagesInStorage(conversationId: string): boolean {
  try {
    const messages = getMessagesFromStorage(conversationId);
    return messages.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get last fetch time for messages from storage
 */
export function getLastFetchTimeFromStorage(conversationId: string): number {
  try {
    const stored = localStorage.getItem(MESSAGE_STORE_KEY);
    if (!stored) return 0;
    
    const parsed = JSON.parse(stored);
    const lastFetchTimes = parsed.state?.lastFetchTimes || {};
    return lastFetchTimes[conversationId] || 0;
  } catch (error) {
    log.warn('Utils', '[ChatPersistenceRecovery] Failed to read last fetch time from storage:', error);
    return 0;
  }
}

