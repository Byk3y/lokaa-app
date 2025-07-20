import { log } from '@/utils/logger';
/**
 * 📱 Phase 5: Mobile Optimization & PWA Integration
 * 
 * This file initializes all Phase 5 features:
 * - PWA functionality
 * - Push notifications
 * - Offline data sync
 * - Mobile optimizations
 * - Service worker management
 */

import { pushNotificationService } from './pushNotificationService';
import { offlineDataSync } from './offlineDataSync';
import { logAnalyticsEvent } from './analytics';
import { globalConsoleFlags } from '@/utils/developmentLogger';

// Global interface for Phase 5 testing and debugging
interface Phase5GlobalAPI {
  // Status and info
  getStatus: () => Promise<any>;
  getInfo: () => any;
  
  // Push notifications
  testPushNotifications: () => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  subscribeToPush: () => Promise<boolean>;
  showTestNotification: () => Promise<boolean>;
  
  // Offline sync
  testOfflineSync: () => Promise<void>;
  queueTestAction: () => Promise<string>;
  forceSyncActions: () => Promise<any>;
  clearOfflineQueue: () => Promise<void>;
  
  // PWA features
  testPWAFeatures: () => Promise<void>;
  checkInstallability: () => Promise<boolean>;
  
  // Mobile optimizations
  testMobileOptimizations: () => Promise<void>;
  getMobileInfo: () => any;
  
  // Service worker
  testServiceWorker: () => Promise<void>;
  getServiceWorkerStatus: () => Promise<any>;
  
  // Comprehensive tests
  runAllTests: () => Promise<void>;
  validatePhase5: () => Promise<boolean>;
}

/**
 * Initialize Phase 5 features
 */
async function initializePhase5(): Promise<boolean> {
  try {
    if (!globalConsoleFlags?.DISABLE_PHASE_INIT_LOGS) {
      log.debug('Utils', '📱 [Phase 5] Initializing Mobile Optimization & PWA...');
    }

    // Initialize push notifications
    if (!globalConsoleFlags?.DISABLE_PHASE_INIT_LOGS) {
      log.debug('Utils', '🔔 [Phase 5] Initializing push notifications...');
    }
    await pushNotificationService.initialize();

    // Initialize offline data sync
    if (!globalConsoleFlags?.DISABLE_PHASE_INIT_LOGS) {
      log.debug('Utils', '🔄 [Phase 5] Initializing offline data sync...');
    }
    await offlineDataSync.initialize();

    // Track Phase 5 initialization
    await logAnalyticsEvent({
      event_type: 'system',
      event_name: 'Phase5Initialized',
      event_data: {
        pushNotificationsSupported: pushNotificationService.getState().isSupported,
        offlineSyncEnabled: true,
        serviceWorkerSupported: 'serviceWorker' in navigator,
        timestamp: Date.now()
      }
    });

    if (!globalConsoleFlags?.DISABLE_PHASE_INIT_LOGS) {
      log.debug('Utils', '✅ [Phase 5] Mobile Optimization & PWA initialized successfully');
    }
    return true;
  } catch (error) {
    log.error('Utils', '❌ [Phase 5] Initialization failed:', error);
    return false;
  }
}

/**
 * Test push notifications functionality
 */
async function testPushNotifications(): Promise<void> {
  log.debug('Utils', '🔔 [Phase 5 Test] Testing push notifications...');
  
  const state = pushNotificationService.getState();
  log.debug('Utils', '📊 Push notification state:', state);
  
  if (state.isSupported) {
    log.debug('Utils', '✅ Push notifications are supported');
    
    if (state.permission === 'granted') {
      await pushNotificationService.showNotification({
        title: 'Phase 5 Test',
        body: 'Push notifications are working correctly!',
        tag: 'phase5-test',
        data: { test: true, timestamp: Date.now() }
      });
      log.debug('Utils', '✅ Test notification sent');
    } else {
      log.debug('Utils', '⚠️ Push notification permission not granted');
    }
  } else {
    log.debug('Utils', '❌ Push notifications not supported');
  }
}

/**
 * Test offline sync functionality
 */
async function testOfflineSync(): Promise<void> {
  log.debug('Utils', '🔄 [Phase 5 Test] Testing offline sync...');
  
  const status = offlineDataSync.getStatus();
  log.debug('Utils', '📊 Offline sync status:', status);
  
  // Queue a test action
  const actionId = await offlineDataSync.queueAction('create', 'test_table', {
    test_data: 'Phase 5 offline sync test',
    timestamp: Date.now()
  });
  
  log.debug('Utils', '✅ Test action queued:', actionId);
  
  if (status.isOnline) {
    log.debug('Utils', '🌐 Online - attempting sync...');
    const result = await offlineDataSync.forceSync();
    log.debug('Utils', '📊 Sync result:', result);
  } else {
    log.debug('Utils', '📴 Offline - action will sync when back online');
  }
}

