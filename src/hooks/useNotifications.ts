import { useState, useEffect, useCallback, useRef } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { notificationService } from '@/services/NotificationService';
import { NotificationFiltering } from '@/utils/notificationFiltering';
import { log } from '@/utils/logger';
import type {
  NotificationWithActor,
  NotificationType,
  UseNotificationsReturn,
  NotificationRealtimeEvent
} from '@/types/notification';
import { getSupabaseClient } from '@/integrations/supabase/client';

// Simple cache to persist notifications between component mounts
const notificationCache = new Map<string, {
  notifications: NotificationWithActor[];
  unreadCount: number;
  timestamp: number;
}>();

// ✅ NEW: Global notification count store for persistence across navigation
const globalNotificationCountStore = {
  count: 0,
  isLoading: false,
  lastUpdated: 0,
  subscribers: new Set<() => void>(),
  
  getCount() {
    return this.count;
  },
  
  setCount(newCount: number) {
    if (this.count !== newCount) {
      this.count = newCount;
      this.lastUpdated = Date.now();
      this.notifySubscribers();
    }
  },
  
  setLoading(loading: boolean) {
    this.isLoading = loading;
    this.notifySubscribers();
  },
  
  subscribe(callback: () => void) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  },
  
  notifySubscribers() {
    this.subscribers.forEach(callback => callback());
  }
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useNotifications(type?: NotificationType): UseNotificationsReturn {
  const { user } = useOptimizedAuth();
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const realtimeSubscriptionRef = useRef<any>(null);
  const supabase = getSupabaseClient();

  // Generate cache key based on user and type
  const getCacheKey = () => {
    return `notifications_${user?.id}_${type || 'all'}`;
  };

  // Check if cache is still valid
  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_TTL;
  };

  // Initialize with cached data if available
  const initializeFromCache = () => {
    if (!user?.id) return false;
    
    const cacheKey = getCacheKey();
    const cached = notificationCache.get(cacheKey);
    
    if (cached && isCacheValid(cached.timestamp)) {
      setNotifications(cached.notifications);
      setUnreadCount(cached.unreadCount);
      setIsInitialized(true);
      
      log.debug('useNotifications', `Initialized from cache: ${cached.notifications.length} notifications`);
      return true;
    }
    
    return false;
  };

  // Save to cache
  const saveToCache = (notifications: NotificationWithActor[], unreadCount: number) => {
    if (!user?.id) return;
    
    const cacheKey = getCacheKey();
    notificationCache.set(cacheKey, {
      notifications,
      unreadCount,
      timestamp: Date.now()
    });
    
    log.debug('useNotifications', `Saved to cache: ${notifications.length} notifications`);
  };

  // Fetch notifications from the server
  const fetchNotifications = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!user?.id) return;

    try {
      // Only show loading skeleton if we don't have any notifications yet AND no cache
      // AND this is not an append operation
      if (notifications.length === 0 && !append && !isInitialized) {
        setIsLoading(true);
      }
      setError(null);

      const response = await notificationService.getNotifications(
        user.id,
        page,
        25,
        type
      );

      // Apply smart filtering to prevent notifications from current space
      const filteredNotifications = NotificationFiltering.filterNotifications(response.notifications);
      
      if (append) {
        setNotifications(prev => [...prev, ...filteredNotifications]);
      } else {
        setNotifications(filteredNotifications);
      }

      // Also filter the unread count
      const filteredUnreadCount = NotificationFiltering.getFilteredUnreadCount(
        response.notifications.filter(n => !n.read)
      );
      setUnreadCount(filteredUnreadCount);
      setHasMore(response.hasMore);
      setCurrentPage(page);

      // Save to cache if this is the first page (save filtered data)
      if (page === 1 && !append) {
        saveToCache(filteredNotifications, filteredUnreadCount);
      }

      log.debug('useNotifications', `Fetched ${response.notifications.length} notifications, filtered to ${filteredNotifications.length}, page ${page}`, {
        originalCount: response.notifications.length,
        filteredCount: filteredNotifications.length,
        unreadCount: filteredUnreadCount,
        currentPage: page
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(errorMessage);
      log.error('useNotifications', 'Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, type, notifications.length, isInitialized]);

  // Load more notifications (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || !user?.id) return;

    await fetchNotifications(currentPage + 1, true);
  }, [hasMore, isLoading, currentPage, fetchNotifications, user?.id]);

  // Mark notifications as read but keep them visible
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    if (!user?.id || notificationIds.length === 0) return;

    try {
      await notificationService.markAsRead(notificationIds);

      // Mark notifications as read but keep them in the list
      setNotifications(prev => 
        prev.map(notification => 
          notificationIds.includes(notification.id)
            ? { ...notification, read: true }
            : notification
        )
      );

      // Update unread count
      const readCount = notifications.filter(n => 
        notificationIds.includes(n.id) && !n.read
      ).length;
      setUnreadCount(prev => Math.max(0, prev - readCount));

      // Update cache with modified notifications
      const updatedNotifications = notifications.map(notification => 
        notificationIds.includes(notification.id)
          ? { ...notification, read: true }
          : notification
      );
      saveToCache(updatedNotifications, Math.max(0, unreadCount - readCount));

      log.debug('useNotifications', `Marked ${notificationIds.length} notifications as read and kept in list`);
    } catch (err) {
      log.error('useNotifications', 'Error marking notifications as read:', err);
      setError('Failed to mark notifications as read');
    }
  }, [user?.id, notifications, unreadCount, saveToCache]);

  // Mark all notifications as read and clear the list
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      await notificationService.markAllAsRead(user.id);

      // Clear all notifications from the list
      setNotifications([]);
      setUnreadCount(0);

      log.debug('useNotifications', 'Marked all notifications as read and cleared list');
    } catch (err) {
      log.error('useNotifications', 'Error marking all notifications as read:', err);
      setError('Failed to mark all notifications as read');
    }
  }, [user?.id]);

  // Mark all visible unread notifications as read (for when user views notifications page)
  const markVisibleAsRead = useCallback(async () => {
    if (!user?.id) return;

    const unreadNotificationIds = notifications
      .filter(notification => !notification.read)
      .map(notification => notification.id);

    if (unreadNotificationIds.length === 0) return;

    try {
      await notificationService.markAsRead(unreadNotificationIds);

      // Mark all unread notifications as read but keep them in the list
      setNotifications(prev => 
        prev.map(notification => 
          !notification.read
            ? { ...notification, read: true }
            : notification
        )
      );

      // Update unread count to 0
      setUnreadCount(0);

      // Update cache with modified notifications
      const updatedNotifications = notifications.map(notification => 
        !notification.read
          ? { ...notification, read: true }
          : notification
      );
      saveToCache(updatedNotifications, 0);

      log.debug('useNotifications', `Marked ${unreadNotificationIds.length} visible notifications as read`);
    } catch (err) {
      log.error('useNotifications', 'Error marking visible notifications as read:', err);
    }
  }, [user?.id, notifications, saveToCache]);

  // Refresh notifications
  const refresh = useCallback(() => {
    if (!user?.id) return;
    fetchNotifications(1, false);
  }, [fetchNotifications, user?.id]);

  // Handle real-time notification updates
  const handleRealtimeUpdate = useCallback((payload: any) => {
    const event = payload as unknown as NotificationRealtimeEvent;
    log.debug('useNotifications', 'Real-time notification event:', event);

    if (event.eventType === 'INSERT' && event.new) {
      const newNotification = event.new as NotificationWithActor;
      
      // Apply smart filtering to new notifications
      const shouldFilter = NotificationFiltering.shouldFilterNotification(newNotification);
      
      if (!shouldFilter) {
        // Add new notification to the top of the list
        setNotifications(prev => {
          const updated = [newNotification, ...prev];
          // Update cache with new notifications
          saveToCache(updated, unreadCount + 1);
          return updated;
        });
        setUnreadCount(prev => prev + 1);
      } else {
        log.debug('useNotifications', 'Filtered real-time notification from current space:', newNotification.id);
      }
    } else if (event.eventType === 'UPDATE' && event.new) {
      // Update existing notification
      setNotifications(prev => {
        const updated = prev.map(notification => 
          notification.id === event.new!.id 
            ? { ...notification, ...event.new }
            : notification
        );
        // Update cache with modified notifications
        saveToCache(updated, unreadCount);
        return updated;
      });
    } else if (event.eventType === 'DELETE' && event.old) {
      // Remove deleted notification
      setNotifications(prev => {
        const updated = prev.filter(notification => notification.id !== event.old!.id);
        const newUnreadCount = Math.max(0, unreadCount - (event.old.read ? 0 : 1));
        // Update cache with filtered notifications
        saveToCache(updated, newUnreadCount);
        return updated;
      });
      if (!event.old.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  }, [unreadCount, saveToCache]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id || !isInitialized) return;

    // Clean up existing subscription
    if (realtimeSubscriptionRef.current) {
      realtimeSubscriptionRef.current.unsubscribe();
    }

    // Create new subscription
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe();

    realtimeSubscriptionRef.current = subscription;

    log.debug('useNotifications', 'Real-time subscription established for user:', user.id);

    return () => {
      if (realtimeSubscriptionRef.current) {
        realtimeSubscriptionRef.current.unsubscribe();
        realtimeSubscriptionRef.current = null;
      }
    };
  }, [user?.id, isInitialized, handleRealtimeUpdate, supabase]);

  // Initial fetch
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setIsInitialized(false);
      return;
    }

    if (!isInitialized) {
      // Always try to initialize from cache first, regardless of page
      const cachedInitialized = initializeFromCache();
      
      if (!cachedInitialized) {
        // No valid cache, fetch from server
        log.debug('useNotifications', 'No valid cache - fetching fresh data');
        fetchNotifications(1, false).finally(() => {
          setIsInitialized(true);
        });
      } else {
        // We have valid cache, mark as initialized
        setIsInitialized(true);
        
        // If we're on notifications page, fetch fresh data in background
        const isOnNotificationsPage = window.location.pathname === '/notifs' || window.location.pathname.startsWith('/notifications');
        if (isOnNotificationsPage) {
          log.debug('useNotifications', 'On notifications page - using cache and fetching fresh data in background');
          // Fetch fresh data without showing loading state
          fetchNotifications(1, false);
        }
      }
    }
  }, [user?.id, fetchNotifications, isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeSubscriptionRef.current) {
        realtimeSubscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return {
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
  };
}

