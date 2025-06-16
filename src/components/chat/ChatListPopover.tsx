import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useChat } from '@/features/chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { MessageSquare, Search, Users, X, CheckCheck, Star } from 'lucide-react';
import { getInitial } from '@/shared/utils/avatar-utils';
import { formatRelativeTimeShort, formatInTimezone } from '@/utils/formatters';
import type { LegacyConversation } from '@/features/chat/types';
import { transformConversationToLegacy } from '@/features/chat/types';
import { useTimezone } from '@/hooks/useTimezone';
import { isToday, isYesterday, isThisYear, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/features/chat/store/chat-store';
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
  const { conversations, loadingConversations, fetchConversations, lastMessageUpdate } = useChat();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoverContentRef = useRef<HTMLDivElement>(null);
  const { userTimezone } = useTimezone();
  const lastFetchRef = useRef<number>(0);

  // Transform conversations to legacy format
  const legacyConversations = (conversations || []).map(conv => transformConversationToLegacy(conv, user?.id));

  // Sync internal open state with external prop
  useEffect(() => {
    if (externalOpenState !== undefined) {
      setInternalIsOpen(externalOpenState);
    }
  }, [externalOpenState]);

  const handleOpenChange = (open: boolean) => {
    setInternalIsOpen(open);
    if (!open && onPopoverManuallyClosed) {
      onPopoverManuallyClosed(); // Notify parent if popover is closed
    }
  };

  // Memoized fetch function to prevent infinite rerenders
  const fetchConversationsIfNeeded = useCallback(() => {
    // Don't fetch if already loading
    if (loadingConversations) {
      console.log('[ChatListPopover] Skipping fetch - already loading');
      return;
    }
    
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;
    
    // Only fetch if:
    // 1. We have no conversations AND it's been more than 5 seconds since last fetch
    // 2. OR it's been more than 2 minutes since last fetch (much longer interval)
    const hasNoConversations = (conversations || []).length === 0;
    const shouldFetchEmpty = hasNoConversations && timeSinceLastFetch > 5000;
    const shouldFetchStale = timeSinceLastFetch > 120000; // 2 minutes instead of 30 seconds
    
    if (shouldFetchEmpty || shouldFetchStale) {
      console.log('[ChatListPopover] Fetching conversations', { 
        hasNoConversations, 
        timeSinceLastFetch, 
        reason: shouldFetchEmpty ? 'no-conversations' : 'stale-data' 
      });
      fetchConversations();
      lastFetchRef.current = now;
    } else {
      console.log('[ChatListPopover] Skipping fetch - too recent or conversations already loaded', {
        hasNoConversations,
        timeSinceLastFetch,
        conversationCount: (conversations || []).length
      });
    }
  }, [(conversations || []).length, fetchConversations, loadingConversations]);

  // Fetch conversations when popover opens (only if we don't have recent data)
  useEffect(() => {
    if (internalIsOpen && user && !loadingConversations) {
      fetchConversationsIfNeeded();
    }
  }, [internalIsOpen, user, fetchConversationsIfNeeded, loadingConversations]);

  // Remove the automatic refresh on lastMessageUpdate to prevent double-loading
  // The real-time subscriptions in the store will handle updates automatically

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
  
  // Smart time formatting for chat list
  const formatSmartChatListTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      if (isToday(date)) {
        return formatInTimezone(date, { hour: 'numeric', minute: 'numeric', hour12: true }, userTimezone).toLowerCase();
      } else if (isYesterday(date)) {
        return 'Yesterday';
      } else if ((now.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000) {
        // Within last 7 days
        return formatInTimezone(date, { weekday: 'short' }, userTimezone);
      } else if (isThisYear(date)) {
        return formatInTimezone(date, { month: 'short', day: 'numeric' }, userTimezone);
      } else {
        return formatInTimezone(date, { month: 'short', day: 'numeric', year: 'numeric' }, userTimezone);
      }
    } catch (err) { return ''; }
  };

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
                {filteredConversations.map((conv) => {
                  const displayName = conv.is_group
                    ? conv.conversation_name
                    : conv.other_participants[0]?.full_name || 'Unknown User';
                  const avatarUrl = !conv.is_group && conv.other_participants[0]
                    ? conv.other_participants[0].avatar_url
                    : null;
                  const initial = getInitial(displayName || '');
                  const isSpecial = displayName?.toLowerCase().includes('kia ghasem');
                  const hasUnread = conv.unread_count > 0;
                  
                  return (
                    <div
                      key={conv.conversation_id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl transition-all border cursor-pointer group",
                        hasUnread 
                          ? "bg-gray-50 border-gray-200 hover:bg-gray-100" 
                          : "bg-white hover:bg-gray-50 border-transparent hover:border-gray-200"
                      )}
                      style={{ minHeight: 64 }}
                      onClick={() => handleSelectAndClose(conv.conversation_id)}
                    >
                      <div className="flex-shrink-0 relative">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={avatarUrl || undefined} alt={displayName || 'User'} />
                          <AvatarFallback className="bg-gray-200 text-gray-500 text-lg font-semibold">{initial}</AvatarFallback>
                        </Avatar>
                        {hasUnread && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                            {conv.unread_count > 9 ? (
                              <span className="text-[8px] text-white font-bold">9+</span>
                            ) : conv.unread_count > 1 ? (
                              <span className="text-[9px] text-white font-bold">{conv.unread_count}</span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              "text-base truncate max-w-[140px]",
                              hasUnread ? "font-bold text-gray-900" : "font-semibold text-gray-900"
                            )}>
                              {displayName}
                            </span>
                            {isSpecial && <Star className="h-4 w-4 text-yellow-400 ml-0.5" fill="#facc15" />}
                          </div>
                          {conv.latest_message_time && (
                            <span className={cn(
                              "text-sm font-medium ml-2 flex-shrink-0",
                              hasUnread ? "text-gray-900" : "text-gray-400"
                            )}>
                              {formatSmartChatListTime(conv.latest_message_time)}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5">
                          <p className={cn(
                            "text-sm truncate max-w-[220px] leading-relaxed",
                            hasUnread ? "text-gray-800 font-medium" : "text-gray-500 font-normal"
                          )}>
                            {conv.latest_message_content || (conv.is_group ? 'Group created' : 'Chat started')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
} 