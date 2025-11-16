import { log } from '@/utils/logger';
/**
 * useConversations Hook
 * 
 * Provides conversation management functionality using the specialized ConversationStore.
 * Replaces conversation-related logic from the monolithic useChat hook.
 * 
 * Features:
 * - Conversation fetching and creation
 * - Active conversation management
 * - Unread count tracking
 * - Mobile URL integration
 * - Real-time synchronization
 * - Legacy compatibility
 */

import { useCallback, useEffect, useRef } from 'react';
import { useConversationStore } from '../store/conversationStore';
import { useNavigationStore } from '../store/navigationStore';
import { useRealtimeStore } from '../store/realtimeStore';
import { transformConversationToLegacy, type LegacyConversation } from '../types';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import {
  parseConversationUrlParams
} from '@/utils/conversationUrlUtils';
import {
  wasConversationExplicitlyCleared
} from '@/utils/conversationClearingTracker';

/**
 * Hook for conversation management with real-time synchronization
 */
export function useConversations() {
  const { user } = useOptimizedAuth();
  // Reset conversations when the authenticated user changes to avoid stale data flashes
  // ✅ CRITICAL FIX: Don't reset if we're just rehydrating (user ID hasn't actually changed)
  const previousUserIdRef = useRef<string | undefined>(user?.id);
  
  useEffect(() => {
    if (!user?.id) return;
    
    // Only reset if user ID actually changed (not just on mount/rehydration)
    if (previousUserIdRef.current && previousUserIdRef.current !== user.id) {
      log.debug('Hook', '[useConversations] User ID changed, resetting conversations');
      try {
        useConversationStore.getState().reset();
      } catch {}
    }
    
    previousUserIdRef.current = user.id;
  }, [user?.id]);
  
  // Store selectors
  const {
    conversations,
    activeConversationId,
    loading,
    error,
    hasInitialized,
    fetchConversations: storeFetchConversations,
    refreshConversations: storeRefreshConversations,
    createConversation,
    setActiveConversationId,
    getActiveConversation,
    getConversationById,
    getConversationBySlug,
    getUnreadCount,
    updateConversation,
    reorderConversations,
    setError,
    reset
  } = useConversationStore();

  const {
    navigateToConversationById,
    parseUrlParameters,
    setMobileDevice
  } = useNavigationStore();

  const {
    initialize,
    cleanup
  } = useRealtimeStore();

  // Auto-initialize conversations when hook is first used
  useEffect(() => {
    if (!hasInitialized && !loading && user?.id) {
      log.debug('Hook', '[useConversations] Auto-initializing conversations for user:', user.id);
      
      // CRITICAL FIX: Force network fetch on mobile to get latest data structure with latest_message_sender
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const options = isMobile ? { forceNetwork: true } : {};
      
      if (isMobile) {
        log.debug('Hook', '[useConversations] 📱 Mobile detected, forcing network fetch to bypass stale cache');
      }
      
      storeFetchConversations(user.id, options);
    }
  }, [hasInitialized, loading, user?.id, storeFetchConversations]);

  // Initialize real-time subscriptions when user is available
  useEffect(() => {
    if (user?.id) {
      log.debug('Hook', '[useConversations] Initializing real-time subscriptions for user:', user.id);
      // Always initialize - the store will handle duplicate initialization protection
      initialize();
    }

    // ✅ CRITICAL FIX: Don't cleanup on unmount to maintain persistent real-time connections
    // Only cleanup when user actually changes (logout/login)
    return () => {
      if (!user?.id) {
        log.debug('Hook', '[useConversations] User logged out, cleaning up real-time subscriptions');
        cleanup();
      } else {
        log.debug('Hook', '[useConversations] Component unmounting but user still logged in, keeping real-time active');
      }
    };
  }, [user?.id]); // ✅ FIXED: Only depend on user?.id to prevent unnecessary cycles

  // Device detection setup
  useEffect(() => {
    const checkMobileDevice = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setMobileDevice(isMobile);
    };

    checkMobileDevice();
    window.addEventListener('resize', checkMobileDevice);
    
    return () => {
      window.removeEventListener('resize', checkMobileDevice);
    };
  }, [setMobileDevice]);

  // Simplified visibility + initialization restoration
  useEffect(() => {
    // Handle visibility changes for mobile tab switching
    const handleVisibilityChange = () => {
      if (document.hidden || activeConversationId) return; // Skip if already set

      // Single source of truth: URL params (mobile) or Zustand persistence (automatic)
      const { conversationId: urlId } = parseConversationUrlParams();
      if (urlId && conversations.find(c => c.conversation_id === urlId)) {
        // ✅ CONVERSATION PERSISTENCE FIX: Check if this conversation was explicitly cleared
        if (wasConversationExplicitlyCleared(urlId)) {
          log.debug('Hook', '[useConversations] Conversation in URL was explicitly cleared, not restoring:', urlId);
          return;
        }
        
        log.debug('Hook', '[useConversations] Restoring from URL after visibility change:', urlId);
        setActiveConversationId(urlId);
      }
      // Zustand persistence handles the rest automatically - no manual localStorage needed
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also run once on mount if conversations loaded but no active ID
    if (hasInitialized && conversations.length > 0 && !activeConversationId) {
      const { conversationId: urlId } = parseConversationUrlParams();
      if (urlId && conversations.find(c => c.conversation_id === urlId)) {
        // ✅ CONVERSATION PERSISTENCE FIX: Check if this conversation was explicitly cleared
        if (wasConversationExplicitlyCleared(urlId)) {
          log.debug('Hook', '[useConversations] Conversation in URL was explicitly cleared, not restoring on mount:', urlId);
          return;
        }
        
        log.debug('Hook', '[useConversations] Initial restoration from URL:', urlId);
        setActiveConversationId(urlId);
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasInitialized, conversations, activeConversationId, setActiveConversationId]);

  // Handle real-time connection recovery
  // Real-time auto-reconnects via useChatRealtime - no polling needed
  // If data issues occur, they should be fixed at the API/database level
  useEffect(() => {
    if (!user?.id || !hasInitialized) return;

    // Real-time service handles reconnection automatically
    // Trust that the system will recover without manual polling
  }, [user?.id, hasInitialized]);

  /**
   * Enhanced conversation creation with URL navigation support
   */
  const createConversationEnhanced = useCallback(async (
    userIds: string[], 
    isGroup = false, 
    name?: string
  ): Promise<string> => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const conversationId = await createConversation(userIds, isGroup, name, user.id);
      
      // Auto-navigate to created conversation
      setActiveConversationId(conversationId);
      
      // Mobile URL navigation
      navigateToConversationById(conversationId);
      
      return conversationId;
    } catch (error) {
      log.error('Hook', '[useConversations] Failed to create conversation:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [createConversation, setActiveConversationId, navigateToConversationById, user?.id]);

  /**
   * Conversation selection with URL navigation
   */
  const selectConversation = useCallback((conversationId: string | null) => {
    setActiveConversationId(conversationId);

    if (conversationId) {
      // Mobile URL navigation
      navigateToConversationById(conversationId);
    }
    // Trust that conversations are up-to-date from real-time
    // If there's an actual connection issue, handle it explicitly elsewhere
  }, [setActiveConversationId, navigateToConversationById]);

  /**
   * Get conversation by slug (mobile URL support)
   */
  const getConversationFromSlug = useCallback(async (slug: string) => {
    return await getConversationBySlug(slug);
  }, [getConversationBySlug]);

  /**
   * Parse URL parameters and set active conversation
   */
  const handleUrlNavigation = useCallback(() => {
    const { conversationId, slug } = parseUrlParameters();
    
    if (conversationId) {
      setActiveConversationId(conversationId);
      return conversationId;
    } else if (slug) {
      // Try to find conversation from slug
      getConversationFromSlug(slug).then(conversation => {
        if (conversation) {
          setActiveConversationId(conversation.conversation_id);
        }
      });
    }
    
    return null;
  }, [parseUrlParameters, setActiveConversationId, getConversationFromSlug]);

  /**
   * Transform conversations to legacy format for backward compatibility
   */
  const legacyConversations: LegacyConversation[] = conversations.map(conv => 
    transformConversationToLegacy(conv, user?.id)
  );

  /**
   * Get active conversation in legacy format
   */
  const activeLegacyConversation = (() => {
    const activeConv = getActiveConversation();
    return activeConv ? transformConversationToLegacy(activeConv, user?.id) : null;
  })();

  /**
   * Get conversation by ID with legacy format
   */
  const getLegacyConversationById = useCallback((id: string): LegacyConversation | null => {
    const conversation = getConversationById(id);
    return conversation ? transformConversationToLegacy(conversation, user?.id) : null;
  }, [getConversationById, user?.id]);

  /**
   * Update conversation data (for real-time updates)
   */
  const updateConversationData = useCallback((
    conversationId: string, 
    updates: {
      last_message?: string;
      last_message_at?: string;
      unread_count?: number;
    }
  ) => {
    updateConversation(conversationId, updates);
    reorderConversations(); // Maintain chronological order
  }, [updateConversation, reorderConversations]);

  /**
   * Start direct conversation (legacy compatibility)
   */
  const startDirectConversation = useCallback(async (targetUserId: string): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    if (user.id === targetUserId) {
      throw new Error('Cannot create conversation with yourself');
    }
    
    return await createConversationEnhanced([targetUserId], false);
  }, [user?.id, createConversationEnhanced]);

  return {
    // State
    conversations,
    legacyConversations,
    activeConversationId,
    activeConversation: getActiveConversation(),
    activeLegacyConversation,
    loading,
    error,
    hasInitialized,
    unreadCount: getUnreadCount(),

    // Core operations
    fetchConversations: useCallback((options?: { forceNetwork?: boolean }) => {
      if (user?.id) {
        log.debug('Hook', '[useConversations] Fetching conversations for user:', user.id.substring(0, 8) + '...', options);
        return storeFetchConversations(user.id, options);
      } else {
        log.warn('Hook', '[useConversations] Cannot fetch conversations - user not authenticated yet');
        return Promise.resolve();
      }
    }, [storeFetchConversations, user?.id]),
    refreshConversations: useCallback((userId?: string, options?: { forceNetwork?: boolean; urgent?: boolean }) => {
      // ✅ CRITICAL FIX: Use provided userId or fallback to current user
      const targetUserId = userId || user?.id;
      if (targetUserId) {
        // CRITICAL FIX: Always force network for refreshConversations to get latest data + pass urgent flag
        return storeRefreshConversations(targetUserId, { forceNetwork: true, ...options });
      }
      return Promise.resolve();
    }, [storeRefreshConversations, user?.id]),

    createConversation: createConversationEnhanced,
    startDirectConversation,

    // Navigation
    selectConversation,
    setActiveConversationId,
    handleUrlNavigation,

    // Queries
    getConversationById,
    getLegacyConversationById,
    getConversationFromSlug,

    // Real-time updates
    updateConversationData,
    reorderConversations,

    // Error handling
    setError,
    clearError: () => setError(null),

    // Utilities
    reset
  };
}

/**
 * Type exports for external use
 */
export type UseConversationsReturn = ReturnType<typeof useConversations>; 