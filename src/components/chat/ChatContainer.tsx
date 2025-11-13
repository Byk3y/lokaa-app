import { log } from '@/utils/logger';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useConversations, ChatListUnified } from '@/features/chat';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import ChatView from '@/components/chat/ChatView';
import StartNewChatView from '@/components/chat/StartNewChatView';
import { setPendingChatNavigation } from '@/utils/scrollPositionManager';
import { type LegacyConversation } from '@/features/chat/types';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import MobileSpaceDrawer from '@/components/mobile/MobileSpaceDrawer';
import { useSpace } from '@/hooks/useSpace';
import { 
  parseConversationUrlParams,
  findConversationIdFromSlug,
  navigateToConversationList
} from '@/utils/conversationUrlUtils';
import { 
  getActiveConversationIdFromStorage,
  getConversationByIdFromStorage
} from '@/utils/chatPersistenceRecovery';

interface ChatContainerProps {
  initialConversationId?: string;
  isModal?: boolean;
  onClose?: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
}

export default function ChatContainer({ 
  initialConversationId, 
  isModal = false, 
  onClose, 
  onExpand, 
  isExpanded 
}: ChatContainerProps) {
  const { user } = useOptimizedAuth();
  const { space } = useSpace();
  
  // ✅ CRITICAL FIX: Use new conversation system entirely
  const { 
    legacyConversations, 
    activeConversationId, 
    activeLegacyConversation,
    fetchConversations, 
    selectConversation
  } = useConversations();
  
  const isMobileDevice = useMediaQuery("(max-width: 640px)");
  const isMobileForUrls = useMediaQuery("(max-width: 768px)");
  
  const [view, setView] = useState<'list' | 'chat' | 'new'>(() => {
    // ✅ FIX: Set initial state based on whether we have an initial conversation
    // This prevents the "Select a Conversation" flash when a conversation is pre-selected
    return initialConversationId ? 'chat' : 'list';
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // ✅ CRITICAL FIX: Cache the last valid conversation to prevent unmounting during rehydration
  const cachedConversationRef = useRef<LegacyConversation | null>(null);
  const lastInitialConversationIdRef = useRef<string | undefined>(initialConversationId);
  
  // Clear cache if initialConversationId changes
  useEffect(() => {
    if (lastInitialConversationIdRef.current !== initialConversationId) {
      if (initialConversationId !== cachedConversationRef.current?.conversation_id) {
        cachedConversationRef.current = null;
      }
      lastInitialConversationIdRef.current = initialConversationId;
    }
  }, [initialConversationId]);

  // DEBUG: Log container state
  log.debug('Component', '🗨️ [ChatContainer] Rendered with state:', {
    initialConversationId,
    isModal,
    view,
    activeConversationId,
    conversationsLength: legacyConversations?.length || 0,
    userId: user?.id
  });
  console.log('🚨 [CHAT_CONTAINER] render', { view, activeConversationId, conversations: legacyConversations?.length || 0 });

  // ✅ MODERN 2025: Prevent background scroll when chat is open
  useEffect(() => {
    if (isModal && view === 'chat') {
      // Add class to body to prevent background scroll
      document.body.classList.add('chat-page-open');
      return () => {
        document.body.classList.remove('chat-page-open');
      };
    }
  }, [isModal, view]);

  // ✅ CRITICAL FIX: Primary source of truth - use initialConversationId prop
  // This ensures we always have a conversation ID even if store hasn't rehydrated
  useEffect(() => {
    log.debug('Component', '🗨️ [ChatContainer] UseEffect - setup:', {
      initialConversationId,
      activeConversationId,
      willSetView: initialConversationId ? 'chat' : 'list'
    });
    
    // ✅ PRIMARY SOURCE: Use initialConversationId as source of truth
    if (initialConversationId) {
      // Always sync store with prop (even if store already has it)
      // This handles cases where store was cleared but prop still has value
      if (activeConversationId !== initialConversationId) {
        log.debug('Component', '🗨️ [ChatContainer] Syncing activeConversationId with initialConversationId:', initialConversationId);
        selectConversation(initialConversationId);
      }
      setView('chat');
    } else {
      // No initialConversationId - check if we have activeConversationId from store
      if (activeConversationId) {
        // Store has a conversation, use it
        log.debug('Component', '🗨️ [ChatContainer] No initialConversationId but have activeConversationId, using store value');
        setView('chat');
      } else {
        // No conversation anywhere - show list or close modal
        if (isModal) {
          log.debug('Component', '🗨️ [ChatContainer] Modal opened without conversation - closing');
          onClose?.();
          return;
        }
        setView('list');
      }
    }
  }, [initialConversationId, isModal]); // ✅ FIXED: Removed selectConversation and onClose from dependencies

  // ✅ CRITICAL FIX: Visibility-aware restoration - restore activeConversationId when page becomes visible
  useEffect(() => {
    let wasVisible = !document.hidden;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      // Only handle when page becomes visible (not when it becomes hidden)
      if (isVisible && !wasVisible) {
        log.debug('Component', '🗨️ [ChatContainer] Page became visible - checking conversation state');
        
        // ✅ RESTORATION LOGIC: If activeConversationId is null but initialConversationId exists, restore it
        if (!activeConversationId && initialConversationId) {
          log.debug('Component', '🗨️ [ChatContainer] Restoring activeConversationId from initialConversationId:', initialConversationId);
          selectConversation(initialConversationId);
          setView('chat');
        } else if (!activeConversationId && !initialConversationId) {
          // Both are null - try to restore from localStorage directly
          const storedId = getActiveConversationIdFromStorage();
          if (storedId) {
            log.debug('Component', '🗨️ [ChatContainer] Restoring activeConversationId from localStorage:', storedId);
            selectConversation(storedId);
            setView('chat');
          }
        } else if (activeConversationId && view !== 'chat') {
          // Store has conversation but view is wrong - restore view
          log.debug('Component', '🗨️ [ChatContainer] Restoring chat view from activeConversationId');
          setView('chat');
        }
      }
      
      wasVisible = isVisible;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeConversationId, initialConversationId, view, selectConversation]);

  // Mobile-only: Listen for URL changes (browser back/forward navigation)
  useEffect(() => {
    if (!isMobileForUrls || isModal) return; // Only handle URL changes on mobile full-screen

    const handlePopState = () => {
      log.debug('Component', '📱 [ChatContainer] Browser back/forward detected');
      
      const { slug, conversationId: cachedId } = parseConversationUrlParams();
      
      // ✅ NAVIGATION STATE GUARD: Check if already at this conversation
      if (cachedId && cachedId === activeConversationId) {
        log.debug('Component', '📱 [ChatContainer] Already at target conversation, skipping:', cachedId);
        return;
      }
      
      if (slug) {
        // User navigated to a conversation URL
        let resolvedId = cachedId;
        
        if (!resolvedId && legacyConversations.length > 0) {
          resolvedId = findConversationIdFromSlug(slug, legacyConversations);
        }
        
        if (resolvedId) {
          log.debug('Component', '📱 [ChatContainer] Browser navigation to conversation:', resolvedId);
          selectConversation(resolvedId);
          setView('chat');
        } else {
          log.warn('Component', '📱 [ChatContainer] Browser navigation: conversation not found for slug:', slug);
          setView('list');
          selectConversation(null);
        }
      } else {
        // User navigated back to conversation list
        log.debug('Component', '📱 [ChatContainer] Browser navigation to conversation list');
        setView('list');
        selectConversation(null);
      }
    };

    // Listen for browser back/forward
    window.addEventListener('popstate', handlePopState);
    
    // Listen for custom URL change events (from navigateToConversation)
    const handleCustomUrlChange = (event: CustomEvent) => {
      const { conversationId } = event.detail;
      
      // ✅ NAVIGATION STATE GUARD: Check if already at this conversation
      if (conversationId && conversationId === activeConversationId) {
        log.debug('Component', '📱 [ChatContainer] Already at target conversation, skipping custom URL change:', conversationId);
        return;
      }
      
      if (conversationId) {
        log.debug('Component', '📱 [ChatContainer] Custom URL change to conversation:', conversationId);
        selectConversation(conversationId);
        setView('chat');
      } else {
        log.debug('Component', '📱 [ChatContainer] Custom URL change to conversation list');
        setView('list');
        selectConversation(null);
      }
    };

    window.addEventListener('conversationUrlChange', handleCustomUrlChange as EventListener);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('conversationUrlChange', handleCustomUrlChange as EventListener);
    };
  }, [legacyConversations?.length, isModal, isMobileForUrls, activeConversationId]); // ✅ INFINITE LOOP FIX: Added activeConversationId for state guard

  // ✅ CRITICAL FIX: Set pending chat navigation when modal opens
  useEffect(() => {
    if (isModal) {
      setPendingChatNavigation(true);
      console.log('🔍 [ChatContainer] Set pending chat navigation - modal opened');
      
      return () => {
        setPendingChatNavigation(false);
        console.log('🔍 [ChatContainer] Cleared pending chat navigation - modal closed');
      };
    }
  }, [isModal]);

  // ✅ CRITICAL FIX: Clear pending flag when chat view is mounted
  useEffect(() => {
    if (view === 'chat' && activeConversationId) {
      // Clear the pending flag after a short delay to ensure chat is fully mounted
      const timeoutId = setTimeout(() => {
        setPendingChatNavigation(false);
        console.log('🔍 [ChatContainer] Cleared pending chat navigation - chat mounted');
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [view, activeConversationId]);

  const handleSelectConversation = (conversation: LegacyConversation) => {
    // This is called by ChatListItem for state consistency
    selectConversation(conversation.conversation_id);
    setView('chat');
  };
  
  const handleBack = () => {
    if (isModal) {
      // Modal: Close the modal when back is pressed
      log.debug('Component', '🗨️ [ChatContainer] Modal back button pressed - closing modal');
      onClose?.();
    } else if (isMobileForUrls) {
      // Mobile: Use URL navigation for browser history
      const success = navigateToConversationList();
      if (success) {
        log.debug('Component', '📱 [ChatContainer] Mobile: Navigated to conversation list URL');
      }
      // The actual view change will happen via URL change listener
    } else {
      // Desktop: Direct state management
      setView('list');
      selectConversation(null);
    }
  };
  
  // ✅ CRITICAL FIX: Multi-source truth with caching to prevent unmounting during rehydration
  // This ensures ChatView never unmounts when store temporarily resets
  const selectedConversation = useMemo(() => {
    // Helper function to get conversation from storage
    const getConversationFromStorage = (conversationId: string): LegacyConversation | null => {
      const storedConversation = getConversationByIdFromStorage(conversationId);
      if (storedConversation && storedConversation.conversation_id) {
        const conversation: LegacyConversation = {
          conversation_id: storedConversation.conversation_id,
          conversation_name: storedConversation.conversation_name || storedConversation.name || null,
          is_group: storedConversation.is_group || false,
          created_at: storedConversation.created_at || new Date().toISOString(),
          last_message_at: storedConversation.last_message_at || null,
          latest_message_content: storedConversation.latest_message_content || storedConversation.last_message || null,
          latest_message_time: storedConversation.latest_message_time || storedConversation.last_message_at || null,
          latest_message_sender: storedConversation.latest_message_sender || null,
          unread_count: storedConversation.unread_count || 0,
          other_participants: storedConversation.other_participants || storedConversation.participants?.filter((p: any) => p.user_id !== user?.id) || []
        };
        
        // Only return if has proper participant data
        if (conversation.other_participants && conversation.other_participants.length > 0) {
          return conversation;
        }
      }
      return null;
    };
    
    // Primary: Use activeLegacyConversation from store if available
    if (activeLegacyConversation && activeLegacyConversation.other_participants && activeLegacyConversation.other_participants.length > 0) {
      cachedConversationRef.current = activeLegacyConversation;
      return activeLegacyConversation;
    }
    
    // ✅ CRITICAL FIX: If activeConversationId is null but we have initialConversationId,
    // try to get conversation from store by ID (store might have conversations but activeConversationId not set yet)
    if (initialConversationId) {
      // ✅ FIX: Search legacyConversations directly instead of using function reference
      // This avoids including function in dependency array
      const conversation = legacyConversations.find(c => c.conversation_id === initialConversationId);
      if (conversation && conversation.other_participants && conversation.other_participants.length > 0) {
        log.debug('Component', '🗨️ [ChatContainer] Using conversation from store by initialConversationId:', initialConversationId);
        cachedConversationRef.current = conversation;
        return conversation;
      }
      
      // Fallback: Try to get from localStorage directly (persistence hasn't rehydrated)
      const storedConversation = getConversationFromStorage(initialConversationId);
      if (storedConversation) {
        log.debug('Component', '🗨️ [ChatContainer] Using conversation from localStorage:', initialConversationId);
        cachedConversationRef.current = storedConversation;
        return storedConversation;
      }
    }
    
    // Fallback: If activeConversationId exists but no conversation found, try storage
    if (activeConversationId) {
      // ✅ FIX: Search legacyConversations directly instead of using function reference
      const conversation = legacyConversations.find(c => c.conversation_id === activeConversationId);
      if (conversation && conversation.other_participants && conversation.other_participants.length > 0) {
        log.debug('Component', '🗨️ [ChatContainer] Using conversation from store by activeConversationId:', activeConversationId);
        cachedConversationRef.current = conversation;
        return conversation;
      }
      
      const storedConversation = getConversationFromStorage(activeConversationId);
      if (storedConversation) {
        log.debug('Component', '🗨️ [ChatContainer] Using conversation from localStorage (activeConversationId):', activeConversationId);
        cachedConversationRef.current = storedConversation;
        return storedConversation;
      }
    }
    
    // ✅ CRITICAL FIX: Return cached conversation if available (prevents unmounting during rehydration)
    // This ensures ChatView stays mounted even when store temporarily resets
    if (cachedConversationRef.current && 
        cachedConversationRef.current.conversation_id === initialConversationId &&
        cachedConversationRef.current.other_participants && 
        cachedConversationRef.current.other_participants.length > 0) {
      log.debug('Component', '🗨️ [ChatContainer] Using cached conversation during rehydration:', cachedConversationRef.current.conversation_id);
      return cachedConversationRef.current;
    }
    
    return null;
  }, [activeLegacyConversation, initialConversationId, activeConversationId, legacyConversations, user?.id]);

  // DEBUG: Log conversation selection
  log.debug('Component', '🗨️ [ChatContainer] Conversation selection:', {
    activeConversationId,
    allConversationIds: legacyConversations?.map(c => c.conversation_id) || [],
    selectedConversation: selectedConversation ? {
      id: selectedConversation.conversation_id,
      name: selectedConversation.conversation_name,
      participants: selectedConversation.other_participants?.length || 0
    } : null
  });

  const effectiveIsFullScreen = isModal ? isMobileDevice : true;

  // DEBUG: Log render decision
  log.debug('Component', '🗨️ [ChatContainer] Render decision:', {
    view,
    showList: view === 'list',
    showChat: view === 'chat' && !!selectedConversation,
    showNew: view === 'new',
    hasSelectedConversation: !!selectedConversation
  });

  return (
    <>
      {/* ✅ SAFARI FIX: For non-modals, show fullscreen list */}
      {view === 'list' && !isModal && (
        <>
          <ChatListUnified
            variant="fullscreen"
            onConversationSelect={handleSelectConversation}
            currentUserId={user?.id}
            onStartNewChat={() => setView('new')}
            onMobileMenuClick={isMobileDevice ? () => setDrawerOpen(true) : undefined}
            enableUrlNavigation={true}
            showSearch={true}
            showFilters={true}
            showMarkAllRead={true}
          />
          {isMobileDevice && (
            <MobileSpaceDrawer
              isOpen={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              currentSpaceSubdomain={space?.subdomain || ''}
              userId={user?.id || ''}
            />
          )}
        </>
      )}
      {/* ✅ CRITICAL FIX: Only show chat view if we have selectedConversation with proper participant data
           This prevents UI flashes from missing participant data */}
      {view === 'chat' && selectedConversation && (
        <ChatView
          conversation={selectedConversation}
          onBack={handleBack}
          onClose={isModal ? onClose : undefined}
          onExpand={onExpand}
          isExpanded={isExpanded}
          isFullScreen={effectiveIsFullScreen}
          isModal={isModal}
          onConversationUpdated={fetchConversations}
        />
      )}
      {view === 'new' && (
        <StartNewChatView onBack={handleBack} onConversationCreated={(id) => {
          selectConversation(id);
          setView('chat');
        }} />
      )}
    </>
  );
} 