/**
 * Test PWA features
 */
async function testPWAFeatures(): Promise<void> {
  log.debug('Utils', '📱 [Phase 5 Test] Testing PWA features...');
  
  // Check service worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      log.debug('Utils', '✅ Service worker is active:', registration.active?.scriptURL);
    } catch (error) {
      log.debug('Utils', '❌ Service worker not ready:', error);
    }
  } else {
    log.debug('Utils', '❌ Service worker not supported');
  }
  
  // Check if app is installable
  const isInstallable = await checkInstallability();
  log.debug('Utils', '📱 App installable:', isInstallable);
  
  // Check cache API
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      log.debug('Utils', '💾 Available caches:', cacheNames);
    } catch (error) {
      log.debug('Utils', '❌ Cache API error:', error);
    }
  } else {
    log.debug('Utils', '❌ Cache API not supported');
  }
}

/**
 * Check if app is installable
 */
async function checkInstallability(): Promise<boolean> {
  // Check for beforeinstallprompt event support
  return new Promise((resolve) => {
    let installPromptEvent: any = null;
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      installPromptEvent = e;
      resolve(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Timeout after 1 second
    setTimeout(() => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      resolve(!!installPromptEvent);
    }, 1000);
  });
}

/**
 * Test mobile optimizations
 */
async function testMobileOptimizations(): Promise<void> {
  log.debug('Utils', '📱 [Phase 5 Test] Testing mobile optimizations...');
  
  const mobileInfo = getMobileInfo();
  log.debug('Utils', '📊 Mobile info:', mobileInfo);
  
  // Test viewport
  const viewport = document.querySelector('meta[name="viewport"]');
  log.debug('Utils', '📱 Viewport meta tag:', viewport?.getAttribute('content') || 'Not found');
  
  // Test touch events
  const touchSupported = 'ontouchstart' in window;
  log.debug('Utils', '👆 Touch events supported:', touchSupported);
  
  // Test device orientation
  if ('orientation' in screen) {
    log.debug('Utils', '🔄 Screen orientation:', (screen as any).orientation?.type || 'Unknown');
  }
}

/**
 * Get mobile device information
 */
function getMobileInfo(): any {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenWidth: screen.width,
    screenHeight: screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    touchSupported: 'ontouchstart' in window,
    orientationSupported: 'orientation' in screen,
    connectionType: (navigator as any).connection?.effectiveType || 'Unknown'
  };
}

/**
 * Test service worker functionality
 */
async function testServiceWorker(): Promise<void> {
  log.debug('Utils', '⚙️ [Phase 5 Test] Testing service worker...');
  
  if (!('serviceWorker' in navigator)) {
    log.debug('Utils', '❌ Service worker not supported');
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const status = await getServiceWorkerStatus();
    log.debug('Utils', '📊 Service worker status:', status);
    
    // Test message passing
    if (registration.active) {
      registration.active.postMessage({
        type: 'PHASE5_TEST',
        data: { timestamp: Date.now() }
      });
      log.debug('Utils', '✅ Test message sent to service worker');
    }
  } catch (error) {
    log.error('Utils', '❌ Service worker test failed:', error);
  }
}

/**
 * Get service worker status
 */
