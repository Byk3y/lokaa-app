import React, { useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import NotificationItem from './NotificationItem';
import type { NotificationWithActor } from '@/types/notification';

interface NotificationListProps {
  notifications: NotificationWithActor[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onMarkAsRead: (notificationId: string) => void;
  onNavigate: (notification: NotificationWithActor) => void;
  error?: string | null;
}

export default function NotificationList({
  notifications,
  isLoading,
  hasMore,
  onLoadMore,
  onMarkAsRead,
  onNavigate,
  error
}: NotificationListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Scroll handler for infinite loading
  const handleScroll = useCallback((e: Event) => {
    // Prevent scroll event from bubbling to parent
    e.stopPropagation();
    
    const container = scrollContainerRef.current;
    if (!container || isLoading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // Load more when 100px from bottom

    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      onLoadMore();
    }
  }, [isLoading, hasMore, onLoadMore]);

  // Set up scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
  
  // Loading state for initial load
  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading notifications...</span>
      </div>
    );
  }

  // Error state
  if (error && notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <div className="text-sm text-red-600 mb-2">Failed to load notifications</div>
        <div className="text-xs text-gray-500 text-center">{error}</div>
      </div>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-5 5-5-5h5V3h5v14z" />
          </svg>
        </div>
        <div className="text-sm text-gray-500 text-center">
          No notifications yet
        </div>
        <div className="text-xs text-gray-400 text-center mt-1">
          You will see notifications here when people interact with your posts
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto notification-scroll-area"
      style={{ 
        maxHeight: 'calc(570px - 60px - 50px)', // Total height - header - footer
        minHeight: '400px',
        overscrollBehavior: 'contain', // Prevent scroll chaining
        scrollbarWidth: 'thin'
      }}
      onWheel={(e) => {
        // Prevent wheel events from bubbling when scrolling within bounds
        const container = e.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = container;
        
        // If scrolling up and already at top, prevent bubbling
        if (e.deltaY < 0 && scrollTop <= 0) {
          e.stopPropagation();
        }
        // If scrolling down and already at bottom, prevent bubbling
        else if (e.deltaY > 0 && scrollTop + clientHeight >= scrollHeight) {
          e.stopPropagation();
        }
      }}
    >
      <div className="divide-y divide-gray-100">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {/* Loading indicator for pagination */}
      {isLoading && notifications.length > 0 && (
        <div className="flex justify-center py-4" ref={loadingRef}>
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading more...</span>
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && notifications.length > 0 && (
        <div className="text-center py-6 text-sm text-gray-400">
          You have reached the end of your notifications
        </div>
      )}

      {/* Scroll trigger area */}
      {hasMore && !isLoading && (
        <div className="h-20" />
      )}
    </div>
  );
}