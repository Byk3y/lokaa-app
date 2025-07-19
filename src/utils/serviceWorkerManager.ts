import { log } from '@/utils/logger';
/**
 * 🔧 Phase 6A: Service Worker Manager
 * 
 * Manages service worker registration, updates, and lifecycle
 * with development-friendly features and error handling.
 */

import { errorHandlingSystem, ErrorType } from './errorHandlingSystem';
import { toast } from '@/hooks/use-toast';
import { useSecureSession } from '@/hooks/useSecureSession';

interface ServiceWorkerConfig {
  enableDebugMode?: boolean;
  enableBackgroundSync?: boolean;
  enablePushNotifications?: boolean;
  updateCheckInterval?: number;
  skipWaiting?: boolean;
}

interface CacheInfo {
  [cacheName: string]: {
    count: number;
    maxSize: number | string;
    urls: string[];
  };
}

interface OfflineAction {
  type: 'post' | 'comment' | 'like' | 'join';
  data: any;
  timestamp: number;
}

interface ServiceWorkerEventHandlers {
  onInstalled?: () => void;
  onActivated?: () => void;
  onControllerChanged?: () => void;
  onUpdateAvailable?: () => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

interface ServiceWorkerInfo {
  registration: ServiceWorkerRegistration | null;
  isSupported: boolean;
  isRegistered: boolean;
  isControlling: boolean;
  state: 'unsupported' | 'registering' | 'registered' | 'activated' | 'error';
}

class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig;
  private updateCheckTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = navigator.onLine;
  private pendingActions: OfflineAction[] = [];
  private handlers: ServiceWorkerEventHandlers = {};
  private isDevelopment: boolean;

  constructor(config: ServiceWorkerConfig = {}) {
    this.config = {
      enableDebugMode: false,
      enableBackgroundSync: true,
      enablePushNotifications: false,
      updateCheckInterval: 60000, // 1 minute
      skipWaiting: true,
      ...config
    };
    
    this.isDevelopment = import.meta.env.DEV;
    
    if (this.isDevelopment) {
      log.debug('Utils', '🔧 [ServiceWorkerManager] Development mode detected');
    }
    
    this.setupOnlineOfflineListeners();
  }

