import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, MessageSquare, UserPlus, Menu, MoreHorizontal, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMessageStore } from '@/features/chat/store/messageStore';
import type { LegacyConversation } from '@/features/chat/types';
import ChatListItem from './ChatListItem';

interface ChatListProps {
  conversations: LegacyConversation[];
  onSelectConversation: (conversation: LegacyConversation) => void;
  currentUserId?: string;
  onStartNewChat?: () => void;
  onMobileMenuClick?: () => void;
}

export default function ChatList({
  conversations,
  onSelectConversation,
  currentUserId,
  onStartNewChat,
  onMobileMenuClick
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  
  const { toast } = useToast();
  const { markAsRead } = useMessageStore();

  const handleMarkAllAsRead = async () => {
    if (isMarkingRead) return;
    
    setIsMarkingRead(true);
    setShowOptions(false);
    
    try {
      // Find all conversations with unread messages
      const unreadConversations = conversations.filter(conv => conv.unread_count > 0);
      
      if (unreadConversations.length === 0) {
        toast({
          title: "All caught up!",
          description: "You have no unread messages.",
        });
        return;
      }
      
      // Mark each unread conversation as read
      await Promise.all(
        unreadConversations.map(conv => markAsRead(conv.conversation_id))
      );
      
      toast({
        title: "Success!",
        description: `Marked ${unreadConversations.length} conversation${unreadConversations.length === 1 ? '' : 's'} as read.`,
      });
      
    } catch (error) {
      console.error('Error marking all conversations as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all conversations as read. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleFilter = (type: 'all' | 'unread') => {
    setFilter(type);
    setShowOptions(false);
  };

  const filteredConversations = conversations.filter(conv => {
    if (filter === 'unread' && conv.unread_count === 0) return false;
    if (!searchQuery) return true;
    const lowercasedQuery = searchQuery.toLowerCase();
    const participantsMatch = conv.other_participants.some(
      p => p.full_name?.toLowerCase().includes(lowercasedQuery)
    );
    const nameMatch = conv.conversation_name?.toLowerCase().includes(lowercasedQuery);
    const messageMatch = conv.latest_message_content?.toLowerCase().includes(lowercasedQuery);
    return participantsMatch || nameMatch || messageMatch;
  });

  const totalUnreadCount = conversations.reduce((total, conv) => total + conv.unread_count, 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full bg-white">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center relative">
        {/* Hamburger for mobile only */}
        <Button
          variant="ghost"
          className="sm:hidden mr-2 p-2 text-gray-600 hover:bg-gray-100"
          onClick={onMobileMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-gray-800 flex-1">Chats</h2>
        {/* 3-dots for mobile only */}
        <Button
          variant="ghost"
          className="sm:hidden ml-2 p-2 text-gray-600 hover:bg-gray-100"
          onClick={() => setShowOptions(v => !v)}
          aria-label="More options"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
        {/* Dropdown modal */}
        {showOptions && (
          <div className="absolute right-2 top-12 z-20 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-2 flex flex-col text-left animate-fade-in">
            <button
              className={`px-4 py-2 text-sm ${totalUnreadCount === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'} font-medium text-left`}
              onClick={handleMarkAllAsRead}
              disabled={isMarkingRead || totalUnreadCount === 0}
            >
              {isMarkingRead ? 'Marking as read...' : 'Mark all as read'}
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              className={`flex items-center gap-2 px-4 py-2 text-sm ${filter === 'all' ? 'font-bold text-gray-900' : 'text-gray-700'} hover:bg-gray-50`}
              onClick={() => handleFilter('all')}
            >
              <Filter className="h-4 w-4" /> All
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 text-sm ${filter === 'unread' ? 'font-bold text-gray-900' : 'text-gray-700'} hover:bg-gray-50`}
              onClick={() => handleFilter('unread')}
            >
              <Filter className="h-4 w-4" /> Unread
            </button>
          </div>
        )}
      </div>
      <div className="px-4 py-2 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users or messages..."
            className="w-full pl-9 h-9 bg-gray-50 border-gray-200 focus-visible:ring-teal-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {filteredConversations.map(conv => (
            <ChatListItem
              key={conv.conversation_id}
              conversation={conv}
              onSelect={() => onSelectConversation(conv)}
              currentUserId={currentUserId}
            />
          ))}
        </ScrollArea>
      </div>
    </div>
  );
} 