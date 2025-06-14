import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useChat } from '@/features/chat';
import ChatModal from './ChatModal';
import ChatListPopover from './ChatListPopover';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { createManagedInterval } from '@/utils/pageVisibilityManager';
import { TopNavChatIcon } from '@/components/ui/nav-icons';

interface ChatButtonProps {
  variant?: 'icon' | 'textButton';
  className?: string; // Allow passing a className for the text button variant
  targetUserId?: string; // For potential future direct chat initiation
}

export default function ChatButton({ variant = 'icon', className, targetUserId }: ChatButtonProps) {
  const { user } = useOptimizedAuth();
  const { 
    getUnreadCount, 
    createConversation, 
    setActiveConversationId,
    conversations,
    lastMessageUpdate,
    fetchConversations,
    refreshConversations
  } = useChat();
  
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isPopoverOpenForIcon, setIsPopoverOpenForIcon] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoadingDirectChat, setIsLoadingDirectChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [manualRefreshTrigger, setManualRefreshTrigger] = useState(0);
  
  // Keep track of active subscription
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const lastUnreadUpdateRef = useRef<number>(0);
  
  // Setup direct subscription to message changes
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('[ChatButton] Setting up direct message subscription');
    
    // Clean up previous subscription if it exists
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    // Subscribe to all message changes to update unread count in real-time
    const channel = getSupabaseClient()
      .channel('chat-button-messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages'
      }, () => {
        console.log('[ChatButton] Message change detected, refreshing unread count');
        // Trigger refresh of unread count
        setManualRefreshTrigger(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_conversations'
      }, () => {
        console.log('[ChatButton] Conversation change detected, refreshing unread count');
        // Trigger refresh of unread count
        setManualRefreshTrigger(prev => prev + 1);
      })
      .subscribe();
    
    subscriptionRef.current = {
      unsubscribe: () => getSupabaseClient().removeChannel(channel)
    };
    
    return () => {
      console.log('[ChatButton] Cleaning up message subscription');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [user?.id]);
  
  // Update unread count when relevant data changes
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
    const count = getUnreadCount();
    
    // Only update and log if the count has actually changed
    if (unreadCount !== count) {
      console.log(`[ChatButton] Data change detected, recalculating unread count`);
      console.log(`[ChatButton] Updating unread count: ${unreadCount} -> ${count}`);
      lastUnreadUpdateRef.current = now;
      setUnreadCount(count);
    } else {
      // REDUCED LOGGING: Only log unchanged count occasionally to reduce noise
      if (Math.random() < 0.05) { // Only log 5% of unchanged count events
        console.log(`[ChatButton] Unread count unchanged: ${count}`);
      }
    }
  }, [conversations, lastMessageUpdate, manualRefreshTrigger, unreadCount]); // Include unreadCount to prevent unnecessary updates
  
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
  }, [user]);
  
  // Listen for custom event to open chat modal with conversation ID
  useEffect(() => {
    const handleOpenChatModal = (event: CustomEvent<{ conversationId: string }>) => {
      console.log(`[ChatButton] Received open-chat-modal event for conversation: ${event.detail.conversationId}`);
      setSelectedConversationId(event.detail.conversationId);
      setActiveConversationId(event.detail.conversationId);
      setIsChatModalOpen(true);
    };

    window.addEventListener('open-chat-modal', handleOpenChatModal as EventListener);
    
    return () => {
      window.removeEventListener('open-chat-modal', handleOpenChatModal as EventListener);
    };
  }, [setActiveConversationId]);
  
  const handlePopoverConversationSelect = (conversation: any) => {
    console.log(`[ChatButton] Selected conversation: ${conversation.conversation_id}`);
    setSelectedConversationId(conversation.conversation_id);
    setActiveConversationId(conversation.conversation_id);
    setIsChatModalOpen(true);
    setIsPopoverOpenForIcon(false); // Close popover when a chat is selected
  };
  
  const handleDirectChat = async () => {
    if (!user || !targetUserId || isLoadingDirectChat) return;

    setIsLoadingDirectChat(true);
    try {
      // Use the createConversation method from ChatContext
      const conversationId = await createConversation([targetUserId], false);

      if (conversationId) {
        setSelectedConversationId(conversationId);
        setActiveConversationId(conversationId);
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
    setActiveConversationId(null);
    
    // Force refresh conversations after closing the modal to get updated unread counts
    refreshConversations();
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
            // Let ChatListPopover handle the fetching to avoid double-fetch
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
        <ChatListPopover 
          externalOpenState={isPopoverOpenForIcon}
          onPopoverManuallyClosed={handlePopoverManuallyClosedByList}
          triggerButton={triggerButtonContent} 
          onConversationSelect={handlePopoverConversationSelect} 
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