  public static getInstance(config?: ServiceWorkerConfig): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager(config);
    }
    return ServiceWorkerManager.instance;
  }

  /**
   * Initialize service worker manager (works with vite-plugin-pwa auto-registration)
   */
  async register(swPath?: string, options?: RegistrationOptions): Promise<boolean> {
    if (!this.isSupported()) {
      log.debug('Utils', '🚫 [ServiceWorkerManager] Service workers not supported');
      return false;
    }

    // In development, unregister any existing service workers
    if (this.isDevelopment) {
      log.debug('Utils', '🧹 [ServiceWorkerManager] Development mode: Clearing service workers...');
      await this.unregisterAll();
      return false;
    }

    try {
      log.debug('Utils', '🔧 [ServiceWorkerManager] Initializing with vite-plugin-pwa...');
      
      // Check for existing registration (from vite-plugin-pwa)
      const existingRegistration = await navigator.serviceWorker.getRegistration();
      
      if (existingRegistration) {
        log.debug('Utils', '✅ [ServiceWorkerManager] Found existing service worker registration');
        this.registration = existingRegistration;
      } else if (!this.isDevelopment) {
        // Only wait for registration in production
        log.debug('Utils', '🔄 [ServiceWorkerManager] Waiting for vite-plugin-pwa registration...');
        
        // Wait up to 5 seconds for registration
        let attempts = 0;
        while (attempts < 10 && !this.registration) {
          await new Promise(resolve => setTimeout(resolve, 500));
          this.registration = await navigator.serviceWorker.getRegistration();
          attempts++;
        }
        
        if (!this.registration) {
          log.warn('Utils', '⚠️ [ServiceWorkerManager] No service worker registration found');
          return false;
        }
      }

      // Only set up event listeners and check for updates in production
      if (!this.isDevelopment && this.registration) {
        this.setupEventListeners();
        await this.checkForUpdates();
        log.debug('Utils', '✅ [ServiceWorkerManager] Service worker manager initialized successfully');
        this.handlers.onInstalled?.();
      }
      
      return !this.isDevelopment;
    } catch (error) {
      log.error('Utils', '❌ [ServiceWorkerManager] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Development helper: Clear stale service worker registrations
   */
  async clearStaleRegistrations(): Promise<void> {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      for (const registration of registrations) {
        // Check if registration is for a different port (development scenario)
        const registrationScope = new URL(registration.scope);
        const currentUrl = new URL(window.location.href);
        
        if (registrationScope.port !== currentUrl.port && this.isDevelopment) {
          log.debug('Utils', '🗑️ [ServiceWorkerManager] Clearing stale registration:', registration.scope);
          await registration.unregister();
        }
      }
    } catch (error) {
      log.warn('Utils', '⚠️ [ServiceWorkerManager] Failed to clear stale registrations:', error);
    }
  }

  /**
   * Development helper: Completely unregister all service workers
   */
  async unregisterAll(): Promise<boolean> {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      await Promise.all(
        registrations.map(registration => {
          log.debug('Utils', '🗑️ [ServiceWorkerManager] Unregistering:', registration.scope);
          return registration.unregister();
        })
      );
      
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          log.debug('Utils', '🗑️ [ServiceWorkerManager] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
      
      log.debug('Utils', '✅ [ServiceWorkerManager] All service workers and caches cleared');
      return true;
    } catch (error) {
      log.error('Utils', '❌ [ServiceWorkerManager] Failed to unregister:', error);
      return false;
    }
  }

  /**
   * Set up event listeners for service worker events
   */
  private setupEventListeners(): void {
    if (!this.registration) return;

    // Listen for service worker state changes
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration?.installing;
      if (!newWorker) return;

      log.debug('Utils', '🔄 [ServiceWorkerManager] Update found, installing new version...');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          log.debug('Utils', '🆕 [ServiceWorkerManager] New version available');
          this.handlers.onUpdateAvailable?.();
        }
      });
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      log.debug('Utils', '🔄 [ServiceWorkerManager] Controller changed');
      this.handlers.onControllerChanged?.();
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      log.debug('Utils', '📨 [ServiceWorkerManager] Message from SW:', event.data);
    });
  }

  /**
   * Check for service worker updates
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
    } catch (error) {
      log.warn('Utils', '⚠️ [ServiceWorkerManager] Update check failed:', error);
    }
  }

  /**
   * Skip waiting and activate new service worker immediately
   */
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) return;

    // Send skip waiting message to service worker
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * Check if service workers are supported
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Get current service worker information
   */
  getInfo(): ServiceWorkerInfo {
    return {
      registration: this.registration,
      isSupported: this.isSupported(),
      isRegistered: !!this.registration,
      isControlling: !!navigator.serviceWorker.controller,
      state: this.getState()
    };
  }

  /**
   * Get current state
   */
  private getState(): ServiceWorkerInfo['state'] {
    if (!this.isSupported()) return 'unsupported';
    if (!this.registration) return 'registering';
    if (this.registration.active) return 'activated';
    if (this.registration.installing) return 'registering';
    return 'registered';
  }

  /**
   * Set event handlers
   */
  setHandlers(handlers: ServiceWorkerEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Send message to service worker
   */
  async sendMessage(message: any): Promise<void> {
    if (!navigator.serviceWorker.controller) {
      log.warn('Utils', '⚠️ [ServiceWorkerManager] No active service worker to send message to');
      return;
    }

    navigator.serviceWorker.controller.postMessage(message);
  }

  /**
   * Get cache information
   */
  async getCacheInfo(): Promise<{ name: string; size: number }[]> {
    try {
      const cacheNames = await caches.keys();
      const cacheInfo = await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          return { name, size: keys.length };
        })
      );
      return cacheInfo;
    } catch (error) {
      log.error('Utils', '❌ [ServiceWorkerManager] Failed to get cache info:', error);
      return [];
    }
  }

  /**
   * Development helper: Force reload without cache
   */
  async hardReload(): Promise<void> {
    if (this.isDevelopment) {
      await this.unregisterAll();
      window.location.reload();
    }
  }

  /**
   * Set up online/offline event listeners
   */
  private setupOnlineOfflineListeners(): void {
    window.addEventListener('online', () => {
      log.debug('Utils', '🌐 [ServiceWorkerManager] Back online');
      this.isOnline = true;
      this.processPendingActions();
      
      toast({
        title: "Back Online",
        description: "Syncing your offline actions...",
        variant: "default"
      });
    });

    window.addEventListener('offline', () => {
      log.debug('Utils', '📴 [ServiceWorkerManager] Gone offline');
      this.isOnline = false;
      
      toast({
        title: "You're Offline",
        description: "Don't worry! Your actions will sync when you're back online.",
        variant: "default"
      });
    });
  }

  /**
   * Queue action for offline sync
   */
  public async queueOfflineAction(action: OfflineAction): Promise<void> {
    if (!this.config.enableBackgroundSync) return;

    try {
      // Add to local queue
      this.pendingActions.push(action);

      // Send to service worker for background sync
      await this.sendMessage({
        type: 'QUEUE_OFFLINE_ACTION',
        payload: action
      });

      log.debug('Utils', '📋 [ServiceWorkerManager] Action queued for offline sync:', action.type);
    } catch (error) {
      log.error('Utils', '❌ [ServiceWorkerManager] Failed to queue action:', error);
    }
  }

  /**
   * Process pending actions when back online
   */
  private async processPendingActions(): Promise<void> {
    if (this.pendingActions.length === 0) return;

    log.debug('Utils', `🔄 [ServiceWorkerManager] Processing ${this.pendingActions.length} pending actions`);

    const processedActions: OfflineAction[] = [];

    for (const action of this.pendingActions) {
      try {
        await this.processAction(action);
        processedActions.push(action);
      } catch (error) {
        log.error('Utils', '❌ [ServiceWorkerManager] Failed to process action:', error);
      }
    }

    // Remove processed actions
    this.pendingActions = this.pendingActions.filter(
      action => !processedActions.includes(action)
    );

    if (processedActions.length > 0) {
      toast({
        title: "Sync Complete",
        description: `${processedActions.length} offline actions synchronized`,
        variant: "default"
      });
    }
  }

  /**
   * Process individual offline action
   */
  private async processAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'post':
        await this.syncOfflinePost(action.data);
        break;
      case 'comment':
        await this.syncOfflineComment(action.data);
        break;
      case 'like':
        await this.syncOfflineLike(action.data);
        break;
      case 'join':
        await this.syncOfflineJoin(action.data);
        break;
      default:
        log.warn('Utils', 'Unknown action type:', action.type);
    }
  }

  /**
   * Sync offline post
   */
  private async syncOfflinePost(data: any): Promise<void> {
    const { fetchWithCsrf } = useSecureSession();
    const response = await fetchWithCsrf('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Post sync failed: ${response.status}`);
    }
  }

  /**
   * Sync offline comment
   */
  private async syncOfflineComment(data: any): Promise<void> {
    const { fetchWithCsrf } = useSecureSession();
    const response = await fetchWithCsrf('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Comment sync failed: ${response.status}`);
    }
  }

  /**
   * Sync offline like
   */
  private async syncOfflineLike(data: any): Promise<void> {
    const { fetchWithCsrf } = useSecureSession();
    const response = await fetchWithCsrf(`/api/posts/${data.postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Like sync failed: ${response.status}`);
    }
  }

  /**
   * Sync offline join action
   */
  private async syncOfflineJoin(data: any): Promise<void> {
    const { fetchWithCsrf } = useSecureSession();
    const response = await fetchWithCsrf(`/api/spaces/${data.spaceId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Join sync failed: ${response.status}`);
    }
  }

  /**
   * Check if user is online
   */
  public isUserOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Get pending actions count
   */
  public getPendingActionsCount(): number {
    return this.pendingActions.length;
  }

  /**
   * Expose debug methods to window object (development only)
   */
  private exposeDebugMethods(): void {
    if (typeof window !== 'undefined' && this.config.enableDebugMode) {
      (window as any).serviceWorkerManager = {
        getCacheInfo: () => this.getCacheInfo(),
        clearCaches: () => this.clearCaches(),
        checkForUpdates: () => this.checkForUpdates(),
        skipWaiting: () => this.skipWaiting(),
        queueAction: (action: OfflineAction) => this.queueOfflineAction(action),
        getPendingCount: () => this.getPendingActionsCount(),
        isOnline: () => this.isUserOnline()
      };
      
      log.debug('Utils', '🔧 [ServiceWorkerManager] Debug methods exposed to window.serviceWorkerManager');
    }
  }

  /**
   * Unregister service worker (for cleanup)
   */
  public async unregister(): Promise<void> {
    if (!this.registration) return;

    try {
      this.stopUpdateChecks();
      await this.registration.unregister();
      this.registration = null;
      log.debug('Utils', '🗑️ [ServiceWorkerManager] Service worker unregistered');
    } catch (error) {
      log.error('Utils', '❌ [ServiceWorkerManager] Unregister failed:', error);
    }
  }
}

// Export singleton instance
export const serviceWorkerManager = ServiceWorkerManager.getInstance({
  enableDebugMode: import.meta.env.DEV,
  enableBackgroundSync: true,
  enablePushNotifications: false,
  updateCheckInterval: 60000,
  skipWaiting: true
});

// Export class for custom instances
export { ServiceWorkerManager };

// Export types
export type { ServiceWorkerConfig, CacheInfo, OfflineAction };

// Development global helpers
if (process.env.NODE_ENV === 'development') {
  // Make available in console for debugging
  (window as any).serviceWorkerManager = serviceWorkerManager;
  
  // Add keyboard shortcut for quick unregister
  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'U') {
      log.debug('Utils', '🔧 [ServiceWorkerManager] Keyboard shortcut: Unregistering all service workers...');
      serviceWorkerManager.unregisterAll();
    }
  });
  
  log.debug('Utils', '🔧 [ServiceWorkerManager] Development helpers available:');
  log.debug('Utils', '  - window.serviceWorkerManager - Access manager in console');
  log.debug('Utils', '  - Ctrl+Shift+U - Unregister all service workers');
}

export default serviceWorkerManager; 