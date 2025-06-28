/**
 * ChatListUnified Component
 * 
 * Unified chat list component that replaces both ChatList and ChatListPopover.
 * Supports both popover and fullscreen variants with mobile URL navigation.
 * 
 * Features:
 * - Unified codebase with variant support
 * - Mobile URL navigation integration
 * - Specialized hook integration
 * - Backward compatibility
 * - Performance optimizations
 */

import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  X, 
  MessageSquare, 
  UserPlus, 
  Menu, 
  MoreHorizontal, 
  Filter,
  ChevronDown 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConversations } from '../hooks/useConversations';
import { useMessageStore } from '../store/messageStore';
import { useChatNavigation } from '../hooks/useChatNavigation';
import type { LegacyConversation } from '../types';
import ChatListItem from '@/components/chat/ChatListItem';

/**
 * Props interface for the unified component
 */
interface ChatListUnifiedProps {
  // Variant control
  variant: 'popover' | 'fullscreen';
  
  // Conversation handling
  onConversationSelect: (conversation: LegacyConversation) => void;
  currentUserId?: string;
  
  // Popover-specific props
  triggerButton?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPopoverClose?: () => void;
  
  // Fullscreen-specific props
  onStartNewChat?: () => void;
  onMobileMenuClick?: () => void;
  
  // Configuration
  enableUrlNavigation?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  showMarkAllRead?: boolean;
}

/**
 * Unified ChatList component
 */