// Hook for notification preferences
export function useNotificationPreferences() {
  const { user } = useOptimizedAuth();
  const [preferences, setPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const prefs = await notificationService.getPreferences(user.id);
      setPreferences(prefs);

      log.debug('useNotificationPreferences', 'Fetched preferences:', prefs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preferences';
      setError(errorMessage);
      log.error('useNotificationPreferences', 'Error fetching preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const updatePreferences = useCallback(async (updates: any) => {
    if (!user?.id) return;

    try {
      setError(null);
      
      const updatedPrefs = await notificationService.updatePreferences(user.id, updates);
      setPreferences(updatedPrefs);

      log.debug('useNotificationPreferences', 'Updated preferences:', updatedPrefs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      log.error('useNotificationPreferences', 'Error updating preferences:', err);
      throw err;
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences
  };
}

// Hook for unread count only (lightweight)
export function useUnreadNotificationCount() {
  const { user } = useOptimizedAuth();
  const [count, setCount] = useState(globalNotificationCountStore.getCount());
  const [isLoading, setIsLoading] = useState(globalNotificationCountStore.isLoading);
  const realtimeSubscriptionRef = useRef<any>(null);
  const supabase = getSupabaseClient();

  // Subscribe to global store updates
  useEffect(() => {
    const unsubscribe = globalNotificationCountStore.subscribe(() => {
      setCount(globalNotificationCountStore.getCount());
      setIsLoading(globalNotificationCountStore.isLoading);
    });
    
    return unsubscribe;
  }, []);

  const fetchCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      globalNotificationCountStore.setLoading(true);
      
      // We need to get the full notifications to apply filtering
      // This is a bit more expensive but ensures accurate count
      const response = await notificationService.getNotifications(user.id, 1, 100);
      const unreadNotifications = response.notifications.filter(n => !n.read);
      
      // Apply smart filtering to get accurate unread count
      const filteredUnreadCount = NotificationFiltering.getFilteredUnreadCount(unreadNotifications);
      globalNotificationCountStore.setCount(filteredUnreadCount);
    } catch (err) {
      log.error('useUnreadNotificationCount', 'Error fetching unread count:', err);
    } finally {
      globalNotificationCountStore.setLoading(false);
    }
  }, [user?.id]);

  // Handle real-time updates for count only
  const handleRealtimeCountUpdate = useCallback((payload: any) => {
    const event = payload as unknown as NotificationRealtimeEvent;
    
    if (event.eventType === 'INSERT' && event.new) {
      const newNotification = event.new as NotificationWithActor;
      
      // Apply smart filtering to new notifications for count
      const shouldFilter = NotificationFiltering.shouldFilterNotification(newNotification);
      
      if (!shouldFilter) {
        globalNotificationCountStore.setCount(globalNotificationCountStore.getCount() + 1);
      }
    } else if (event.eventType === 'UPDATE' && event.new && event.old) {
      // If notification was marked as read
      if (event.old.read === false && event.new.read === true) {
        globalNotificationCountStore.setCount(Math.max(0, globalNotificationCountStore.getCount() - 1));
      }
    } else if (event.eventType === 'DELETE' && event.old && !event.old.read) {
      globalNotificationCountStore.setCount(Math.max(0, globalNotificationCountStore.getCount() - 1));
    }
  }, []);

  // Set up real-time subscription for count updates
  useEffect(() => {
    if (!user?.id) return;

    fetchCount();

    // Set up real-time subscription
    const subscription = supabase
      .channel('notification_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleRealtimeCountUpdate(payload);
        }
      )
      .subscribe();

    realtimeSubscriptionRef.current = subscription;

    return () => {
      if (realtimeSubscriptionRef.current) {
        realtimeSubscriptionRef.current.unsubscribe();
      }
    };
  }, [user?.id, fetchCount, handleRealtimeCountUpdate, supabase]);

  return {
    count,
    isLoading,
    refresh: fetchCount
  };
}