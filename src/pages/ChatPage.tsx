import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ChatContainer from '@/components/chat/ChatContainer';
import BottomNav from '@/components/mobile/BottomNav';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useConversations } from '@/features/chat';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { 
  parseConversationUrlParams, 
  findConversationIdFromSlug
} from '@/utils/conversationUrlUtils';

export default function ChatPage() {
  const location = useLocation();
  const { user } = useOptimizedAuth();
  const { space, loadActiveSpace } = useSpaceSettingsStore();
  const { legacyConversations: conversations } = useConversations();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [resolvedConversationId, setResolvedConversationId] = useState<string | undefined>();

  // Handle URL parameter parsing with new conversation URL system
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    
    if (isMobile) {
      // Mobile: Use new conversation URL system with 'ch' parameter
      const { slug, conversationId: cachedId } = parseConversationUrlParams();
      
      if (slug) {
        if (cachedId) {
          // Found in cache immediately
          console.log('📱 [ChatPage] Mobile: Using cached conversation ID:', cachedId);
          setResolvedConversationId(cachedId);
        } else if (conversations.length > 0) {
          // Try reverse lookup with available conversations
          const foundId = findConversationIdFromSlug(slug, conversations);
          if (foundId) {
            console.log('📱 [ChatPage] Mobile: Found conversation via reverse lookup:', foundId);
            setResolvedConversationId(foundId);
          } else {
            console.warn('📱 [ChatPage] Mobile: Conversation not found for slug:', slug);
            setResolvedConversationId(undefined);
          }
        } else {
          // Conversations not loaded yet, wait for them
          console.log('📱 [ChatPage] Mobile: Waiting for conversations to load for slug:', slug);
          setResolvedConversationId(undefined);
        }
      } else {
        // No conversation in URL
        setResolvedConversationId(undefined);
      }
    } else {
      // Desktop: Fall back to legacy 'id' parameter for compatibility
      const legacyId = searchParams.get('id');
      console.log('🖥️ [ChatPage] Desktop: Using legacy ID parameter:', legacyId);
      setResolvedConversationId(legacyId || undefined);
    }
  }, [location.search, conversations, isMobile]);

  // Retry reverse lookup when conversations are loaded
  useEffect(() => {
    if (isMobile && conversations.length > 0 && !resolvedConversationId) {
      const { slug } = parseConversationUrlParams();
      if (slug) {
        const foundId = findConversationIdFromSlug(slug, conversations);
        if (foundId) {
          console.log('📱 [ChatPage] Mobile: Retry reverse lookup successful:', foundId);
          setResolvedConversationId(foundId);
        }
      }
    }
  }, [conversations, resolvedConversationId, isMobile]);

  // Intelligent preloading: refresh space data in background while user is chatting
  useEffect(() => {
    if (user?.id && space?.subdomain) {
      // Wait 2 seconds after page load, then refresh space data in background
      const timer = setTimeout(() => {
        console.log('🔄 Background space refresh while in chat');
        loadActiveSpace({ subdomain: space.subdomain }, user.id, true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user?.id, space?.subdomain, loadActiveSpace]);

  return (
    <div className="h-screen w-screen bg-white flex flex-col">
      <div className="flex-1 min-h-0">
        <ChatContainer initialConversationId={resolvedConversationId} />
      </div>
      <BottomNav />
    </div>
  );
} 