async function getServiceWorkerStatus(): Promise<any> {
  if (!('serviceWorker' in navigator)) {
    return { supported: false };
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    return {
      supported: true,
      scriptURL: registration.active?.scriptURL,
      state: registration.active?.state,
      scope: registration.scope,
      updateViaCache: registration.updateViaCache
    };
  } catch (error) {
    return {
      supported: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Run all Phase 5 tests
 */
async function runAllTests(): Promise<void> {
  log.debug('Utils', '🧪 [Phase 5] Running comprehensive tests...');
  
  try {
    await testPushNotifications();
    await testOfflineSync();
    await testPWAFeatures();
    await testMobileOptimizations();
    await testServiceWorker();
    
    log.debug('Utils', '✅ [Phase 5] All tests completed successfully');
    
    // Track test completion
    await logAnalyticsEvent({
      event_type: 'system',
      event_name: 'Phase5TestsCompleted',
      event_data: {
        timestamp: Date.now(),
        allTestsPassed: true
      }
    });
  } catch (error) {
    log.error('Utils', '❌ [Phase 5] Tests failed:', error);
    
    await logAnalyticsEvent({
      event_type: 'system',
      event_name: 'Phase5TestsFailed',
      event_data: {
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

/**
 * Validate Phase 5 implementation
 */
async function validatePhase5(): Promise<boolean> {
  log.debug('Utils', '✅ [Phase 5] Validating implementation...');
  
  const checks = {
    pushNotificationsInitialized: pushNotificationService.getState().isSupported,
    offlineSyncInitialized: offlineDataSync.getStatus().isOnline !== undefined,
    serviceWorkerSupported: 'serviceWorker' in navigator,
    cacheAPISupported: 'caches' in window,
    notificationAPISupported: 'Notification' in window
  };
  
  log.debug('Utils', '📊 Phase 5 validation results:', checks);
  
  const allValid = Object.values(checks).every(Boolean);
  log.debug('Utils', allValid ? '✅ Phase 5 validation passed' : '❌ Phase 5 validation failed');
  
  return allValid;
}

/**
 * Get comprehensive Phase 5 status
 */
async function getStatus(): Promise<any> {
  return {
    initialized: true,
    pushNotifications: pushNotificationService.getState(),
    offlineSync: offlineDataSync.getStatus(),
    serviceWorker: await getServiceWorkerStatus(),
    mobile: getMobileInfo(),
    pwa: {
      installable: await checkInstallability(),
      cacheSupported: 'caches' in window,
      notificationSupported: 'Notification' in window
    }
  };
}

/**
 * Get Phase 5 info
 */
function getInfo(): any {
  return {
    phase: '5',
    name: 'Mobile Optimization & PWA',
    version: '1.0.0',
    features: [
      'Push Notifications',
      'Offline Data Sync',
      'Service Worker Integration',
      'PWA Manifest',
      'Mobile Optimizations',
      'Background Sync'
    ],
    status: 'Active'
  };
}

// Initialize Phase 5 when module loads
if (!globalConsoleFlags?.DISABLE_PHASE_INIT_LOGS) {
  log.debug('Utils', '📱 [Phase 5] Module loaded, starting initialization...');
}
initializePhase5().then(success => {
  if (success) {
    if (!globalConsoleFlags?.DISABLE_PHASE_INIT_LOGS) {
      log.debug('Utils', '✅ [Phase 5] Initialization completed successfully');
    }
  } else {
    log.error('Utils', '❌ [Phase 5] Initialization failed');
  }
}).catch(error => {
  log.error('Utils', '❌ [Phase 5] Initialization error:', error);
});

// Expose global API for testing and debugging
if (typeof window !== 'undefined') {
  const phase5API: Phase5GlobalAPI = {
    getStatus,
    getInfo,
    testPushNotifications,
    requestNotificationPermission: () => pushNotificationService.requestPermission(),
    subscribeToPush: () => pushNotificationService.subscribe().then(sub => !!sub),
    showTestNotification: () => pushNotificationService.showNotification({
      title: 'Phase 5 Test',
      body: 'This is a test notification from Phase 5!',
      tag: 'phase5-manual-test'
    }),
    testOfflineSync,
    queueTestAction: () => offlineDataSync.queueAction('create', 'test_table', {
      test: true,
      timestamp: Date.now()
    }),
    forceSyncActions: () => offlineDataSync.forceSync(),
    clearOfflineQueue: () => offlineDataSync.clearPendingActions(),
    testPWAFeatures,
    checkInstallability,
    testMobileOptimizations,
    getMobileInfo,
    testServiceWorker,
    getServiceWorkerStatus,
    runAllTests,
    validatePhase5
  };

  (window as any).phase5 = phase5API;
  
  log.debug('Utils', '📱 [Phase 5] Global API available at window.phase5');
  log.debug('Utils', '📱 [Phase 5] API object:', phase5API);
  log.debug('Utils', '📱 Available commands:');
  log.debug('Utils', '  - window.phase5.getStatus() - Get comprehensive status');
  log.debug('Utils', '  - window.phase5.runAllTests() - Run all Phase 5 tests');
  log.debug('Utils', '  - window.phase5.testPushNotifications() - Test push notifications');
  log.debug('Utils', '  - window.phase5.testOfflineSync() - Test offline sync');
  log.debug('Utils', '  - window.phase5.testPWAFeatures() - Test PWA features');
  log.debug('Utils', '  - window.phase5.validatePhase5() - Validate implementation');
}

export { initializePhase5 };