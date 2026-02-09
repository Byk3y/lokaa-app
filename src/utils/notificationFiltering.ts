import { useSpaceStore } from '@/stores/useSpaceStore';
import { log } from '@/utils/logger';
import type { NotificationWithActor } from '@/types/notification';

/**
 * Utility for smart notification filtering based on current space context
 * Prevents notification spam by filtering out notifications for the current space
 */
export class NotificationFiltering {

  /**
   * Get the current space subdomain the user is viewing
   */
  static getCurrentSpaceSubdomain(): string | null {
    try {
      const pathname = window.location.pathname;

      // Debug current page context
      log.debug('NotificationFiltering', 'Getting current space context:', {
        pathname,
        isOnNotificationsPage: this.isOnNotificationsPage(),
        isActivelyInSpace: this.isActivelyInSpace()
      });

      // First try URL-based detection (most reliable)
      const spaceContext = getCurrentSpaceContext();
      if (spaceContext?.subdomain) {
        log.debug('NotificationFiltering', 'Found space from context:', spaceContext.subdomain);
        return spaceContext.subdomain;
      }

      // Fallback to space store
      const currentSpace = useSpaceStore.getState().currentSpaceId;
      if (currentSpace) {
        log.debug('NotificationFiltering', 'Found space from space store:', currentSpace);
        return currentSpace;
      }

      // Last resort: try to extract from current URL
      const match = pathname.match(/\/([^\/]+)\/space/);
      if (match?.[1]) {
        log.debug('NotificationFiltering', 'Found space from URL pattern:', match[1]);
        return match[1];
      }

      log.debug('NotificationFiltering', 'No current space detected');
      return null;
    } catch (error) {
      log.warn('NotificationFiltering', 'Error getting current space:', error);
      return null;
    }
  }

  /**
   * Check if user is currently on the notifications page
   */
  static isOnNotificationsPage(): boolean {
    const pathname = window.location.pathname;
    return pathname === '/notifs' || pathname.startsWith('/notifications');
  }

  /**
   * Check if user is actively browsing within a specific space
   */
  static isActivelyInSpace(): boolean {
    const pathname = window.location.pathname;
    // Only filter when actively browsing space content (not on notifications page)
    return pathname.includes('/space') && !this.isOnNotificationsPage();
  }

  /**
   * Check if a notification should be filtered out based on current space context
   * @param notification - The notification to check
   * @param currentSpaceSubdomain - Optional override for current space (for testing)
   * @returns true if notification should be filtered out (not shown)
   */
  static shouldFilterNotification(
    notification: NotificationWithActor,
    currentSpaceSubdomain?: string | null
  ): boolean {
    try {
      // IMPORTANT: Never filter notifications on the notifications page
      // Users should see ALL their notifications when explicitly viewing notifications
      if (this.isOnNotificationsPage()) {
        log.debug('NotificationFiltering', 'On notifications page - showing all notifications');
        return false;
      }

      // Only filter when actively browsing within a space
      if (!this.isActivelyInSpace()) {
        return false;
      }

      const currentSpace = currentSpaceSubdomain ?? this.getCurrentSpaceSubdomain();

      // If we can't determine current space, don't filter
      if (!currentSpace) {
        return false;
      }

      // If notification doesn't have a space, don't filter
      if (!notification.space?.subdomain) {
        return false;
      }

      // Check if notification is from the current space
      const isFromCurrentSpace = notification.space.subdomain === currentSpace;

      // Always show mentions even if from current space
      if (notification.type === 'mention' && isFromCurrentSpace) {
        log.debug('NotificationFiltering', 'Keeping mention notification despite current space');
        return false;
      }

      // Always show comment replies on your posts even if from current space
      if (notification.type === 'comment_reply' && isFromCurrentSpace) {
        log.debug('NotificationFiltering', 'Keeping comment reply notification despite current space');
        return false;
      }

      // Filter out other notifications from current space only when actively browsing that space
      if (isFromCurrentSpace) {
        log.debug('NotificationFiltering', `Filtering notification from current space: ${currentSpace}`, {
          notificationType: notification.type,
          notificationId: notification.id
        });
        return true;
      }

      return false;
    } catch (error) {
      log.warn('NotificationFiltering', 'Error checking notification filter:', error);
      return false;
    }
  }

  /**
   * Filter an array of notifications based on current space context
   * @param notifications - Array of notifications to filter
   * @param currentSpaceSubdomain - Optional override for current space
   * @returns Filtered array of notifications
   */
  static filterNotifications(
    notifications: NotificationWithActor[],
    currentSpaceSubdomain?: string | null
  ): NotificationWithActor[] {
    try {
      const filteredNotifications = notifications.filter(
        notification => !this.shouldFilterNotification(notification, currentSpaceSubdomain)
      );

      const filteredCount = notifications.length - filteredNotifications.length;
      if (filteredCount > 0) {
        log.debug('NotificationFiltering', `Filtered ${filteredCount} notifications from current space`);
      }

      return filteredNotifications;
    } catch (error) {
      log.warn('NotificationFiltering', 'Error filtering notifications:', error);
      return notifications;
    }
  }

  /**
   * Check if we should show notification badges based on current space
   * This helps prevent badge spam when user is actively viewing a space
   * @param unreadNotifications - Array of unread notifications
   * @param currentSpaceSubdomain - Optional override for current space
   * @returns Adjusted unread count
   */
  static getFilteredUnreadCount(
    unreadNotifications: NotificationWithActor[],
    currentSpaceSubdomain?: string | null
  ): number {
    const filteredNotifications = this.filterNotifications(unreadNotifications, currentSpaceSubdomain);
    return filteredNotifications.length;
  }

  /**
   * Get user-friendly explanation of why notifications were filtered
   * Useful for debugging and user education
   */
  static getFilteringExplanation(
    originalCount: number,
    filteredCount: number,
    currentSpace?: string | null
  ): string {
    const hiddenCount = originalCount - filteredCount;

    if (hiddenCount === 0) {
      return 'No notifications filtered';
    }

    if (hiddenCount === 1) {
      return `1 notification hidden from current space${currentSpace ? ` (${currentSpace})` : ''}`;
    }

    return `${hiddenCount} notifications hidden from current space${currentSpace ? ` (${currentSpace})` : ''}`;
  }
}

/**
 * Hook for using notification filtering in React components
 */
export function useNotificationFiltering() {
  const currentSpaceSubdomain = NotificationFiltering.getCurrentSpaceSubdomain();

  return {
    currentSpaceSubdomain,
    shouldFilterNotification: (notification: NotificationWithActor) =>
      NotificationFiltering.shouldFilterNotification(notification, currentSpaceSubdomain),
    filterNotifications: (notifications: NotificationWithActor[]) =>
      NotificationFiltering.filterNotifications(notifications, currentSpaceSubdomain),
    getFilteredUnreadCount: (unreadNotifications: NotificationWithActor[]) =>
      NotificationFiltering.getFilteredUnreadCount(unreadNotifications, currentSpaceSubdomain)
  };
}