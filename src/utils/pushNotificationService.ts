import { log } from '@/utils/logger';
/**
 * 🔔 Push Notification Service - Phase 5 PWA
 * 
 * Comprehensive push notification system with:
 * - User permission management
 * - Subscription handling
 * - Integration with analytics
 * - Offline notification queuing
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { logAnalyticsEvent } from './analytics';
import { logError } from './errorHandlingSystem';

interface NotificationPermissionState {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
}

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_id?: string;
  device_info?: any;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private state: NotificationPermissionState;
  private vapidPublicKey = ''; // Will be set from environment or server
  private isInitialized = false;

  private constructor() {
    this.state = {
      permission: 'default',
      isSupported: this.checkSupport(),
      isSubscribed: false,
      subscription: null
    };
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize push notification service
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized || !this.state.isSupported) {
      return this.isInitialized;
    }

    try {
      log.debug('Utils', '🔔 [PushNotifications] Initializing...');

      // Update permission state
      this.state.permission = Notification.permission;

      // Check for existing subscription
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        this.state.subscription = subscription;
        this.state.isSubscribed = !!subscription;

        if (subscription) {
          log.debug('Utils', '🔔 [PushNotifications] Existing subscription found');
          await this.syncSubscriptionWithServer(subscription);
        }
      }

      this.isInitialized = true;
      log.debug('Utils', '✅ [PushNotifications] Initialized successfully');

      // Track initialization
      await logAnalyticsEvent({
        event_type: 'system',
        event_name: 'PushNotificationsInitialized',
        event_data: {
          supported: this.state.isSupported,
          permission: this.state.permission,
          subscribed: this.state.isSubscribed
        }
      });

      return true;
    } catch (error) {
      log.error('Utils', '❌ [PushNotifications] Initialization failed:', error);
      logError({
        message: error instanceof Error ? error.message : 'Push notification initialization failed',
        stack: error instanceof Error ? error.stack : undefined,
        component: 'PushNotificationService',
        operation: 'initialize',
        severity: 'medium'
      });
      return false;
    }
  }

  /**
   * Check if push notifications are supported
   */
  private checkSupport(): boolean {
    return (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  /**
   * Request notification permission from user
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.state.isSupported) {
      log.warn('Utils', '⚠️ [PushNotifications] Not supported in this browser');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.state.permission = permission;

      log.debug('Utils', `🔔 [PushNotifications] Permission ${permission}`);

      // Track permission request
      await logAnalyticsEvent({
        event_type: 'user',
        event_name: 'NotificationPermissionRequested',
        event_data: { permission }
      });

      return permission;
    } catch (error) {
      log.error('Utils', '❌ [PushNotifications] Permission request failed:', error);
      logError({
        message: error instanceof Error ? error.message : 'Permission request failed',
        stack: error instanceof Error ? error.stack : undefined,
        component: 'PushNotificationService',
        operation: 'requestPermission',
        severity: 'medium'
      });
      return 'denied';
    }
  }

  /**
   * Subscribe to push notifications
   */
  public async subscribe(): Promise<PushSubscription | null> {
    if (!this.state.isSupported || this.state.permission !== 'granted') {
      log.warn('Utils', '⚠️ [PushNotifications] Cannot subscribe - permission not granted');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Use VAPID key if available
      const subscribeOptions: PushSubscriptionOptions = {
        userVisibleOnly: true,
        ...(this.vapidPublicKey && {
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        })
      };

      const subscription = await registration.pushManager.subscribe(subscribeOptions);
      
      this.state.subscription = subscription;
      this.state.isSubscribed = true;

      log.debug('Utils', '🔔 [PushNotifications] Subscribed successfully');

      // Sync with server
      await this.syncSubscriptionWithServer(subscription);

      // Track subscription
      await logAnalyticsEvent({
        event_type: 'user',
        event_name: 'PushNotificationSubscribed',
        event_data: {
          endpoint: subscription.endpoint,
          hasKeys: !!(subscription.getKey('p256dh') && subscription.getKey('auth'))
        }
      });

      return subscription;
    } catch (error) {
      log.error('Utils', '❌ [PushNotifications] Subscription failed:', error);
      logError({
        message: error instanceof Error ? error.message : 'Subscription failed',
        stack: error instanceof Error ? error.stack : undefined,
        component: 'PushNotificationService',
        operation: 'subscribe',
        severity: 'medium'
      });
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  public async unsubscribe(): Promise<boolean> {
    if (!this.state.subscription) {
      return true;
    }

    try {
      const success = await this.state.subscription.unsubscribe();
      
      if (success) {
        // Remove from server
        await this.removeSubscriptionFromServer(this.state.subscription);
        
        this.state.subscription = null;
        this.state.isSubscribed = false;

        log.debug('Utils', '🔔 [PushNotifications] Unsubscribed successfully');

        // Track unsubscription
        await logAnalyticsEvent({
          event_type: 'user',
          event_name: 'PushNotificationUnsubscribed',
          event_data: { success }
        });
      }

      return success;
    } catch (error) {
      log.error('Utils', '❌ [PushNotifications] Unsubscription failed:', error);
      logError({
        message: error instanceof Error ? error.message : 'Unsubscription failed',
        stack: error instanceof Error ? error.stack : undefined,
        component: 'PushNotificationService',
        operation: 'unsubscribe',
        severity: 'medium'
      });
      return false;
    }
  }

  /**
   * Show local notification
   */
  public async showNotification(options: NotificationOptions): Promise<boolean> {
    if (!this.state.isSupported || this.state.permission !== 'granted') {
      log.warn('Utils', '⚠️ [PushNotifications] Cannot show notification - permission not granted');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const notificationOptions: NotificationOptions = {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        ...options,
        data: {
          timestamp: Date.now(),
          ...options.data
        }
      };

      await registration.showNotification(options.title, notificationOptions);

      log.debug('Utils', '🔔 [PushNotifications] Notification shown:', options.title);

      // Track notification
      await logAnalyticsEvent({
        event_type: 'system',
        event_name: 'LocalNotificationShown',
        event_data: {
          title: options.title,
          tag: options.tag,
          hasActions: !!(options.actions?.length)
        }
      });

      return true;
    } catch (error) {
      log.error('Utils', '❌ [PushNotifications] Show notification failed:', error);
      logError({
        message: error instanceof Error ? error.message : 'Show notification failed',
        stack: error instanceof Error ? error.stack : undefined,
        component: 'PushNotificationService',
        operation: 'showNotification',
        severity: 'medium'
      });
      return false;
    }
  }

  /**
   * Sync subscription with server
   */
  private async syncSubscriptionWithServer(subscription: PushSubscription): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');

      if (!p256dhKey || !authKey) {
        throw new Error('Missing subscription keys');
      }

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(p256dhKey),
          auth: this.arrayBufferToBase64(authKey)
        },
        user_id: user?.id,
        device_info: {
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        }
      };

      // Store subscription in database
      if (user?.id) {
        const { error } = await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh_key: subscriptionData.keys.p256dh,
          auth_key: subscriptionData.keys.auth,
          device_info: subscriptionData.device_info,
          is_active: true
        });

        if (error) {
          log.error('Utils', '❌ [PushNotifications] Database storage failed:', error);
          throw error;
        }
      }

      log.debug('Utils', '🔔 [PushNotifications] Subscription synced with server');
    } catch (error) {
      log.error('Utils', '❌ [PushNotifications] Server sync failed:', error);
      // Don't throw - this is not critical for local functionality
    }
  }

  /**
   * Remove subscription from server
   */
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      // Remove subscription from database
      const { error } = await supabase.from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);

      if (error) {
        log.error('Utils', '❌ [PushNotifications] Database removal failed:', error);
        throw error;
      }

      log.debug('Utils', '🔔 [PushNotifications] Subscription removed from server');
    } catch (error) {
      log.error('Utils', '❌ [PushNotifications] Server removal failed:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Utility: Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Utility: Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Get current state
   */
  public getState(): NotificationPermissionState {
    return { ...this.state };
  }

  /**
   * Set VAPID public key
   */
  public setVapidKey(key: string): void {
    this.vapidPublicKey = key;
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();

// Export types
export type { NotificationPermissionState, NotificationOptions, PushSubscriptionData }; 