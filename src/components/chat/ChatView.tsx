import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  onConversationUpdated?: () => void;
}

export default function ChatView({ 
  conversation: initialConversation, 
  onBack,
  onClose,
  onExpand,
  isExpanded,
  isFullScreen = false,
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
  
  const [sending, setSending] = useState(false);
  const [currentConversation, setCurrentConversation] = useState(initialConversation);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  
  // ✅ LAYOUT SHIFT FIX: Early stable determination of connection context
  const [shouldShowConnectionContext, setShouldShowConnectionContext] = useState(() => {
    // Determine this immediately on first render to prevent layout shifts
    const isDirectConversation = !initialConversation.is_group;
    const hasOtherParticipant = isDirectConversation && initialConversation.other_participants?.length > 0;
    return hasOtherParticipant;
  });
  
  // ✅ SCROLL PRESERVATION: Refs for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeight = useRef<number>(0);
  const isInitialLoad = useRef<boolean>(true);
  const previousMessagesLength = useRef<number>(0);
  const connectionContextLoaded = useRef<boolean>(false);
  
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isMobile = useMediaQuery("(max-width: 640px)");
  
  // DEBUG: Log conversation data
  console.log('🗨️ [ChatView] Rendered with conversation:', {
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
  console.log('🗨️ [ChatView] Conversation context:', {
    isDirectConversation,
    otherParticipant: otherParticipant ? {
      userId: otherParticipant.user_id,
      fullName: otherParticipant.full_name
    } : null,
    shouldShowConnectionContext
  });

  // Mobile keyboard detection
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      // On mobile, when keyboard opens, the visual viewport height decreases
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.screen.height;
      
      // If viewport height is significantly smaller than screen height, keyboard is likely open
      const keyboardThreshold = windowHeight * 0.75;
      const keyboardIsOpen = viewportHeight < keyboardThreshold;
      
      setIsKeyboardOpen(keyboardIsOpen);
    };

    // Listen to visual viewport changes (better for keyboard detection)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobile]);

  // ✅ MOBILE INPUT FIX: Force layout recalculation when viewport changes
  useEffect(() => {
    if (!isMobile) return;

    const handleViewportChange = () => {
      // Force a small delay to let the viewport settle
      setTimeout(() => {
        console.log('🗨️ [ChatView] Viewport changed, recalculating layout');
        // This will trigger a re-render with updated container styles
      }, 100);
    };

    // Listen for viewport changes that might affect layout
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
        window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      };
    }
  }, [isMobile]); // ✅ INFINITE LOOP FIX: Removed isKeyboardOpen to prevent loops

  useEffect(() => {
    setCurrentConversation(initialConversation);
    
    // ✅ LAYOUT SHIFT FIX: Update connection context visibility only if it changes significantly
    const newIsDirectConversation = !initialConversation.is_group;
    const newHasOtherParticipant = newIsDirectConversation && initialConversation.other_participants?.length > 0;
    
    // Only update if this represents a significant change (prevent late loading issues)
    if (newHasOtherParticipant !== shouldShowConnectionContext && initialConversation.other_participants?.length > 0) {
      console.log('🗨️ [ChatView] 🔄 Connection context visibility updated:', newHasOtherParticipant);
      setShouldShowConnectionContext(newHasOtherParticipant);
    }
  }, [initialConversation, shouldShowConnectionContext]);

  // ✅ FIXED: Auto-refresh messages when conversation changes
  useEffect(() => {
    if (currentConversation?.conversation_id) {
      console.log('🗨️ [ChatView] Conversation changed, refreshing messages for:', currentConversation.conversation_id);
      
      // ✅ CRITICAL FIX: Reset flags for new conversation
      isInitialLoad.current = true;
      connectionContextLoaded.current = false;
      previousMessagesLength.current = 0;
      
      refreshMessages();
      
      // ✅ Mark conversation as read when sender opens it
      if (user?.id) {
        // Use the markAsRead from useMessages hook
        import('@/features/chat/store/messageStore').then(({ useMessageStore }) => {
          useMessageStore.getState().markAsRead(currentConversation.conversation_id);
          console.log('🗨️ [ChatView] ✅ Marked conversation as read for current user');
        }).catch(error => {
          console.warn('🗨️ [ChatView] ⚠️ Failed to mark as read:', error);
        });
      }
    }
  }, [currentConversation?.conversation_id, user?.id]); // ✅ INFINITE LOOP FIX: Removed refreshMessages from dependencies

  // ✅ SCROLL PRESERVATION: Enhanced scroll management - No visible scrolling on initial load
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const currentScrollHeight = container.scrollHeight;
    const currentScrollTop = container.scrollTop;
    const currentMessagesLength = messages.length;
    
    // ✅ CRITICAL FIX: Handle initial load vs new messages vs layout changes differently
    if (isInitialLoad.current) {
      // Initial load: Position at bottom instantly without animation
      if (messages.length > 0) {
        // Use multiple timing approaches to ensure positioning works
        const scrollToBottom = () => {
          if (container && messagesEndRef.current) {
            // Method 1: Direct scroll to very bottom
            container.scrollTop = container.scrollHeight - container.clientHeight;
            
            // Method 2: Also use scrollIntoView without animation as backup
            messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
            
            isInitialLoad.current = false;
            previousMessagesLength.current = currentMessagesLength;
            console.log('🗨️ [ChatView] Initial load: Positioned at bottom instantly', {
              scrollTop: container.scrollTop,
              scrollHeight: container.scrollHeight,
              clientHeight: container.clientHeight
            });
          }
        };
        
        // Try immediately
        scrollToBottom();
        
        // Also try after a brief delay to ensure DOM is fully rendered
        setTimeout(scrollToBottom, 10);
        
        // Final attempt after ConnectionContext might load
        setTimeout(scrollToBottom, 50);
      }
    } else {
      // ✅ CRITICAL FIX: Distinguish between new messages vs ConnectionContext loading
      const hasNewMessages = currentMessagesLength > previousMessagesLength.current;
      const isConnectionContextChange = otherParticipant && !connectionContextLoaded.current;
      
      if (isConnectionContextChange) {
        // ConnectionContext loaded - this is a layout change, not a new message
        connectionContextLoaded.current = true;
        console.log('🗨️ [ChatView] ConnectionContext loaded: Re-positioning to bottom');
        
        // ✅ CRITICAL FIX: When ConnectionContext loads, scroll to bottom to show last message
        const scrollToBottomAfterContext = () => {
          if (container && messagesEndRef.current) {
            // Scroll to very bottom to ensure last message is visible
            container.scrollTop = container.scrollHeight - container.clientHeight;
            messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
            console.log('🗨️ [ChatView] ConnectionContext: Repositioned to bottom', {
              scrollTop: container.scrollTop,
              scrollHeight: container.scrollHeight,
              clientHeight: container.clientHeight
            });
          }
        };
        
        // Try immediately and with delays to ensure it works
        scrollToBottomAfterContext();
        setTimeout(scrollToBottomAfterContext, 10);
        setTimeout(scrollToBottomAfterContext, 50);
      } else if (hasNewMessages && currentScrollHeight > previousScrollHeight.current) {
        // Genuine new messages: Only smooth scroll when user was near bottom
        const wasNearBottom = (previousScrollHeight.current - currentScrollTop - container.clientHeight) < 100;
        
        if (wasNearBottom) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            console.log('🗨️ [ChatView] New message: Smooth scroll to bottom');
          }, 10);
        }
        
        previousMessagesLength.current = currentMessagesLength;
      }
    }
    
    previousScrollHeight.current = currentScrollHeight;
  }, [messages, shouldShowConnectionContext, otherParticipant]);
  
  const handleSendMessage = async (content: string) => {
    if (!user || !currentConversation?.conversation_id) return;
    setSending(true);
    try {
      await sendMessage(content);
      
      if (onConversationUpdated) {
        onConversationUpdated();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  // ✅ MOBILE INPUT FIX: Improved mobile layout calculations (optimized to prevent infinite loops)
  const getMobileContainerStyle = () => {
    if (!isMobile) {
      return {
        height: '100%',
        maxHeight: 'none'
      };
    }

    // Mobile-specific calculations
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const bottomNavHeight = 64; // 16 * 4 = 64px (h-16 from BottomNav)
    
    // Get safe area from CSS custom properties (more reliable)
    const safeAreaBottom = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')?.replace('px', '') || '0'
    );
    
    if (isKeyboardOpen) {
      // When keyboard is open, use full viewport height (no bottom nav visible)
      return {
        height: `${viewportHeight}px`,
        maxHeight: `${viewportHeight}px`,
        minHeight: `${viewportHeight}px`
      };
    } else {
      // When keyboard is closed, account for bottom nav + safe area
      const availableHeight = viewportHeight - bottomNavHeight - safeAreaBottom;
      return {
        height: `${availableHeight}px`,
        maxHeight: `${availableHeight}px`,
        minHeight: `${availableHeight}px`
      };
    }
  };

  // Dynamic padding - simplified since height calculation now handles spacing
  const getContainerPadding = () => {
    if (isDesktop) return 'pb-0'; // No bottom nav on desktop
    // For mobile, padding is handled by height calculation
    return 'pb-0';
  };

  return (
    <div 
      className={`flex flex-col bg-white dark:bg-gray-800 ${getContainerPadding()} ${
        isMobile ? `mobile-chat-view ${isKeyboardOpen ? 'keyboard-open' : ''}` : ''
      }`}
      style={getMobileContainerStyle()}
    >
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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
          isMobile ? 'mobile-chat-messages' : ''
        }`}
      >
        {/* ✅ LAYOUT SHIFT FIX: Stable ConnectionContext rendering with reserved space */}
        {shouldShowConnectionContext ? (
          otherParticipant ? (
            <ConnectionContext 
              otherUserId={otherParticipant.user_id}
              otherUserName={otherParticipant.full_name || 'User'}
              otherUserAvatar={otherParticipant.avatar_url}
            />
          ) : (
            // ✅ RESERVED SPACE: Placeholder to prevent layout shift while loading participant data
            <div className="connection-context-placeholder bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse">
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading connection info...</div>
            </div>
          )
        ) : null}
        
        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin h-6 w-6 border-t-2 border-blue-500 rounded-full"></div>
          </div>
        ) : (
          messages.map((msg) => (
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
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className={`border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${
        isMobile ? 'mobile-chat-input' : ''
      }`}>
        <ChatInput 
          onSendMessage={handleSendMessage}
          sending={sending}
          recipientName={currentConversation.other_participants?.[0]?.full_name || currentConversation.conversation_name || 'user'}
          disabled={loading}
        />
      </div>
    </div>
  );
} 