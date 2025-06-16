/**
 * 🔔 usePushNotifications Hook - Phase 5 PWA
 * 
 * React hook for push notification functionality:
 * - Permission management
 * - Subscription handling
 * - Local notifications
 * - Integration with analytics
 */

import { useState, useEffect, useCallback } from 'react';
import { pushNotificationService, type NotificationPermissionState, type NotificationOptions } from '@/utils/pushNotificationService';
import { toast } from '@/hooks/use-toast';

interface UsePushNotificationsReturn {
  // State
  state: NotificationPermissionState;
  isLoading: boolean;
  
  // Actions
  requestPermission: () => Promise<NotificationPermission>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  showNotification: (options: NotificationOptions) => Promise<boolean>;
  
  // Utilities
  canRequestPermission: boolean;
  canSubscribe: boolean;
  shouldShowPrompt: boolean;
}

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const [state, setState] = useState<NotificationPermissionState>(pushNotificationService.getState());
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Initialize push notifications
   */
  useEffect(() => {
    const initializePushNotifications = async () => {
      setIsLoading(true);
      try {
        await pushNotificationService.initialize();
        setState(pushNotificationService.getState());
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializePushNotifications();
  }, []);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    setIsLoading(true);
    try {
      const permission = await pushNotificationService.requestPermission();
      setState(pushNotificationService.getState());
      
      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive important updates and notifications.",
          variant: "default",
          duration: 5000
        });
      } else if (permission === 'denied') {
        toast({
          title: "Notifications Blocked",
          description: "You can enable notifications in your browser settings if you change your mind.",
          variant: "destructive",
          duration: 8000
        });
      }
      
      return permission;
    } catch (error) {
      console.error('Failed to request permission:', error);
      toast({
        title: "Permission Request Failed",
        description: "Unable to request notification permission. Please try again.",
        variant: "destructive",
        duration: 5000
      });
      return 'denied';
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (state.permission !== 'granted') {
      const permission = await requestPermission();
      if (permission !== 'granted') {
        return false;
      }
    }

    setIsLoading(true);
    try {
      const subscription = await pushNotificationService.subscribe();
      setState(pushNotificationService.getState());
      
      if (subscription) {
        toast({
          title: "Push Notifications Active",
          description: "You're now subscribed to push notifications for important updates.",
          variant: "default",
          duration: 5000
        });
        return true;
      } else {
        toast({
          title: "Subscription Failed",
          description: "Unable to subscribe to push notifications. Please try again.",
          variant: "destructive",
          duration: 5000
        });
        return false;
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
      toast({
        title: "Subscription Error",
        description: "An error occurred while subscribing to notifications.",
        variant: "destructive",
        duration: 5000
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [state.permission, requestPermission]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const success = await pushNotificationService.unsubscribe();
      setState(pushNotificationService.getState());
      
      if (success) {
        toast({
          title: "Unsubscribed",
          description: "You've been unsubscribed from push notifications.",
          variant: "default",
          duration: 5000
        });
      }
      
      return success;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      toast({
        title: "Unsubscribe Failed",
        description: "Unable to unsubscribe from notifications. Please try again.",
        variant: "destructive",
        duration: 5000
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Show local notification
   */
  const showNotification = useCallback(async (options: NotificationOptions): Promise<boolean> => {
    try {
      return await pushNotificationService.showNotification(options);
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }, []);

  // Computed properties
  const canRequestPermission = state.isSupported && state.permission === 'default';
  const canSubscribe = state.isSupported && state.permission === 'granted' && !state.isSubscribed;
  const shouldShowPrompt = canRequestPermission && !isLoading;

  return {
    state,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    canRequestPermission,
    canSubscribe,
    shouldShowPrompt
  };
};

/**
 * Hook for simplified notification permission management
 */
export const useNotificationPermission = () => {
  const { state, requestPermission, canRequestPermission, isLoading } = usePushNotifications();
  
  return {
    permission: state.permission,
    isSupported: state.isSupported,
    canRequest: canRequestPermission,
    isLoading,
    request: requestPermission
  };
};

/**
 * Hook for showing local notifications
 */
export const useLocalNotifications = () => {
  const { showNotification, state } = usePushNotifications();
  
  const notify = useCallback(async (title: string, body: string, options?: Partial<NotificationOptions>) => {
    if (state.permission !== 'granted') {
      console.warn('Cannot show notification - permission not granted');
      return false;
    }
    
    return await showNotification({
      title,
      body,
      ...options
    });
  }, [showNotification, state.permission]);
  
  return {
    notify,
    canNotify: state.permission === 'granted',
    isSupported: state.isSupported
  };
}; 