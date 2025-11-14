import { log } from '@/utils/logger';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
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
  
  // ✅ MOBILE FIX: Keep ref in sync with view state
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // ✅ CRITICAL FIX: Cache the last valid conversation to prevent unmounting during rehydration
  const cachedConversationRef = useRef<LegacyConversation | null>(null);
  const lastInitialConversationIdRef = useRef<string | undefined>(initialConversationId);
  // ✅ MOBILE FIX: Ref to detect if component is hidden (display: none)
  const containerRef = useRef<HTMLDivElement>(null);
  // ✅ MOBILE FIX: Ref to track current view to prevent effect from overwriting user actions
  const viewRef = useRef<'list' | 'chat' | 'new'>(view);
  // ✅ MOBILE FIX: Determine visibility based on route (more reliable than DOM checks)
  // ChatContainer is visible when on /app/chat route, hidden otherwise (unless modal)
  const isVisible = useMemo(() => {
    // Modals are always visible
    if (isModal) return true;
    
    // ✅ MOBILE FIX: Check route directly - more reliable than DOM inspection
    // ChatContainer is visible when pathname starts with /app/chat
    return location.pathname.startsWith('/app/chat');
  }, [isModal, location.pathname]);

  // Clear cache if initialConversationId changes
  useEffect(() => {
    if (lastInitialConversationIdRef.current !== initialConversationId) {
      if (initialConversationId !== cachedConversationRef.current?.conversation_id) {
        cachedConversationRef.current = null;
      }
      lastInitialConversationIdRef.current = initialConversationId;
    }
  }, [initialConversationId]);

  // DEBUG: Log container state (only when visible or in dev mode)
  if (isVisible || process.env.NODE_ENV === 'development') {
    log.debug('Component', '🗨️ [ChatContainer] Rendered with state:', {
      initialConversationId,
      isModal,
      view,
      activeConversationId,
      conversationsLength: legacyConversations?.length || 0,
      userId: user?.id,
      isVisible
    });
    console.log('🚨 [CHAT_CONTAINER] render', { view, activeConversationId, conversations: legacyConversations?.length || 0, isVisible });
  }

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
      currentView: viewRef.current,
      willSetView: initialConversationId ? 'chat' : 'list'
    });
    
    // ✅ MOBILE FIX: Don't override view if user explicitly navigated to list (handleBack)
    // Check ref to get current view value (not stale closure)
    // If user was on list view and URL doesn't have conversation ID, preserve list view
    if (viewRef.current === 'list' && !initialConversationId) {
      // User was on list view - only restore chat if there's a conversation ID in URL
      // Don't restore from store if user explicitly navigated back to list
      log.debug('Component', '🗨️ [ChatContainer] View already set to list by user action, skipping effect update');
      return;
    }
    
    // ✅ PRIMARY SOURCE: Use initialConversationId as source of truth
    if (initialConversationId) {
      // Always sync store with prop (even if store already has it)
      // This handles cases where store was cleared but prop still has value
      if (activeConversationId !== initialConversationId) {
        log.debug('Component', '🗨️ [ChatContainer] Syncing activeConversationId with initialConversationId:', initialConversationId);
        selectConversation(initialConversationId);
      }
      // ✅ MOBILE FIX: Only set view to chat if not already at list (prevent overwriting back button)
      if (viewRef.current !== 'list') {
        setView('chat');
      }
    } else {
      // No initialConversationId - check if we have activeConversationId from store
      if (activeConversationId) {
        // Store has a conversation, use it
        log.debug('Component', '🗨️ [ChatContainer] No initialConversationId but have activeConversationId, using store value');
        // ✅ MOBILE FIX: Only set view to chat if not already at list (prevent overwriting back button)
        if (viewRef.current !== 'list') {
          setView('chat');
        }
      } else {
        // No conversation anywhere - show list or close modal
        // ✅ MOBILE FIX: Only update view if we're visible or modal (prevent state updates when hidden)
        if (isVisible || isModal) {
          if (isModal) {
            log.debug('Component', '🗨️ [ChatContainer] Modal opened without conversation - closing');
            onClose?.();
            return;
          }
          // Only set to list if not already there (prevents unnecessary updates)
          if (viewRef.current !== 'list') {
            setView('list');
          }
        }
      }
    }
  }, [initialConversationId, activeConversationId, isModal, isVisible, selectConversation, onClose]); // ✅ MOBILE FIX: Removed view from dependencies to prevent infinite loops

  // Simplified visibility restoration - trust Zustand persistence
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden || viewRef.current === 'list') return; // Skip if hidden or on list

      // Only restore if we lost the active conversation (shouldn't happen with Zustand)
      if (!activeConversationId && initialConversationId) {
        log.debug('Component', '🗨️ [ChatContainer] Visibility change: Restoring from initialConversationId');
        selectConversation(initialConversationId);
        if (viewRef.current !== 'list') {
          setView('chat');
        }
      }
      // Zustand persistence handles the rest - no manual localStorage reads
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeConversationId, initialConversationId, selectConversation]);

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

  // ✅ MOBILE FIX: Clear pending flag when chat view is mounted (only when visible)
  useEffect(() => {
    // Skip this effect when hidden - not critical for functionality
    if (!isVisible && !isModal) return;
    
    if (view === 'chat' && activeConversationId) {
      // Clear the pending flag after a short delay to ensure chat is fully mounted
      const timeoutId = setTimeout(() => {
        setPendingChatNavigation(false);
        console.log('🔍 [ChatContainer] Cleared pending chat navigation - chat mounted');
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [view, activeConversationId, isVisible, isModal]);

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
      // Mobile: Update view immediately AND use URL navigation for browser history
      // ✅ MOBILE FIX: Update view directly to prevent race condition with conversation setup effect
      // The URL navigation provides browser history, but we need immediate UI feedback
      log.debug('Component', '📱 [ChatContainer] Mobile: Back button pressed - updating view immediately');
      setView('list');
      selectConversation(null);
      
      // Also update URL for browser history (but don't wait for it)
      const success = navigateToConversationList();
      if (success) {
        log.debug('Component', '📱 [ChatContainer] Mobile: Navigated to conversation list URL');
      }
    } else {
      // Desktop: Direct state management
      setView('list');
      selectConversation(null);
    }
  };
  
  // Simplified conversation selection - trust Zustand persistence
  const selectedConversation = useMemo(() => {
    // Skip expensive computation when hidden (not modal)
    if (!isVisible && !isModal) return null;

    // Primary: Use activeLegacyConversation from store (Zustand already rehydrated)
    if (activeLegacyConversation?.other_participants?.length > 0) {
      cachedConversationRef.current = activeLegacyConversation;
      return activeLegacyConversation;
    }

    // Secondary: Search by ID in legacyConversations (prefer initialConversationId)
    const targetId = initialConversationId || activeConversationId;
    if (targetId) {
      const conversation = legacyConversations.find(c => c.conversation_id === targetId);
      if (conversation?.other_participants?.length > 0) {
        cachedConversationRef.current = conversation;
        return conversation;
      }
    }

    // Tertiary: Return cached conversation only during brief rehydration window
    // This prevents flashing but trusts Zustand to rehydrate quickly
    if (cachedConversationRef.current?.conversation_id === targetId &&
        cachedConversationRef.current?.other_participants?.length > 0) {
      log.debug('Component', '🗨️ [ChatContainer] Using cached conversation briefly during rehydration');
      return cachedConversationRef.current;
    }

    // If we get here, Zustand hasn't rehydrated yet - return null and wait
    return null;
  }, [activeLegacyConversation, initialConversationId, activeConversationId, legacyConversations, isVisible, isModal]);

  // DEBUG: Log conversation selection (only when visible)
  if (isVisible || process.env.NODE_ENV === 'development') {
    log.debug('Component', '🗨️ [ChatContainer] Conversation selection:', {
      activeConversationId,
      allConversationIds: legacyConversations?.map(c => c.conversation_id) || [],
      selectedConversation: selectedConversation ? {
        id: selectedConversation.conversation_id,
        name: selectedConversation.conversation_name,
        participants: selectedConversation.other_participants?.length || 0
      } : null
    });
  }

  const effectiveIsFullScreen = isModal ? isMobileDevice : true;

  // DEBUG: Log render decision (only when visible)
  if (isVisible || process.env.NODE_ENV === 'development') {
    log.debug('Component', '🗨️ [ChatContainer] Render decision:', {
      view,
      showList: view === 'list',
      showChat: view === 'chat' && !!selectedConversation,
      showNew: view === 'new',
      hasSelectedConversation: !!selectedConversation,
      isVisible
    });
  }

  // ✅ MOBILE FIX: Early return when hidden - skip expensive JSX rendering
  // Hooks still run above (React rules), but we skip DOM work
  if (!isVisible && !isModal) {
    return <div ref={containerRef} style={{ display: 'none' }} />;
  }

  return (
    <div ref={containerRef}>
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
    </div>
  );
} 