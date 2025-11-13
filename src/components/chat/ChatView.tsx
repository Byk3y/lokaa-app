import { log } from '@/utils/logger';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useMessages } from '@/features/chat';
import type { LegacyConversation } from '@/features/chat/types';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import ConnectionContext from './ConnectionContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ChatViewProps {
  conversation: LegacyConversation;
  onBack?: () => void;
  onClose?: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
  isFullScreen?: boolean;
  isModal?: boolean;
  onConversationUpdated?: () => void;
}

export default function ChatView({ 
  conversation: initialConversation, 
  onBack,
  onClose,
  onExpand,
  isExpanded,
  isFullScreen = false,
  isModal: _isModal = false,
  onConversationUpdated
}: ChatViewProps) {
  const { user } = useOptimizedAuth();
  
  // ✅ CRITICAL FIX: Use new message store system instead of old useChat
  const { 
    messages,
    isLoading,
    sendMessage,
    refreshMessages
  } = useMessages(initialConversation.conversation_id);
  
  // ✅ CRITICAL FIX: Check localStorage for cached messages before showing spinner
  // This prevents showing spinner when messages exist but haven't rehydrated yet
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  const [cachedMessages, setCachedMessages] = useState<any[]>([]);
  
  useEffect(() => {
    // Check localStorage immediately for cached messages
    if (!hasCheckedStorage && initialConversation.conversation_id) {
      import('@/utils/chatPersistenceRecovery').then(({ getMessagesFromStorage }) => {
        const storedMessages = getMessagesFromStorage(initialConversation.conversation_id);
        if (storedMessages.length > 0) {
          log.debug('Component', '🗨️ [ChatView] Found cached messages in storage:', storedMessages.length);
          setCachedMessages(storedMessages);
        }
        setHasCheckedStorage(true);
      });
    }
  }, [hasCheckedStorage, initialConversation.conversation_id]);
  
  // ✅ CRITICAL FIX: Clear cached messages when store messages become available
  // This ensures we use store messages (which are reactive) once they're loaded
  useEffect(() => {
    if (messages.length > 0 && cachedMessages.length > 0) {
      log.debug('Component', '🗨️ [ChatView] Store messages loaded, clearing cached messages');
      setCachedMessages([]);
    }
  }, [messages.length, cachedMessages.length]);
  
  // Use cached messages if store messages are empty but we have cached ones
  const displayMessages = messages.length > 0 ? messages : (cachedMessages.length > 0 ? cachedMessages : []);
  const shouldShowLoading = isLoading && messages.length === 0 && cachedMessages.length === 0;
  
  const [sending, setSending] = useState(false);
  const [currentConversation, setCurrentConversation] = useState(initialConversation);
  
  // ✅ LAYOUT SHIFT FIX: Early stable determination of connection context
  const [shouldShowConnectionContext, setShouldShowConnectionContext] = useState(() => {
    // Determine this immediately on first render to prevent layout shifts
    const isDirectConversation = !initialConversation.is_group;
    const hasOtherParticipant = isDirectConversation && initialConversation.other_participants?.length > 0;
    return hasOtherParticipant;
  });
  
  // ✅ CRITICAL FIX: Track ConnectionContext loading state to prevent layout shift
  const [isConnectionContextLoading, setIsConnectionContextLoading] = useState(() => {
    // If we should show connection context, assume it's loading initially
    const isDirectConversation = !initialConversation.is_group;
    const hasOtherParticipant = isDirectConversation && initialConversation.other_participants?.length > 0;
    return hasOtherParticipant;
  });
  
  // ✅ SCROLL PRESERVATION: Refs for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef<boolean>(true);
  const previousMessagesLength = useRef<number>(0);
  const connectionContextLoaded = useRef<boolean>(false);
  const hasScrolledToBottom = useRef<boolean>(false);
  
  // ✅ CRITICAL FIX: Handle ConnectionContext loading state changes
  const handleConnectionContextLoadingChange = useCallback((isLoading: boolean) => {
    log.debug('Component', '🗨️ [ChatView] ConnectionContext loading state changed:', isLoading);
    setIsConnectionContextLoading(isLoading);
  }, []);
  
  // ✅ DEBUG: Track container mounting and DOM changes
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      console.log('🔍 [ChatView] Container mounted:', {
        className: container.className,
        dataset: container.dataset,
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight
      });
      
      // ✅ DEBUG: Monitor DOM changes that might cause scroll repositioning
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            console.log('🔍 [ChatView] DOM mutation detected:', {
              type: mutation.type,
              target: mutation.target,
              addedNodes: mutation.addedNodes.length,
              removedNodes: mutation.removedNodes.length,
              attributeName: mutation.attributeName,
              containerScrollTop: container.scrollTop,
              containerScrollHeight: container.scrollHeight
            });
          }
        });
      });
      
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      
      return () => observer.disconnect();
    }
  }, []);


  
  const isMobile = useMediaQuery("(max-width: 640px)");
  
  // DEBUG: Log conversation data
  log.debug('Component', '🗨️ [ChatView] Rendered with conversation:', {
    conversationId: initialConversation?.conversation_id,
    conversationName: initialConversation?.conversation_name,
    isGroup: initialConversation?.is_group,
    otherParticipants: initialConversation?.other_participants?.length || 0,
    shouldShowConnectionContext,
    user: user?.id,
    hasUser: !!user
  });
  
  // ✅ FIXED: Messages and loading now come directly from the new store
  const loading = isLoading;
  
  // Get other participant info (after stable determination)
  const isDirectConversation = !currentConversation.is_group;
  const otherParticipant = isDirectConversation && currentConversation.other_participants?.[0];

  // DEBUG: Log conversation context
  log.debug('Component', '🗨️ [ChatView] Conversation context:', {
    isDirectConversation,
    otherParticipant: otherParticipant ? {
      userId: otherParticipant.user_id,
      fullName: otherParticipant.full_name
    } : null,
    shouldShowConnectionContext
  });

  // ✅ SKOOL-STYLE: Removed chatViewRef - no longer needed for keyboard detection

  useEffect(() => {
    setCurrentConversation(initialConversation);
    
    // ✅ LAYOUT SHIFT FIX: Update connection context visibility only if it changes significantly
    const newIsDirectConversation = !initialConversation.is_group;
    const newHasOtherParticipant = newIsDirectConversation && initialConversation.other_participants?.length > 0;
    
    // Only update if this represents a significant change (prevent late loading issues)
    if (newHasOtherParticipant !== shouldShowConnectionContext && initialConversation.other_participants?.length > 0) {
      log.debug('Component', '🗨️ [ChatView] 🔄 Connection context visibility updated:', newHasOtherParticipant);
      setShouldShowConnectionContext(newHasOtherParticipant);
    }
  }, [initialConversation, shouldShowConnectionContext]);

  // ✅ FIXED: Auto-refresh messages when conversation changes
  useEffect(() => {
    if (currentConversation?.conversation_id) {
      log.debug('Component', '🗨️ [ChatView] Conversation changed, refreshing messages for:', currentConversation.conversation_id);
      
      // ✅ CRITICAL FIX: Reset flags for new conversation
      isInitialLoad.current = true;
      connectionContextLoaded.current = false;
      previousMessagesLength.current = 0;
      hasScrolledToBottom.current = false;
      
      refreshMessages();
      
      // ✅ Mark conversation as read when sender opens it
      if (user?.id) {
        // Use the markAsRead from useMessages hook
        import('@/features/chat/store/messageStore').then(({ useMessageStore }) => {
          useMessageStore.getState().markAsRead(currentConversation.conversation_id);
          log.debug('Component', '🗨️ [ChatView] ✅ Marked conversation as read for current user');
        }).catch(error => {
          log.warn('Component', '🗨️ [ChatView] ⚠️ Failed to mark as read:', error);
        });
      }
    }
  }, [currentConversation?.conversation_id, user?.id]); // ✅ INFINITE LOOP FIX: Removed refreshMessages from dependencies

  // ✅ CRITICAL FIX: Ensure messages are fetched if empty on mount (handles persistence rehydration delay)
  useEffect(() => {
    if (!currentConversation?.conversation_id) return;
    
    // Small delay to allow persistence to rehydrate first
    const timeoutId = setTimeout(() => {
      // Access messages directly from store to avoid stale closure
      import('@/features/chat/store/messageStore').then(({ useMessageStore }) => {
        const store = useMessageStore.getState();
        const currentMessages = store.getMessages(currentConversation.conversation_id);
        const isLoading = store.loadingMessages[currentConversation.conversation_id] || false;
        
        if (currentMessages.length === 0 && !isLoading) {
          log.debug('Component', '🗨️ [ChatView] Messages still empty after delay, fetching:', currentConversation.conversation_id);
          store.fetchMessages(currentConversation.conversation_id, { force: true });
        }
      });
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [currentConversation?.conversation_id]); // Only run when conversation changes

  // ✅ INSTANT BOTTOM POSITIONING: Pre-calculate and set scroll position before rendering
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // ✅ CRITICAL: Only position when messages are actually rendered
    // This means either no connection context needed, or connection context has finished loading
    const shouldPosition = !shouldShowConnectionContext || !isConnectionContextLoading;
    
    if (shouldPosition && displayMessages.length > 0) {
      // ✅ INSTANT BOTTOM: Pre-calculate total height needed for all messages
      const estimatedMessageHeight = 80; // Average height per message in pixels
      const connectionContextHeight = shouldShowConnectionContext ? 200 : 0; // Height of connection context
      const paddingHeight = 32; // Account for container padding (p-4 = 16px top + 16px bottom)
      const totalEstimatedHeight = (displayMessages.length * estimatedMessageHeight) + connectionContextHeight + paddingHeight;
      
      // ✅ INSTANT BOTTOM: Set container height and scroll position BEFORE rendering
      container.style.height = `${totalEstimatedHeight}px`;
      container.scrollTop = container.scrollHeight;
      
      // ✅ INSTANT BOTTOM: Force immediate positioning without any animation
      // Use multiple requestAnimationFrame calls to ensure positioning happens after DOM updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container) {
            // ✅ INSTANT BOTTOM: Force scroll to absolute bottom
            container.scrollTop = container.scrollHeight;
            
            // ✅ CRITICAL FIX: Mark that we've positioned to bottom
            hasScrolledToBottom.current = true;
            isInitialLoad.current = false;
            
            console.log('🔍 [ChatView] Instant bottom positioning completed:', {
              scrollTop: container.scrollTop,
              scrollHeight: container.scrollHeight,
              clientHeight: container.clientHeight,
              messageCount: displayMessages.length,
              estimatedHeight: totalEstimatedHeight
            });
          }
        });
      });
    }
  }, [shouldShowConnectionContext, isConnectionContextLoading, displayMessages.length]); // Depend on connection context loading state and displayMessages

  // ✅ INSTANT BOTTOM: Handle NEW messages with instant positioning (no animation)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !displayMessages.length) return;
    
    // ✅ CRITICAL FIX: Don't scroll if ConnectionContext is still loading
    if (shouldShowConnectionContext && isConnectionContextLoading) {
      log.debug('Component', '🗨️ [ChatView] Skipping scroll - ConnectionContext still loading');
      return;
    }
    
    // ✅ CRITICAL FIX: Don't scroll on initial load - Effect 1 handles that
    if (isInitialLoad.current || !hasScrolledToBottom.current) {
      log.debug('Component', '🗨️ [ChatView] Skipping scroll - Initial load handled by Effect 1');
      return;
    }
    
    // ✅ CRITICAL FIX: Only handle NEW messages, not initial load
    const currentMessageCount = displayMessages.length;
    const previousCount = previousMessagesLength.current;
    
    if (currentMessageCount <= previousCount) {
      log.debug('Component', '🗨️ [ChatView] Skipping scroll - No new messages', {
        current: currentMessageCount,
        previous: previousCount
      });
      return;
    }
    
    // Update previous count
    previousMessagesLength.current = currentMessageCount;

    const currentScrollHeight = container.scrollHeight;
    const currentScrollTop = container.scrollTop;
    const currentClientHeight = container.clientHeight;
    
    // ✅ CALCULATE: Are we near the bottom?
    const isNearBottom = (currentScrollHeight - currentScrollTop - currentClientHeight) < 100;
    
    // ✅ INSTANT BOTTOM: Only scroll if user was near bottom, and use instant positioning
    if (isNearBottom) {
      // ✅ INSTANT BOTTOM: Use immediate positioning, no animation
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'auto', // Changed from 'smooth' to 'auto' for instant positioning
          block: 'end',
          inline: 'nearest'
        });
      }
    }
  }, [displayMessages.length, shouldShowConnectionContext, isConnectionContextLoading]); // Use displayMessages for scroll tracking
  
  const handleSendMessage = async (content: string) => {
    if (!user || !currentConversation?.conversation_id) return;
    setSending(true);
    try {
      await sendMessage(content);
      
      if (onConversationUpdated) {
        onConversationUpdated();
      }
    } catch (error) {
      log.error('Component', "Error sending message:", error as Error);
    } finally {
      setSending(false);
    }
  };

  // ✅ SKOOL-STYLE: Simplified - no complex keyboard detection needed
  // Input overlay handles its own positioning

  return (
    <div 
      className={`flex flex-col bg-white dark:bg-gray-800 ${
        isMobile ? 'mobile-chat-view-simplified' : ''
      }`}
      style={isMobile ? { height: '100dvh' } : { height: '100%' }}
    >
      <div className={`${isMobile ? '' : 'sticky top-0'} z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700`}>
        <ChatHeader 
          conversation={currentConversation}
          onBack={onBack}
          onClose={onClose}
          onExpand={onExpand}
          isExpanded={isExpanded}
          showBackButton={isFullScreen}
          showCloseButton={!!onClose}
        />
      </div>
      
      <div 
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto p-4 space-y-4 chat-messages-container ${
          isMobile ? 'mobile-chat-messages-simplified' : ''
        }`}
        style={{
          ...(isMobile ? { paddingBottom: '10rem' } : {}),
          // ✅ INSTANT BOTTOM: Ensure smooth positioning without scroll interference
          scrollBehavior: 'auto'
        }}
        data-chat-container="true"
      >
        {/* ✅ LAYOUT SHIFT FIX: Stable ConnectionContext rendering with reserved space */}
        {shouldShowConnectionContext ? (
          otherParticipant ? (
            <ConnectionContext 
              otherUserId={otherParticipant.user_id}
              otherUserName={otherParticipant.full_name || 'User'}
              otherUserAvatar={otherParticipant.avatar_url}
              onLoadingStateChange={handleConnectionContextLoadingChange}
            />
          ) : (
            // ✅ RESERVED SPACE: Placeholder to prevent layout shift while loading participant data
            <div className="connection-context-placeholder bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse">
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading connection info...</div>
            </div>
          )
        ) : null}
        
        {/* ✅ CRITICAL FIX: Show cached messages immediately, only show spinner if truly no data */}
        {shouldShowLoading ? (
          // Only show spinner if we have NO cached messages AND we're loading
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin h-6 w-6 border-t-2 border-blue-500 rounded-full"></div>
          </div>
        ) : displayMessages.length > 0 ? (
          // Show messages (cached or from store) immediately
          displayMessages.map((msg) => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.sender_id === user?.id ? 'justify-end' : ''}`}>
              {msg.sender_id !== user?.id && (
                <img 
                  src={msg.sender?.avatar_url || '/default-avatar.png'} 
                  alt={msg.sender?.full_name || 'sender'} 
                  className="h-8 w-8 rounded-full"
                />
              )}
              <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                msg.sender_id === user?.id
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}>
                <p className="text-sm">{msg.content}</p>
                {msg._isOptimistic && (
                  <div className="text-xs opacity-60 mt-1">Sending...</div>
                )}
                {msg._failed && (
                  <div className="text-xs text-red-300 mt-1">Failed to send</div>
                )}
              </div>
            </div>
          ))
        ) : null}
        <div ref={messagesEndRef} />
      </div>
      
      {/* ✅ SKOOL-STYLE: Input overlay - only render wrapper on desktop, mobile input handles its own positioning */}
      {!isMobile && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <ChatInput 
            onSendMessage={handleSendMessage}
            sending={sending}
            recipientName={currentConversation.other_participants?.[0]?.full_name || currentConversation.conversation_name || 'user'}
            disabled={loading}
          />
        </div>
      )}
      
      {/* ✅ MOBILE: Input renders as overlay with fixed positioning */}
      {isMobile && (
        <ChatInput 
          onSendMessage={handleSendMessage}
          sending={sending}
          recipientName={currentConversation.other_participants?.[0]?.full_name || currentConversation.conversation_name || 'user'}
          disabled={loading}
        />
      )}
    </div>
  );
} 