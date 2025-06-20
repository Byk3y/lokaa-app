import React, { useState, useEffect } from 'react';
import { useConversations, ChatListUnified } from '@/features/chat';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import ChatView from '@/components/chat/ChatView';
import StartNewChatView from '@/components/chat/StartNewChatView';
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
  const { spaceData } = useSpace();
  
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
  console.log('🗨️ [ChatContainer] Rendered with state:', {
    initialConversationId,
    isModal,
    view,
    activeConversationId,
    conversationsLength: legacyConversations?.length || 0,
    userId: user?.id
  });

  // Handle initial conversation ID and URL changes
  useEffect(() => {
    console.log('🗨️ [ChatContainer] UseEffect - setup:', {
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
        console.log('🗨️ [ChatContainer] Modal opened without conversation - should not show selector');
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
      console.log('📱 [ChatContainer] Browser back/forward detected');
      
      const { slug, conversationId: cachedId } = parseConversationUrlParams();
      
      if (slug) {
        // User navigated to a conversation URL
        let resolvedId = cachedId;
        
        if (!resolvedId && legacyConversations.length > 0) {
          resolvedId = findConversationIdFromSlug(slug, legacyConversations);
        }
        
        if (resolvedId) {
          console.log('📱 [ChatContainer] Browser navigation to conversation:', resolvedId);
          selectConversation(resolvedId);
          setView('chat');
        } else {
          console.warn('📱 [ChatContainer] Browser navigation: conversation not found for slug:', slug);
          setView('list');
          selectConversation(null);
        }
      } else {
        // User navigated back to conversation list
        console.log('📱 [ChatContainer] Browser navigation to conversation list');
        setView('list');
        selectConversation(null);
      }
    };

    // Listen for browser back/forward
    window.addEventListener('popstate', handlePopState);
    
    // Listen for custom URL change events (from navigateToConversation)
    const handleCustomUrlChange = (event: CustomEvent) => {
      const { conversationId } = event.detail;
      
      if (conversationId) {
        console.log('📱 [ChatContainer] Custom URL change to conversation:', conversationId);
        selectConversation(conversationId);
        setView('chat');
      } else {
        console.log('📱 [ChatContainer] Custom URL change to conversation list');
        setView('list');
        selectConversation(null);
      }
    };

    window.addEventListener('conversationUrlChange', handleCustomUrlChange as EventListener);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('conversationUrlChange', handleCustomUrlChange as EventListener);
    };
  }, [legacyConversations?.length, isModal, isMobileForUrls]); // ✅ INFINITE LOOP FIX: Only depend on conversation count, not the function

  const handleSelectConversation = (conversation: LegacyConversation) => {
    // This is called by ChatListItem for state consistency
    selectConversation(conversation.conversation_id);
    setView('chat');
  };
  
  const handleBack = () => {
    if (isMobileForUrls && !isModal) {
      // Mobile: Use URL navigation for browser history
      const success = navigateToConversationList();
      if (success) {
        console.log('📱 [ChatContainer] Mobile: Navigated to conversation list URL');
      }
      // The actual view change will happen via URL change listener
    } else {
      // Desktop or modal: Direct state management
      setView('list');
      selectConversation(null);
    }
  };
  
  // ✅ FIXED: Use consistent legacy conversation from new store
  const selectedConversation = activeLegacyConversation;

  // DEBUG: Log conversation selection
  console.log('🗨️ [ChatContainer] Conversation selection:', {
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
  console.log('🗨️ [ChatContainer] Render decision:', {
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
              currentSpaceSubdomain={spaceData?.subdomain || ''}
              userId={user?.id || ''}
            />
          )}
        </>
      )}
      {/* ✅ MODAL FIX: Removed redundant "Select a Conversation" modal view 
           Modals should always have a pre-selected conversation or close themselves */}
      {view === 'chat' && selectedConversation && (
        (() => {
          console.log('🗨️ [ChatContainer] Rendering ChatView with conversation:', selectedConversation);
          return (
        <ChatView
          conversation={selectedConversation}
          onBack={handleBack}
          onClose={isModal ? onClose : undefined}
          onExpand={onExpand}
          isExpanded={isExpanded}
          isFullScreen={effectiveIsFullScreen}
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