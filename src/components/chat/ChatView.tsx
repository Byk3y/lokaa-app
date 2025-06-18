import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useChat } from '@/features/chat';
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
  const { 
    getMessagesForConversation,
    isLoadingMessages,
    fetchMessages, 
    sendMessage 
  } = useChat();
  
  const [sending, setSending] = useState(false);
  const [currentConversation, setCurrentConversation] = useState(initialConversation);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isMobile = useMediaQuery("(max-width: 640px)");
  
  // DEBUG: Log conversation data
  console.log('🗨️ [ChatView] Rendered with conversation:', {
    conversationId: initialConversation?.conversation_id,
    conversationName: initialConversation?.conversation_name,
    isGroup: initialConversation?.is_group,
    otherParticipants: initialConversation?.other_participants?.length || 0,
    user: user?.id,
    hasUser: !!user
  });
  
  // Get messages and loading state from the centralized store
  const messages = getMessagesForConversation(currentConversation.conversation_id);
  const loading = isLoadingMessages(currentConversation.conversation_id);
  
  // DEBUG: Log messages state
  console.log('🗨️ [ChatView] Messages state:', {
    conversationId: currentConversation.conversation_id,
    messagesCount: messages?.length || 0,
    loading,
    messages: messages
  });
  
  // Check if this is a direct conversation (not group) and get other participant info
  const isDirectConversation = !currentConversation.is_group;
  const otherParticipant = isDirectConversation && currentConversation.other_participants?.[0];
  const shouldShowConnectionContext = isDirectConversation && otherParticipant;

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

  useEffect(() => {
    setCurrentConversation(initialConversation);
  }, [initialConversation]);

  useEffect(() => {
    if (currentConversation?.conversation_id) {
      fetchMessages(currentConversation.conversation_id);
    }
  }, [currentConversation?.conversation_id, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (content: string) => {
    if (!user || !currentConversation?.conversation_id) return;
    setSending(true);
    try {
      await sendMessage(currentConversation.conversation_id, content);
      
      if (onConversationUpdated) {
        onConversationUpdated();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  // Dynamic padding based on keyboard state and screen size
  const getContainerPadding = () => {
    if (isDesktop) return 'pb-0'; // No bottom nav on desktop
    if (isKeyboardOpen) return 'pb-0'; // No bottom nav padding when keyboard is open
    return 'pb-16'; // Bottom nav padding when keyboard is closed
  };

  return (
    <div 
      className={`flex flex-col bg-white dark:bg-gray-800 ${getContainerPadding()}`}
      style={{
        height: isMobile && isKeyboardOpen ? '100vh' : '100%',
        maxHeight: isMobile ? '100vh' : 'none',
      }}
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
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Connection context as first item in messages for direct conversations */}
        {shouldShowConnectionContext && (
          <ConnectionContext 
            otherUserId={otherParticipant.user_id}
            otherUserName={otherParticipant.full_name || 'User'}
            otherUserAvatar={otherParticipant.avatar_url}
          />
        )}
        
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
      
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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