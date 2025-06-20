import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useConversations, ChatListUnified } from '@/features/chat';
import ChatModal from './ChatModal';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { createManagedInterval } from '@/utils/pageVisibilityManager';
import { TopNavChatIcon } from '@/components/ui/nav-icons';

interface ChatButtonProps {
  variant?: 'icon' | 'textButton';
  className?: string; // Allow passing a className for the text button variant
  targetUserId?: string; // For potential future direct chat initiation
}

export default function ChatButton({ variant = 'icon', className, targetUserId }: ChatButtonProps) {
  const { user } = useOptimizedAuth();
  
  // ✅ UPDATED: Use new conversation system instead of old useChat
  const { 
    unreadCount,
    createConversation,
    selectConversation,
    legacyConversations: conversations,
    fetchConversations,
    refreshConversations,
    startDirectConversation
  } = useConversations();
  
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isPopoverOpenForIcon, setIsPopoverOpenForIcon] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoadingDirectChat, setIsLoadingDirectChat] = useState(false);
  const [manualRefreshTrigger, setManualRefreshTrigger] = useState(0);
  
  // Keep track of last update to prevent excessive rerenders
  const lastUnreadUpdateRef = useRef<number>(0);
  
  // ✅ UPDATED: Real-time updates are now handled automatically by the new system
  // No need for manual Supabase subscriptions - the ConversationStore and RealtimeStore handle this
  
  // Update unread count when relevant data changes (but with debouncing)
  useEffect(() => {
    const now = Date.now();
    // Only update if it's been more than 2 seconds since last update to prevent infinite rerenders
    if (now - lastUnreadUpdateRef.current < 2000) {
      // REDUCED LOGGING: Only log throttling in debug mode
      if (Math.random() < 0.1) { // Only log 10% of throttled attempts
        console.log(`[ChatButton] Skipping unread count update due to debounce (${now - lastUnreadUpdateRef.current}ms ago)`);
      }
      return;
    }
    
    // REDUCED LOGGING: Only log when count actually changes
    if (unreadCount !== undefined) {
      console.log(`[ChatButton] Unread count updated: ${unreadCount}`);
      lastUnreadUpdateRef.current = now;
    }
  }, [conversations, unreadCount, manualRefreshTrigger]); // Simplified dependencies

  // Explicitly fetch conversations/unread count periodically
  useEffect(() => {
    if (!user) return;
    
    // Initial fetch when component mounts (no logging needed)
    fetchConversations();
    
    // Set up managed polling interval (every 60 seconds)
    const cleanup = createManagedInterval(
      `chat-polling-${user.id}`,
      () => {
        // REDUCED LOGGING: Only log periodic refresh occasionally
        if (Math.random() < 0.2) { // Only log 20% of periodic refreshes
          console.log('[ChatButton] Periodic refresh of conversations');
        }
        fetchConversations();
      },
      60000, // 60 seconds
      'polling'
    );
    
    return cleanup;
  }, [user, fetchConversations]);
  
  // Listen for custom event to open chat modal with conversation ID
  useEffect(() => {
    const handleOpenChatModal = (event: CustomEvent<{ conversationId: string }>) => {
      console.log(`[ChatButton] Received open-chat-modal event for conversation: ${event.detail.conversationId}`);
      setSelectedConversationId(event.detail.conversationId);
      selectConversation(event.detail.conversationId);
      setIsChatModalOpen(true);
    };

    window.addEventListener('open-chat-modal', handleOpenChatModal as EventListener);
    
    return () => {
      window.removeEventListener('open-chat-modal', handleOpenChatModal as EventListener);
    };
  }, [selectConversation]);
  
  const handlePopoverConversationSelect = (conversation: any) => {
    console.log(`[ChatButton] Selected conversation: ${conversation.conversation_id}`);
    
    // ✅ MODAL FIX: Safety check to ensure we have a valid conversation ID
    if (!conversation?.conversation_id) {
      console.error('[ChatButton] No conversation ID provided - cannot open modal');
      setIsPopoverOpenForIcon(false);
      return;
    }
    
    // ✅ CRITICAL FIX: Immediate state updates to prevent flicker
    // Set all states synchronously in the same render cycle
    setIsPopoverOpenForIcon(false);
    setSelectedConversationId(conversation.conversation_id);
    setIsChatModalOpen(true);
    
    // Then update conversation store
    selectConversation(conversation.conversation_id);
  };
  
  const handleDirectChat = async () => {
    if (!user || !targetUserId || isLoadingDirectChat) return;

    setIsLoadingDirectChat(true);
    try {
      // ✅ UPDATED: Use new startDirectConversation method
      const conversationId = await startDirectConversation(targetUserId);

      if (conversationId) {
        setSelectedConversationId(conversationId);
        selectConversation(conversationId);
        setIsChatModalOpen(true); 
      } else {
        toast({ title: "Error starting chat", description: "Could not find or create a conversation.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error('Error in handleDirectChat:', error);
      toast({ title: "Error", description: error.message || "Failed to start chat.", variant: "destructive" });
    } finally {
      setIsLoadingDirectChat(false);
    }
  };
  
  const handleCloseChatModal = () => {
    console.log('[ChatButton] Closing chat modal');
    setIsChatModalOpen(false);
    setSelectedConversationId(null);
    selectConversation(null);
    
    // Real-time subscriptions will handle conversation updates automatically
    // No need to force refresh here
  };
  
  const handlePopoverManuallyClosedByList = () => {
    setIsPopoverOpenForIcon(false);
  }
  
  // Prepare the button with correct UI
  let triggerButtonContent: React.ReactNode;

  if (variant === 'textButton') {
    triggerButtonContent = (
      <Button 
        variant="outline"
        size="sm"
        className={`flex-1 ${className || ''}`}
        onClick={handleDirectChat}
        disabled={isLoadingDirectChat}
      >
        <TopNavChatIcon className="h-4 w-4 mr-2" />
        {isLoadingDirectChat ? 'Starting Chat...' : 'Message'}
      </Button>
    );
  } else {
    // Icon button variant with unread count badge - clean style matching post cards
    triggerButtonContent = (
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 text-gray-500 ${className || ''}`}
          aria-label={`Messages${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          onClick={() => {
            console.log('[ChatButton] Icon clicked, toggling popover');
            setIsPopoverOpenForIcon(prev => !prev);
            // Let ChatListUnified handle the fetching to avoid double-fetch
          }}
        >
          <TopNavChatIcon className="h-7 w-7" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      {variant === 'icon' ? (
        <ChatListUnified 
          variant="popover"
          triggerButton={triggerButtonContent}
          isOpen={isPopoverOpenForIcon}
          onOpenChange={setIsPopoverOpenForIcon}
          onPopoverClose={handlePopoverManuallyClosedByList}
          onConversationSelect={handlePopoverConversationSelect}
          currentUserId={user?.id}
          enableUrlNavigation={false}
          showSearch={true}
          showFilters={false}
          showMarkAllRead={false}
        />
      ) : (
        triggerButtonContent // Render the direct chat button itself
      )}
      <ChatModal 
        isOpen={isChatModalOpen} 
        onClose={handleCloseChatModal} 
        initialConversationId={selectedConversationId || undefined}
      />
    </>
  );
} 