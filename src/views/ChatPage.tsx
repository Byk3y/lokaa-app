import { log } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ChatContainer from '@/components/chat/ChatContainer';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useConversations } from '@/features/chat';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';
import { 
  parseConversationUrlParams, 
  findConversationIdFromSlug
} from '@/utils/conversationUrlUtils';
import {
  wasConversationExplicitlyCleared,
  resetExplicitClearing
} from '@/utils/conversationClearingTracker';

export default function ChatPage() {
  const location = useLocation();
  const { user } = useOptimizedAuth();
  const { space, loadActiveSpace } = useSpaceSettingsStore();
  const { legacyConversations: conversations } = useConversations();
  const isMobile = shouldEnableMobileFeatures();
  const [resolvedConversationId, setResolvedConversationId] = useState<string | undefined>();

  // Handle URL parameter parsing with new conversation URL system
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    
    if (isMobile) {
      // Mobile: Use new conversation URL system with 'ch' parameter
      const { slug, conversationId: cachedId } = parseConversationUrlParams();
      
      if (slug) {
        let resolvedId: string | null = null;
        
        if (cachedId) {
          // Found in cache immediately
          resolvedId = cachedId;
        } else if (conversations.length > 0) {
          // Try reverse lookup with available conversations
          resolvedId = findConversationIdFromSlug(slug, conversations);
        }
        
        // ✅ CONVERSATION PERSISTENCE FIX: Check if this conversation was explicitly cleared
        if (resolvedId && wasConversationExplicitlyCleared(resolvedId)) {
          log.debug('Page', '📱 [ChatPage] Mobile: Conversation in URL was explicitly cleared, ignoring:', resolvedId);
          setResolvedConversationId(undefined);
          return;
        }
        
        if (resolvedId) {
          if (cachedId) {
            log.debug('Page', '📱 [ChatPage] Mobile: Using cached conversation ID:', cachedId);
          } else {
            log.debug('Page', '📱 [ChatPage] Mobile: Found conversation via reverse lookup:', resolvedId);
          }
          setResolvedConversationId(resolvedId);
        } else if (conversations.length > 0) {
          // Conversations loaded but not found
          log.warn('Page', '📱 [ChatPage] Mobile: Conversation not found for slug:', slug);
          setResolvedConversationId(undefined);
        } else {
          // Conversations not loaded yet, wait for them
          log.debug('Page', '📱 [ChatPage] Mobile: Waiting for conversations to load for slug:', slug);
          setResolvedConversationId(undefined);
        }
      } else {
        // No conversation in URL
        setResolvedConversationId(undefined);
      }
    } else {
      // Desktop: Fall back to legacy 'id' parameter for compatibility
      const legacyId = searchParams.get('id');
      
      // ✅ CONVERSATION PERSISTENCE FIX: Check if this conversation was explicitly cleared
      if (legacyId && wasConversationExplicitlyCleared(legacyId)) {
        log.debug('Page', '🖥️ [ChatPage] Desktop: Conversation in URL was explicitly cleared, ignoring:', legacyId);
        setResolvedConversationId(undefined);
        return;
      }
      
      log.debug('Page', '🖥️ [ChatPage] Desktop: Using legacy ID parameter:', legacyId);
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
          // ✅ CONVERSATION PERSISTENCE FIX: Check if this conversation was explicitly cleared
          if (wasConversationExplicitlyCleared(foundId)) {
            log.debug('Page', '📱 [ChatPage] Mobile: Retry found conversation but it was explicitly cleared, ignoring:', foundId);
            return;
          }
          
          log.debug('Page', '📱 [ChatPage] Mobile: Retry reverse lookup successful:', foundId);
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
        log.debug('Page', '🔄 Background space refresh while in chat');
        loadActiveSpace({ subdomain: space.subdomain }, user.id, true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user?.id, space?.subdomain, loadActiveSpace]);

  return (
    <div className={`h-full w-full bg-white flex flex-col ${isMobile ? 'mobile-chat-page' : ''}`}>
      <ChatContainer initialConversationId={resolvedConversationId} />
    </div>
  );
} 