export function ChatListUnified({
  variant,
  onConversationSelect,
  currentUserId,
  triggerButton,
  isOpen: externalIsOpen,
  onOpenChange,
  onPopoverClose,
  onStartNewChat,
  onMobileMenuClick,
  enableUrlNavigation = true,
  showSearch = true,
  showFilters = variant === 'fullscreen',
  showMarkAllRead = variant === 'fullscreen'
}: ChatListUnifiedProps) {
  // Hooks
  const { toast } = useToast();
  const { 
    legacyConversations, 
    loading, 
    error, 
    fetchConversations,
    refreshConversations
  } = useConversations();
  
  const { markAsRead } = useMessageStore();
  const { isNavigationActive } = useChatNavigation();

  // State
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  
  // Refs
  const popoverContentRef = useRef<HTMLDivElement>(null);

  // Determine effective open state for popover variant
  const isPopoverOpen = variant === 'popover' 
    ? (externalIsOpen !== undefined ? externalIsOpen : internalIsOpen)
    : false;

  // Sync internal state with external for popover
  useEffect(() => {
    if (variant === 'popover' && externalIsOpen !== undefined) {
      setInternalIsOpen(externalIsOpen);
    }
  }, [variant, externalIsOpen]);

  // Fetch conversations when popover opens or component mounts
  useEffect(() => {
    // ✅ CRITICAL FIX: Only fetch when user is authenticated
    if (!currentUserId) {
      console.log('[ChatListUnified] No user ID available, skipping fetch conversations');
      return;
    }
    
    if (variant === 'popover') {
      if (isPopoverOpen && !loading) {
        console.log('[ChatListUnified] Popover opened, fetching conversations for user:', currentUserId);
        fetchConversations();
      }
    } else {
      // Always fetch for fullscreen
      if (!loading) {
        console.log('[ChatListUnified] Fullscreen mode, fetching conversations for user:', currentUserId);
        fetchConversations();
      }
    }
  }, [variant, isPopoverOpen, loading, fetchConversations, currentUserId]);

  // Listen for real-time conversation updates
  useEffect(() => {
    const handleConversationUpdate = (event: CustomEvent) => {
      console.log('[ChatListUnified] Real-time conversation update detected:', event.detail);
      
      // ✅ ENHANCED: More aggressive refresh for urgent updates (messages from other users)
      if (event.detail?.urgent && event.detail?.isFromOtherUser) {
        console.log('[ChatListUnified] 🚨 URGENT: Message from other user - forcing immediate refresh');
        
        // Multiple refresh strategies for urgent updates - using urgent flag
        if (!loading) {
          // Immediate urgent refresh
          refreshConversations(undefined, { urgent: true });
          
          // Secondary urgent refresh after short delay
          setTimeout(() => {
            if (!loading) {
              console.log('[ChatListUnified] 🔄 Secondary URGENT refresh');
              refreshConversations(undefined, { urgent: true });
            }
          }, 200);
          
          // Final urgent refresh to ensure consistency
          setTimeout(() => {
            if (!loading) {
              console.log('[ChatListUnified] 🔄 Final URGENT refresh');
              refreshConversations(undefined, { urgent: true });
            }
          }, 1000);
        }
      } else {
        // Normal refresh for non-urgent updates
        if (!loading) {
          refreshConversations();
        }
      }
    };

    const handleConversationMarkedAsRead = (event: CustomEvent) => {
      console.log('[ChatListUnified] Conversation marked as read:', event.detail);
      
      // ✅ CRITICAL FIX: Force refresh when conversation is marked as read
      if (!loading) {
        refreshConversations();
        
        // Additional refresh after delay to ensure consistency
        setTimeout(() => {
          if (!loading) {
            console.log('[ChatListUnified] 🔄 Secondary read status refresh');
            refreshConversations();
          }
        }, 500);
      }
    };

    // Listen for real-time events
    window.addEventListener('chat-conversations-updated', handleConversationUpdate as EventListener);
    window.addEventListener('conversation-marked-as-read', handleConversationMarkedAsRead as EventListener);
    
    return () => {
      window.removeEventListener('chat-conversations-updated', handleConversationUpdate as EventListener);
      window.removeEventListener('conversation-marked-as-read', handleConversationMarkedAsRead as EventListener);
    };
  }, [loading, refreshConversations]);

  /**
   * Handle popover open/close
   */
  const handleOpenChange = (open: boolean) => {
    if (variant !== 'popover') return;
    
    setInternalIsOpen(open);
    onOpenChange?.(open);
    
    if (!open) {
      onPopoverClose?.();
      setSearchQuery(''); // Clear search when closing
      setShowOptions(false);
    }
  };

  /**
   * Handle conversation selection
   */
  const handleConversationSelect = (conversation: LegacyConversation) => {
    // ✅ SAFARI FIX: Improved popover close handling for Safari
    if (variant === 'popover') {
      // Detect Safari browser
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      if (isSafari) {
        // Safari-specific: Force immediate state updates with requestAnimationFrame
        requestAnimationFrame(() => {
          setInternalIsOpen(false);
          onOpenChange?.(false);
          onPopoverClose?.();
          setSearchQuery('');
          setShowOptions(false);
          
          // Call selection handler after popover state is updated
          requestAnimationFrame(() => {
            onConversationSelect(conversation);
          });
        });
      } else {
        // Standard browser handling
        setInternalIsOpen(false);
        onOpenChange?.(false);
        onPopoverClose?.();
        setSearchQuery('');
        setShowOptions(false);
        onConversationSelect(conversation);
      }
    } else {
      // Fullscreen variant - no special handling needed
      onConversationSelect(conversation);
    }
  };

  /**
   * Handle mark all as read
   */
  const handleMarkAllAsRead = async () => {
    if (isMarkingRead) return;
    
    setIsMarkingRead(true);
    setShowOptions(false);
    
    try {
      const unreadConversations = legacyConversations.filter(conv => conv.unread_count > 0);
      
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
      
      // Refresh conversations
      await refreshConversations();
      
    } catch (error) {
      console.error('[ChatListUnified] Error marking all as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all conversations as read. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsMarkingRead(false);
    }
  };

  /**
   * Handle filter changes
   */
  const handleFilter = (type: 'all' | 'unread') => {
    setFilter(type);
    setShowOptions(false);
  };

  /**
   * Filter conversations based on search and filter
   */
  const filteredConversations = legacyConversations.filter(conv => {
    // Apply unread filter
    if (filter === 'unread' && conv.unread_count === 0) return false;
    
    // Apply search filter
    if (!searchQuery) return true;
    
    const lowercasedQuery = searchQuery.toLowerCase();
    const participantsMatch = conv.other_participants.some(
      p => p.full_name?.toLowerCase().includes(lowercasedQuery)
    );
    const nameMatch = conv.conversation_name?.toLowerCase().includes(lowercasedQuery);
    const messageMatch = conv.latest_message_content?.toLowerCase().includes(lowercasedQuery);
    
    return participantsMatch || nameMatch || messageMatch;
  });

  // Calculate total unread count
  const totalUnreadCount = legacyConversations.reduce((total, conv) => total + conv.unread_count, 0);

  /**
   * Render header section
   */
  const renderHeader = () => (
    <div className={`px-4 py-3 border-b border-gray-200 flex items-center relative ${
      variant === 'popover' ? 'px-5 pt-5 pb-2' : ''
    }`}>
      {/* Mobile hamburger (fullscreen only) */}
      {variant === 'fullscreen' && (
        <Button
          variant="ghost"
          className="sm:hidden mr-2 p-2 text-gray-600 hover:bg-gray-100"
          onClick={onMobileMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      
      <h2 className={`font-semibold text-gray-800 flex-1 ${
        variant === 'popover' ? 'text-lg text-gray-900' : 'text-lg'
      }`}>
        Chats
      </h2>
      
      {/* All dropdown for popover variant */}
      {variant === 'popover' && (
        <div className="relative">
          <Button
            variant="ghost"
            className="flex items-center gap-1 text-sm text-gray-600 hover:bg-gray-100 px-2 py-1"
            onClick={() => setShowOptions(v => !v)}
          >
            All
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          {showOptions && (
            <div className="absolute right-0 top-8 z-20 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 flex flex-col text-left">
              <button
                className={`px-3 py-2 text-sm ${
                  filter === 'all' ? 'font-bold text-gray-900 bg-gray-50' : 'text-gray-700'
                } hover:bg-gray-50 text-left`}
                onClick={() => handleFilter('all')}
              >
                All
              </button>
              <button
                className={`px-3 py-2 text-sm ${
                  filter === 'unread' ? 'font-bold text-gray-900 bg-gray-50' : 'text-gray-700'
                } hover:bg-gray-50 text-left`}
                onClick={() => handleFilter('unread')}
              >
                Unread
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Mobile options (fullscreen only) */}
      {variant === 'fullscreen' && showFilters && (
        <Button
          variant="ghost"
          className="sm:hidden ml-2 p-2 text-gray-600 hover:bg-gray-100"
          onClick={() => setShowOptions(v => !v)}
          aria-label="More options"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      )}
      
      {/* Options dropdown */}
      {showOptions && variant === 'fullscreen' && (
        <div className="absolute right-2 top-12 z-20 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-2 flex flex-col text-left animate-fade-in">
          {showMarkAllRead && (
            <>
              <button
                className={`px-4 py-2 text-sm ${
                  totalUnreadCount === 0 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-50'
                } font-medium text-left`}
                onClick={handleMarkAllAsRead}
                disabled={isMarkingRead || totalUnreadCount === 0}
              >
                {isMarkingRead ? 'Marking as read...' : 'Mark all as read'}
              </button>
              <div className="border-t border-gray-100 my-1" />
            </>
          )}
          <button
            className={`flex items-center gap-2 px-4 py-2 text-sm ${
              filter === 'all' ? 'font-bold text-gray-900' : 'text-gray-700'
            } hover:bg-gray-50`}
            onClick={() => handleFilter('all')}
          >
            <Filter className="h-4 w-4" /> All
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 text-sm ${
              filter === 'unread' ? 'font-bold text-gray-900' : 'text-gray-700'
            } hover:bg-gray-50`}
            onClick={() => handleFilter('unread')}
          >
            <Filter className="h-4 w-4" /> Unread
          </button>
        </div>
      )}
    </div>
  );

  /**
   * Render search section
   */
  const renderSearch = () => (
    showSearch && (
      <div className={`px-4 py-2 border-b border-gray-200 ${
        variant === 'popover' ? 'px-5 pb-3' : ''
      }`}>
        <div className="relative">
          <Input
            placeholder={variant === 'popover' ? "Search users" : "Search users or messages..."}
            className={`w-full focus-visible:ring-1 focus-visible:ring-gray-300 ${
              variant === 'popover' 
                ? 'pl-10 h-10 text-base rounded-lg bg-gray-100 border border-gray-200 placeholder-gray-400'
                : 'pl-9 h-9 bg-gray-50 border-gray-200'
            }`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className={`absolute text-gray-400 ${
            variant === 'popover'
              ? 'left-3 top-1/2 -translate-y-1/2 h-5 w-5'
              : 'left-3 top-2.5 h-4 w-4'
          }`} />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute text-gray-400 hover:text-gray-500 ${
                variant === 'popover'
                  ? 'right-3 top-1/2 -translate-y-1/2 h-5 w-5'
                  : 'right-3 top-2.5 h-4 w-4'
              }`}
            >
              <X className={variant === 'popover' ? 'h-5 w-5' : 'h-4 w-4'} />
            </button>
          )}
        </div>
      </div>
    )
  );

  /**
   * Render conversation list
   */
  const renderConversationList = () => (
    <div className={`flex-1 overflow-hidden ${variant === 'popover' ? 'px-1 pb-2' : ''}`}>
      <ScrollArea className={`h-full ${variant === 'popover' ? 'max-h-[calc(70vh-140px)]' : ''}`}>
        {loading ? (
          <div className="p-8 flex justify-center items-center h-full min-h-[200px]">
            <div className="animate-spin h-6 w-6 border-t-2 border-blue-500 rounded-full"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-base h-full flex flex-col justify-center items-center min-h-[200px]">
            <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
            <p className="font-medium">No chats found</p>
            <p className="text-sm">
              {searchQuery ? "Try a different search" : "Start a new conversation"}
              {searchQuery ? " or start a new conversation" : ""}.
            </p>
          </div>
        ) : (
          <div className={`${variant === 'popover' ? 'space-y-1 py-2' : ''}`}>
            {filteredConversations.map(conv => (
              <ChatListItem
                key={conv.conversation_id}
                conversation={conv}
                onSelect={() => handleConversationSelect(conv)}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  /**
   * Render content based on variant
   */
  const renderContent = () => (
    <div className={`flex flex-col min-h-0 h-full bg-white ${
      variant === 'popover' ? 'max-h-[70vh] min-h-[400px]' : 'flex-1'
    }`}>
      {renderHeader()}
      {renderSearch()}
      {renderConversationList()}
    </div>
  );

  // Render based on variant
  if (variant === 'popover') {
    return (
      <Popover open={isPopoverOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          {triggerButton}
        </PopoverTrigger>
        <PopoverContent 
          ref={popoverContentRef}
          className={`w-[380px] max-w-[90vw] p-0 shadow-2xl rounded-2xl border border-gray-200 bg-white overflow-hidden ${
            /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ? 'chat-modal-safari-fix' : ''
          }`}
          align="end"
          sideOffset={8}
          onInteractOutside={(e) => {
            // ✅ PREVENT FLICKER: Stop any transition when clicking outside
            e.preventDefault();
            handleOpenChange(false);
          }}
        >
          {renderContent()}
        </PopoverContent>
      </Popover>
    );
  }

  // Fullscreen variant
  return renderContent();
}

// Default export for backward compatibility
export default ChatListUnified; 