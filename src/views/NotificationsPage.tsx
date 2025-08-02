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
import type { NotificationWithActor } from '@/types/notification';
import { getSupabaseClient } from '@/integrations/supabase/client';

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
    markVisibleAsRead,
    refresh
  } = useNotifications();

  // Mark all visible notifications as read when user views the page
  useEffect(() => {
    if (notifications.length > 0 && !isLoading) {
      markVisibleAsRead();
    }
  }, [notifications.length, isLoading, markVisibleAsRead]);

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

  // Wrapper for single notification mark as read
  const handleMarkAsRead = (notificationId: string) => {
    markAsRead([notificationId]);
  };

  // Handle navigation to post when notification is clicked
  const handleNotificationNavigate = async (notification: NotificationWithActor) => {
    log.debug('NotificationsPage', 'Navigating to notification:', notification);
    
    // For post-related notifications, fetch the post slug and navigate
    if (['post_like', 'comment_reply', 'mention', 'new_post'].includes(notification.type) && notification.target_id) {
      try {
        // Get the post details to get the slug
        const { data: postData, error: postError } = await getSupabaseClient()
          .from('posts')
          .select(`
            id,
            slug,
            space_id
          `)
          .eq('id', notification.target_id)
          .single();

        if (postError || !postData) {
          log.error('NotificationsPage', 'Failed to fetch post for navigation:', postError);
          return;
        }

        // Get the space subdomain
        const { data: spaceData, error: spaceError } = await getSupabaseClient()
          .from('spaces')
          .select('subdomain')
          .eq('id', postData.space_id)
          .single();

        if (spaceError || !spaceData) {
          log.error('NotificationsPage', 'Failed to fetch space for navigation:', spaceError);
          return;
        }

        // Build the correct URL using the post slug
        const spaceSubdomain = spaceData.subdomain || notification.space?.subdomain;
        if (spaceSubdomain && postData.slug) {
          const postUrl = `/${spaceSubdomain}/space/${postData.slug}`;
          log.debug('NotificationsPage', 'Navigating to post URL:', postUrl);
          // Use push navigation to add to history stack so back button works correctly
          navigate(postUrl, { replace: false });
        } else {
          log.error('NotificationsPage', 'Missing space subdomain or post slug');
        }
      } catch (error) {
        log.error('NotificationsPage', 'Error navigating to post:', error);
      }
    }
    // For space_join notifications, navigate to the space
    else if (notification.type === 'space_join' && notification.space?.subdomain) {
      navigate(`/${notification.space.subdomain}/space`, { replace: false });
    }
    else {
      // For other notification types, just log for now
      log.debug('NotificationsPage', 'Unhandled notification type:', notification.type);
    }
  };

  // Auto-refresh on mount - force refresh to ensure filtering works correctly on notifications page
  useEffect(() => {
    if (user?.id) {
      log.debug('NotificationsPage', 'Force refreshing notifications on notifications page');
      refresh();
    }
  }, [user?.id, refresh]);

  // Loading state
  if (isLoading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex-shrink-0">
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

        {/* Loading spinner - Scrollable area */}
        <div className="flex-1 overflow-y-auto flex justify-center pt-8">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
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
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex-shrink-0">
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

        {/* Error state - Scrollable area */}
        <div className="flex-1 overflow-y-auto px-4 py-12 text-center">
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header - Skool style */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex-shrink-0">
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

      {/* Content - Scrollable area */}
      <div className="flex-1 overflow-y-auto pb-40"> {/* Natural scrolling with bottom padding */}
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
                  onMarkAsRead={handleMarkAsRead}
                  onNavigate={handleNotificationNavigate}
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
        unreadCount={unreadCount}
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