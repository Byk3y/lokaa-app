import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ChatContainer from '@/components/chat/ChatContainer';
import BottomNav from '@/components/mobile/BottomNav';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export default function ChatPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const conversationIdFromUrl = searchParams.get('id');
  const { user } = useOptimizedAuth();
  const { space, loadActiveSpace } = useSpaceSettingsStore();

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
        <ChatContainer initialConversationId={conversationIdFromUrl || undefined} />
      </div>
      <BottomNav />
    </div>
  );
} 