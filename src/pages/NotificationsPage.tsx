import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, MoreHorizontal } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import NotificationItem from '@/components/notifications/NotificationItem';
import MobileSpaceDrawer from '@/components/mobile/MobileSpaceDrawer';
import NotificationSettingsModal from '@/components/notifications/NotificationSettingsModal';
import { Button } from '@/components/ui/button';
import { log } from '@/utils/logger';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useOptimizedAuth();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    refresh
  } = useNotifications();

  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);
  const [isSpaceDrawerOpen, setIsSpaceDrawerOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const settingsButtonRef = React.useRef<HTMLButtonElement>(null);

  // Mark all as read handler
  const handleMarkAllAsRead = async () => {
    if (isMarkingAllAsRead || !user?.id) return;
    
    try {
      setIsMarkingAllAsRead(true);
      await markAllAsRead();
      log.debug('NotificationsPage', 'Marked all notifications as read');
    } catch (error) {
      log.error('NotificationsPage', 'Error marking all as read:', error);
    } finally {
      setIsMarkingAllAsRead(false);
    }
  };

  // Auto-refresh on mount - but only if we don't have notifications already
  useEffect(() => {
    if (user?.id && notifications.length === 0) {
      refresh();
    }
  }, [user?.id, refresh, notifications.length]);

  // Loading state
  if (isLoading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-white fixed inset-0 z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={() => setIsSpaceDrawerOpen(true)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Notifications
            </h1>
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        <div className="px-4 py-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Space Drawer */}
        <MobileSpaceDrawer 
          isOpen={isSpaceDrawerOpen} 
          onClose={() => setIsSpaceDrawerOpen(false)}
          currentSpaceSubdomain=""
          userId={user?.id || ''}
        />
      </div>
    );
  }

  // Error state
  if (error && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-white fixed inset-0 z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={() => setIsSpaceDrawerOpen(true)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Notifications
            </h1>
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Error state */}
        <div className="px-4 py-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Unable to load notifications
            </h3>
            <p className="text-gray-600 mb-4">
              {error}
            </p>
            <Button 
              onClick={refresh}
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </div>

        {/* Mobile Space Drawer */}
        <MobileSpaceDrawer 
          isOpen={isSpaceDrawerOpen} 
          onClose={() => setIsSpaceDrawerOpen(false)}
          currentSpaceSubdomain=""
          userId={user?.id || ''}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white fixed inset-0 z-50 overflow-y-auto">
      {/* Header - Skool style */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => setIsSpaceDrawerOpen(true)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            Notifications
          </h1>
          <button 
            ref={settingsButtonRef}
            onClick={() => setIsSettingsModalOpen(!isSettingsModalOpen)}
            className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pb-20"> {/* Space for bottom nav */}
        {notifications.length === 0 ? (
          /* Empty state - Skool style */
          <div className="px-4 py-12 text-center">
            <div className="max-w-sm mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔔</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-600">
                You'll see notifications here when people interact with your posts and comments.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Notifications list */}
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                />
              ))}
            </div>

            {/* Load more button */}
            {hasMore && (
              <div className="px-4 py-6 text-center">
                <Button
                  onClick={loadMore}
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Settings Modal */}
      <NotificationSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onMarkAllAsRead={handleMarkAllAsRead}
        isMarkingAllAsRead={isMarkingAllAsRead}
        anchorEl={settingsButtonRef.current}
      />

      {/* Mobile Space Drawer */}
      <MobileSpaceDrawer 
        isOpen={isSpaceDrawerOpen} 
        onClose={() => setIsSpaceDrawerOpen(false)}
        currentSpaceSubdomain=""
        userId={user?.id || ''}
      />
    </div>
  );
}