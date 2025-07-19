import { log } from '@/utils/logger';
/**
 * Chat Feature Exports
 * 
 * This file exports all chat-related functionality for easy importing.
 * Updated to prioritize new specialized hooks from Phase 4-6 refactoring.
 * 
 * ✅ PHASE 4-6 REFACTORING COMPLETED:
 * - All internal components migrated to new specialized system
 * - Old monolithic system removed completely  
 * - Significant bundle size reduction achieved
 * - 1070-line monolithic store eliminated
 */

// ============================================================================
// 🚀 NEW SPECIALIZED SYSTEM (RECOMMENDED)
// ============================================================================

// Specialized stores (Phase 2-3)
export { 
  useConversationStore,
  useMessageStore,
  useRealtimeStore,
  useNavigationStore
} from './store/index';

// Specialized hooks (Phase 4) - RECOMMENDED FOR NEW CODE
export { useConversations, type UseConversationsReturn } from './hooks/useConversations';
export { useMessages, type UseMessagesReturn } from './hooks/useMessages';
export { useChatRealtime, type UseChatRealtimeReturn } from './hooks/useChatRealtime';
export { useChatNavigation, type UseChatNavigationReturn } from './hooks/useChatNavigation';

// Unified hook (Phase 4 - backward compatibility)
export { useChatUnified, type UseChatUnifiedReturn } from './hooks/useChatUnified';

// Components (Phase 5 - Unified Components)
export { 
  ChatListUnified,
  default as ChatListUnifiedDefault
} from './components/ChatListUnified';

// Services (Phase 1-2)
export {
  ChatApiService,
  ChatRealtimeService,
  chatApiService,
  chatRealtimeService
} from './services/index';

// ============================================================================
// 🔄 TYPE EXPORTS
// ============================================================================

// Re-export commonly used types from specialized stores
export type {
  Message as ChatMessage,
  Conversation as ChatConversation,
} from './services/ChatApiService';

// Re-export service types
export type {
  RealtimeEvent,
  RealtimeEventType,
  RealtimeEventListener
} from './services/ChatRealtimeService';

// ============================================================================
// 📊 REFACTORING COMPLETED
// ============================================================================

/**
 * ✅ REFACTORING SUMMARY:
 * 
 * REMOVED:
 * - 1070-line monolithic chat-store.ts
 * - Legacy useChat() hook
 * - useChatStore compatibility layer
 * - Dual store system conflicts
 * 
 * ACHIEVED:
 * - Clean specialized architecture
 * - Significant bundle size reduction
 * - Better separation of concerns
 * - Easier testing and maintenance
 * - Type-safe APIs with better error handling
 */ 

// ============================================================================
// 🔧 GLOBAL STORE ACCESS (FOR DEBUGGING/TESTING)
// ============================================================================

// Import stores for global access
import { 
  useConversationStore as conversationStore, 
  useMessageStore as messageStore,
  useRealtimeStore as realtimeStore,
  useNavigationStore as navigationStore
} from './store/index';

// Make stores available globally for debugging and testing
if (typeof window !== 'undefined') {
  (window as any).useConversationStore = conversationStore;
  (window as any).useMessageStore = messageStore;
  (window as any).useRealtimeStore = realtimeStore;
  (window as any).useNavigationStore = navigationStore;
  
  // Expose auth helper for emergency scripts
  (window as any).getCurrentUser = () => {
    try {
      // Method 1: Try React context by searching DOM
      const reactElements = document.querySelectorAll('[data-reactroot], #root');
      for (const element of reactElements) {
        const reactFiber = Object.keys(element).find(key => key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance'));
        if (reactFiber) {
          // Try to find auth context in React fiber tree
          let node = (element as any)[reactFiber];
          while (node) {
            if (node.memoizedState?.user?.id) {
              return node.memoizedState.user;
            }
            if (node.return?.memoizedState?.user?.id) {
              return node.return.memoizedState.user;
            }
            node = node.return || node.child;
            if (!node || node === element) break;
          }
        }
      }

      // Method 2: Try global stores
      const authStores = ['useOptimizedAuth', 'useAuthStore', 'authStore'];
      for (const storeName of authStores) {
        const store = (window as any)[storeName];
        if (store?.getState) {
          const state = store.getState();
          if (state?.user?.id) {
            log.debug('App', '[getCurrentUser] Found user via store:', storeName);
            return state.user;
          }
        }
      }

      // Method 3: Try localStorage
      const localStorageKeys = ['auth-store', 'user-store', 'optimized-auth'];
      for (const key of localStorageKeys) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.state?.user?.id || parsed?.user?.id) {
              log.debug('App', '[getCurrentUser] Found user via localStorage:', key);
              return parsed.state?.user || parsed.user;
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }

      log.warn('App', '[getCurrentUser] No user found in any method');
      return null;
    } catch (error) {
      log.error('App', '[getCurrentUser] Error:', error);
      return null;
    }
  };
}