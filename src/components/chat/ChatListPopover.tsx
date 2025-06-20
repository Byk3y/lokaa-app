import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useConversations } from '@/features/chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageSquare, Search } from 'lucide-react';
import type { LegacyConversation } from '@/features/chat/types';
import { transformConversationToLegacy } from '@/features/chat/types';
import ChatListItem from './ChatListItem';

interface ChatListPopoverProps {
  triggerButton: React.ReactNode;
  onConversationSelect: (conversation: LegacyConversation) => void;
  externalOpenState?: boolean; // Controlled open state from parent
  onPopoverManuallyClosed?: () => void; // Callback when popover is closed by user action inside it
}

export default function ChatListPopover({
  triggerButton,
  onConversationSelect,
  externalOpenState,
  onPopoverManuallyClosed,
}: ChatListPopoverProps) {
  const { user } = useOptimizedAuth();
  const { legacyConversations: conversations, loading: loadingConversations, fetchConversations } = useConversations();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoverContentRef = useRef<HTMLDivElement>(null);

  // Use the conversations from the new hook (already transformed to legacy format)
  const legacyConversations = conversations || [];

  // Sync internal open state with external prop
  useEffect(() => {
    if (externalOpenState !== undefined) {
      setInternalIsOpen(externalOpenState);
    }
  }, [externalOpenState]);

  // Fetch conversations when popover opens
  useEffect(() => {
    if (internalIsOpen && user && !loadingConversations) {
      fetchConversations();
    }
  }, [internalIsOpen, user, fetchConversations, loadingConversations]);

  const handleOpenChange = (open: boolean) => {
    setInternalIsOpen(open);
    if (!open && onPopoverManuallyClosed) {
      onPopoverManuallyClosed(); // Notify parent if popover is closed
    }
  };

  const handleSelectAndClose = (conversationId: string) => {
    onConversationSelect(legacyConversations.find(conv => conv.conversation_id === conversationId) as LegacyConversation);
    handleOpenChange(false); // This will also call onPopoverManuallyClosed
  };

  const handleCloseButtonClick = () => {
    handleOpenChange(false); // Explicitly close and notify parent
  };

  const filteredConversations = legacyConversations.filter(conv => {
    if (!searchQuery) return true;
    const lowerSearchQuery = searchQuery.toLowerCase();
    const nameMatch = conv.conversation_name?.toLowerCase().includes(lowerSearchQuery);
    const participantsMatch = conv.other_participants.some(
      p => p.full_name?.toLowerCase().includes(lowerSearchQuery)
    );
    const messageMatch = conv.latest_message_content?.toLowerCase().includes(lowerSearchQuery);
    return nameMatch || participantsMatch || messageMatch;
  });
  
  return (
    <Popover open={internalIsOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent 
        ref={popoverContentRef}
        className="w-[380px] p-0 shadow-2xl rounded-2xl border border-gray-200 bg-white"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col h-[520px]">
          <div className="px-5 pt-5 pb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
            {/* Add filter dropdown if needed */}
          </div>
          <div className="px-5 pb-3">
            <div className="relative">
              <Input
                placeholder="Search users"
                className="w-full pl-10 h-10 text-base rounded-lg bg-gray-100 border border-gray-200 focus-visible:ring-teal-500 placeholder-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <ScrollArea className="flex-1 px-1 pb-2">
            {loadingConversations ? (
              <div className="p-8 flex justify-center items-center h-full">
                <div className="animate-spin h-6 w-6 border-t-2 border-blue-500 rounded-full"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-base h-full flex flex-col justify-center items-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
                <p className="font-medium">No chats found</p>
                <p className="text-sm">Try a different search or start a new conversation.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conv) => (
                  <ChatListItem
                    key={conv.conversation_id}
                    conversation={conv}
                    onSelect={() => handleSelectAndClose(conv.conversation_id)}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
} 