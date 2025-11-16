import { log } from '@/utils/logger';

/**
 * Conversation Clearing Tracker
 * 
 * Tracks when conversations are explicitly cleared by user action (e.g., back button)
 * to prevent URL-based or persistence-based restoration when user doesn't want it.
 */

// Module-level tracking
let explicitlyClearedConversationId: string | null = null;
let explicitlyClearedTimestamp: number = 0;
const CLEAR_EXPIRY_MS = 5000; // 5 seconds - enough time to prevent restoration but not too long

/**
 * Mark a conversation as explicitly cleared
 */
export function markConversationAsExplicitlyCleared(conversationId: string | null): void {
  explicitlyClearedConversationId = conversationId;
  explicitlyClearedTimestamp = Date.now();
  log.debug('Utils', '[ConversationClearingTracker] Marked conversation as explicitly cleared:', {
    conversationId,
    timestamp: explicitlyClearedTimestamp
  });
}

/**
 * Check if a conversation was explicitly cleared (and not expired)
 */
export function wasConversationExplicitlyCleared(conversationId: string | null): boolean {
  if (!explicitlyClearedConversationId) {
    return false;
  }

  // Check if expired
  const now = Date.now();
  if (now - explicitlyClearedTimestamp > CLEAR_EXPIRY_MS) {
    // Expired - reset
    explicitlyClearedConversationId = null;
    explicitlyClearedTimestamp = 0;
    return false;
  }

  // Check if this specific conversation was cleared
  if (conversationId === explicitlyClearedConversationId) {
    return true;
  }

  // If conversationId is null, check if any conversation was cleared
  if (conversationId === null && explicitlyClearedConversationId !== null) {
    return true;
  }

  return false;
}

/**
 * Reset the explicit clearing flag (e.g., when a new conversation is selected)
 */
export function resetExplicitClearing(): void {
  if (explicitlyClearedConversationId) {
    log.debug('Utils', '[ConversationClearingTracker] Resetting explicit clearing flag');
    explicitlyClearedConversationId = null;
    explicitlyClearedTimestamp = 0;
  }
}

/**
 * Get current clearing state (for debugging)
 */
export function getClearingState(): {
  clearedConversationId: string | null;
  timestamp: number;
  isExpired: boolean;
} {
  const now = Date.now();
  const isExpired = explicitlyClearedTimestamp > 0 && (now - explicitlyClearedTimestamp > CLEAR_EXPIRY_MS);
  
  return {
    clearedConversationId: explicitlyClearedConversationId,
    timestamp: explicitlyClearedTimestamp,
    isExpired
  };
}


