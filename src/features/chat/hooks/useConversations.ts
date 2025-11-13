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
  getActiveConversationIdFromStorage,
  getConversationsFromStorage
} from '@/utils/chatPersistenceRecovery';

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
    cleanup,
    connection
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

  // ✅ CRITICAL FIX: Visibility-aware restoration - restore activeConversationId when page becomes visible
  const wasVisibleRef = useRef(!document.hidden);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      // Only handle when page becomes visible (not when it becomes hidden)
      if (isVisible && !wasVisibleRef.current) {
        log.debug('Hook', '[useConversations] Page became visible - checking activeConversationId');
        
        const currentActiveId = activeConversationId;
        
        // If activeConversationId is null, try to restore it
        if (!currentActiveId) {
          // Try 1: Check URL params (mobile)
          const { conversationId: urlId } = parseConversationUrlParams();
          if (urlId) {
            log.debug('Hook', '[useConversations] Restoring activeConversationId from URL:', urlId);
            setActiveConversationId(urlId);
            return;
          }
          
          // Try 2: Check localStorage directly (persistence fallback)
          const storedId = getActiveConversationIdFromStorage();
          if (storedId) {
            log.debug('Hook', '[useConversations] Restoring activeConversationId from localStorage:', storedId);
            setActiveConversationId(storedId);
            return;
          }
          
          // Try 3: If conversations exist but activeConversationId is null, 
          // check if we can restore from stored conversations
          if (conversations.length > 0) {
            const storedConversations = getConversationsFromStorage();
            if (storedConversations.length > 0) {
              // Use the first conversation as fallback (most recent)
              const firstConversation = storedConversations[0];
              if (firstConversation?.conversation_id) {
                log.debug('Hook', '[useConversations] Restoring activeConversationId from stored conversations:', firstConversation.conversation_id);
                setActiveConversationId(firstConversation.conversation_id);
              }
            }
          }
        }
      }
      
      wasVisibleRef.current = isVisible;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeConversationId, conversations.length, setActiveConversationId]);

  // ✅ CRITICAL FIX: Restore activeConversationId when conversations are loaded but activeConversationId is null
  useEffect(() => {
    if (!hasInitialized || conversations.length === 0) return;
    
    // If we have conversations but no activeConversationId, try to restore it
    if (!activeConversationId) {
      // Try 1: Check URL params (mobile)
      const { conversationId: urlId } = parseConversationUrlParams();
      if (urlId && conversations.find(c => c.conversation_id === urlId)) {
        log.debug('Hook', '[useConversations] Restoring activeConversationId from URL after conversations loaded:', urlId);
        setActiveConversationId(urlId);
        return;
      }
      
      // Try 2: Check localStorage directly
      const storedId = getActiveConversationIdFromStorage();
      if (storedId && conversations.find(c => c.conversation_id === storedId)) {
        log.debug('Hook', '[useConversations] Restoring activeConversationId from localStorage after conversations loaded:', storedId);
        setActiveConversationId(storedId);
        return;
      }
    }
  }, [hasInitialized, conversations.length, activeConversationId, setActiveConversationId]);

  // ✅ CRITICAL FIX: Enhanced fallback mechanism to refresh stale conversation data
  useEffect(() => {
    if (!user?.id || !hasInitialized) return;

    // Set up interval to check for stale conversation data
    const staleDataCheckInterval = setInterval(() => {
      // Check 1: Real-time connection is down
      if (!connection.isConnected && conversations.length > 0) {
        log.debug('Hook', '[useConversations] 🔄 Real-time disconnected, forcing conversation refresh...');
        storeRefreshConversations(user.id, { forceNetwork: true });
        return;
      }
      
      // Check 2: Conversations with unread messages but missing message content (data corruption)
      const corruptedConversations = conversations.filter(conv => 
        conv.unread_count > 0 && (!conv.last_message || conv.last_message === 'undefined')
      );
      
      if (corruptedConversations.length > 0) {
        log.debug('Hook', '[useConversations] 🔄 Detected conversations with missing message data, auto-refreshing:', {
          count: corruptedConversations.length,
          conversationIds: corruptedConversations.map(c => c.conversation_id.substring(0, 8) + '...'),
          issues: corruptedConversations.map(c => ({
            id: c.conversation_id.substring(0, 8) + '...',
            unreadCount: c.unread_count,
            hasMessage: !!c.last_message,
            messageValue: c.last_message
          }))
        });
        storeRefreshConversations(user.id, { forceNetwork: true });
      }
    }, 30000); // Check every 30 seconds

    // Also run an immediate check after 5 seconds to catch issues quickly
    const immediateCheck = setTimeout(() => {
      const legacyConvs = conversations.map(conv => transformConversationToLegacy(conv, user?.id));
      const missingContentConvs = legacyConvs.filter(conv => 
        conv.unread_count > 0 && (
          !conv.latest_message_content || 
          conv.latest_message_content === 'undefined' ||
          conv.latest_message_content === null
        )
      );
      
      if (missingContentConvs.length > 0) {
        log.debug('Hook', '[useConversations] 🚨 IMMEDIATE: Found conversations with missing content after transformation:', {
          count: missingContentConvs.length,
          details: missingContentConvs.map(c => ({
            id: c.conversation_id.substring(0, 8) + '...',
            content: c.latest_message_content,
            unread: c.unread_count
          }))
        });
        storeRefreshConversations(user.id, { forceNetwork: true });
      }
    }, 5000);

    return () => {
      clearInterval(staleDataCheckInterval);
      clearTimeout(immediateCheck);
    };
  }, [user?.id, hasInitialized, connection.isConnected, conversations, storeRefreshConversations]);

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
      log.error('Hook', '[useConversations] Failed to create conversation:', error);
      throw error;
    }
  }, [createConversation, setActiveConversationId, navigateToConversationById, user?.id]);

  /**
   * Enhanced conversation selection with URL navigation
   */
  const selectConversation = useCallback((conversationId: string | null) => {
    setActiveConversationId(conversationId);
    
    if (conversationId) {
      // Mobile URL navigation
      navigateToConversationById(conversationId);
      
      // ✅ CRITICAL FIX: Refresh conversation data when selecting to ensure latest info
      if (user?.id && (!connection.isConnected || !hasInitialized)) {
        log.debug('Hook', '[useConversations] 🔄 Refreshing conversation data on selection due to connection issues');
        storeRefreshConversations(user.id, { forceNetwork: true });
      }
    }
  }, [setActiveConversationId, navigateToConversationById, user?.id, connection.isConnected, hasInitialized, storeRefreshConversations]);

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
    
    // ✅ CRITICAL FIX: Emergency refresh function for immediate use
    emergencyRefresh: useCallback(() => {
      if (user?.id) {
        log.debug('Hook', '[useConversations] 🚨 Emergency refresh triggered!');
        return storeRefreshConversations(user.id, { forceNetwork: true });
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