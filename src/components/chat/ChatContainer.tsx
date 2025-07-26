import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
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
    selectConversation,
    getLegacyConversationById
  } = useConversations();
  
  const isMobileDevice = useMediaQuery("(max-width: 640px)");
  const isMobileForUrls = useMediaQuery("(max-width: 768px)");
  
  const [view, setView] = useState<'list' | 'chat' | 'new'>(() => {
    // ✅ FIX: Set initial state based on whether we have an initial conversation
    // This prevents the "Select a Conversation" flash when a conversation is pre-selected
    return initialConversationId ? 'chat' : 'list';
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // DEBUG: Log container state
  log.debug('Component', '🗨️ [ChatContainer] Rendered with state:', {
    initialConversationId,
    isModal,
    view,
    activeConversationId,
    conversationsLength: legacyConversations?.length || 0,
    userId: user?.id
  });

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

  // Handle initial conversation ID and URL changes
  useEffect(() => {
    log.debug('Component', '🗨️ [ChatContainer] UseEffect - setup:', {
      initialConversationId,
      willSetView: initialConversationId ? 'chat' : 'list'
    });
    
    // ✅ INFINITE LOOP FIX: Only depend on initialConversationId, not the function
    if (initialConversationId) {
      selectConversation(initialConversationId);
      setView('chat');
    } else {
      // Only show list view if no conversation is pre-selected AND not in modal
      // For modals without a pre-selected conversation, close the modal instead
      if (isModal) {
        log.debug('Component', '🗨️ [ChatContainer] Modal opened without conversation - should not show selector');
        onClose?.();
        return;
      }
      setView('list');
    }
  }, [initialConversationId, isModal]); // ✅ FIXED: Removed selectConversation and onClose from dependencies

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
  
  // ✅ FIXED: Use consistent legacy conversation from new store
  const selectedConversation = activeLegacyConversation;

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
      {/* ✅ MODAL FIX: Removed redundant "Select a Conversation" modal view 
           Modals should always have a pre-selected conversation or close themselves */}
      {view === 'chat' && selectedConversation && (
        (() => {
          log.debug('Component', '🗨️ [ChatContainer] Rendering ChatView with conversation:', selectedConversation);
          return (
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
          );
        })()
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