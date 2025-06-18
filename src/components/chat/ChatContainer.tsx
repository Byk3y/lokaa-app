import React, { useState, useEffect } from 'react';
import { useChat } from '@/features/chat';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import ChatView from '@/components/chat/ChatView';
import ChatList from '@/components/chat/ChatList';
import StartNewChatView from '@/components/chat/StartNewChatView';
import { transformConversationToLegacy, type LegacyConversation } from '@/features/chat/types';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import MobileSpaceDrawer from '@/components/mobile/MobileSpaceDrawer';
import { useSpace } from '@/hooks/useSpace';

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
  const { conversations, fetchConversations, activeConversationId, setActiveConversationId, getConversationById } = useChat();
  const isMobile = useMediaQuery("(max-width: 640px)");
  
  const [view, setView] = useState<'list' | 'chat' | 'new'>('list');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // DEBUG: Log container state
  console.log('🗨️ [ChatContainer] Rendered with state:', {
    initialConversationId,
    isModal,
    view,
    activeConversationId,
    conversationsLength: conversations?.length || 0,
    userId: user?.id
  });

  useEffect(() => {
    console.log('🗨️ [ChatContainer] UseEffect - fetchConversations and setup:', {
      initialConversationId,
      willFetchConversations: true,
      willSetView: initialConversationId ? 'chat' : 'list'
    });
    
    fetchConversations();
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
      setView('chat');
    } else {
      setView('list');
    }
  }, [initialConversationId, fetchConversations, setActiveConversationId]);

  const handleSelectConversation = (conversation: LegacyConversation) => {
    setActiveConversationId(conversation.conversation_id);
    setView('chat');
  };
  
  const handleBack = () => {
    setView('list');
    setActiveConversationId(null);
  };
  
  const selectedConversation = activeConversationId ? getConversationById(activeConversationId) : null;
  const legacySelectedConversation = selectedConversation ? transformConversationToLegacy(selectedConversation, user?.id) : null;
  const legacyConversations = (conversations || []).map(conv => transformConversationToLegacy(conv, user?.id));

  // DEBUG: Log conversation selection
  console.log('🗨️ [ChatContainer] Conversation selection:', {
    activeConversationId,
    allConversationIds: conversations?.map(c => c.conversation_id) || [],
    selectedConversation: selectedConversation ? {
      id: selectedConversation.conversation_id,
      name: selectedConversation.name,
      participants: selectedConversation.participants?.length || 0
    } : null,
    legacySelectedConversation: legacySelectedConversation ? {
      id: legacySelectedConversation.conversation_id,
      name: legacySelectedConversation.conversation_name,
      participants: legacySelectedConversation.other_participants?.length || 0
    } : null,
    getConversationByIdFunction: !!getConversationById
  });

  const effectiveIsFullScreen = isModal ? isMobile : true;

  // DEBUG: Log render decision
  console.log('🗨️ [ChatContainer] Render decision:', {
    view,
    showList: view === 'list',
    showChat: view === 'chat' && !!legacySelectedConversation,
    showNew: view === 'new',
    hasLegacyConversation: !!legacySelectedConversation
  });

  return (
    <>
      {view === 'list' && (
        <>
          <ChatList
            conversations={legacyConversations}
            onSelectConversation={handleSelectConversation}
            currentUserId={user?.id}
            onStartNewChat={() => setView('new')}
            onMobileMenuClick={isMobile ? () => setDrawerOpen(true) : undefined}
          />
          {isMobile && (
            <MobileSpaceDrawer
              isOpen={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              currentSpaceSubdomain={spaceData?.subdomain || ''}
              userId={user?.id || ''}
            />
          )}
        </>
      )}
      {view === 'chat' && legacySelectedConversation && (
        (() => {
          console.log('🗨️ [ChatContainer] Rendering ChatView with conversation:', legacySelectedConversation);
          return (
        <ChatView
          conversation={legacySelectedConversation}
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
          setActiveConversationId(id);
          setView('chat');
        }} />
      )}
    </>
  );
} 