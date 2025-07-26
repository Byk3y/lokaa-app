import { log } from '@/utils/logger';
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
  isModal = false,
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


  
  const isDesktop = useMediaQuery("(min-width: 768px)");
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

  // ✅ MODERN 2025 CHAT LAYOUT: Prevent any scroll repositioning
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // ✅ CRITICAL: Immediately scroll to bottom on mount with no animation
    const scrollToBottomImmediately = () => {
      if (container && messagesEndRef.current) {
        // Use 'auto' behavior for immediate positioning without animation
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'auto', 
          block: 'end',
          inline: 'nearest'
        });
        
        console.log('🔍 [ChatView] Initial scroll to bottom completed:', {
          scrollTop: container.scrollTop,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight
        });
      }
    };

    // ✅ IMMEDIATE: No delay, scroll right away
    scrollToBottomImmediately();
    
    // ✅ FALLBACK: Also scroll after a micro-delay to ensure DOM is stable
    const timeoutId = setTimeout(scrollToBottomImmediately, 10);
    
    return () => clearTimeout(timeoutId);
  }, []); // Only run on mount

  // ✅ MODERN APPROACH: Handle message changes without aggressive scrolling
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !messages.length) return;

    const currentScrollHeight = container.scrollHeight;
    const currentScrollTop = container.scrollTop;
    const currentClientHeight = container.clientHeight;
    
    // ✅ CALCULATE: Are we near the bottom?
    const isNearBottom = (currentScrollHeight - currentScrollTop - currentClientHeight) < 100;
    
    // ✅ ONLY SCROLL: If user was already near the bottom (they want to see new messages)
    if (isNearBottom) {
      const scrollToBottom = () => {
        if (container && messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end',
            inline: 'nearest'
          });
        }
      };
      
      // ✅ MINIMAL DELAY: Just enough for DOM to settle
      setTimeout(scrollToBottom, 50);
    }
  }, [messages.length]); // Only depend on message count, not content
  
  const handleSendMessage = async (content: string) => {
    if (!user || !currentConversation?.conversation_id) return;
    setSending(true);
    try {
      await sendMessage(content);
      
      if (onConversationUpdated) {
        onConversationUpdated();
      }
    } catch (error) {
      log.error('Component', "Error sending message:", error);
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
        style={isMobile ? { paddingBottom: '10rem' } : {}}
        data-chat-container="true"
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