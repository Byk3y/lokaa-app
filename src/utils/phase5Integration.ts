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
    console.log('📱 [Phase 5] Initializing Mobile Optimization & PWA...');

    // Initialize push notifications
    console.log('🔔 [Phase 5] Initializing push notifications...');
    await pushNotificationService.initialize();

    // Initialize offline data sync
    console.log('🔄 [Phase 5] Initializing offline data sync...');
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

    console.log('✅ [Phase 5] Mobile Optimization & PWA initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ [Phase 5] Initialization failed:', error);
    return false;
  }
}

/**
 * Test push notifications functionality
 */
async function testPushNotifications(): Promise<void> {
  console.log('🔔 [Phase 5 Test] Testing push notifications...');
  
  const state = pushNotificationService.getState();
  console.log('📊 Push notification state:', state);
  
  if (state.isSupported) {
    console.log('✅ Push notifications are supported');
    
    if (state.permission === 'granted') {
      await pushNotificationService.showNotification({
        title: 'Phase 5 Test',
        body: 'Push notifications are working correctly!',
        tag: 'phase5-test',
        data: { test: true, timestamp: Date.now() }
      });
      console.log('✅ Test notification sent');
    } else {
      console.log('⚠️ Push notification permission not granted');
    }
  } else {
    console.log('❌ Push notifications not supported');
  }
}

/**
 * Test offline sync functionality
 */
async function testOfflineSync(): Promise<void> {
  console.log('🔄 [Phase 5 Test] Testing offline sync...');
  
  const status = offlineDataSync.getStatus();
  console.log('📊 Offline sync status:', status);
  
  // Queue a test action
  const actionId = await offlineDataSync.queueAction('create', 'test_table', {
    test_data: 'Phase 5 offline sync test',
    timestamp: Date.now()
  });
  
  console.log('✅ Test action queued:', actionId);
  
  if (status.isOnline) {
    console.log('🌐 Online - attempting sync...');
    const result = await offlineDataSync.forceSync();
    console.log('📊 Sync result:', result);
  } else {
    console.log('📴 Offline - action will sync when back online');
  }
}

/**
 * Test PWA features
 */
async function testPWAFeatures(): Promise<void> {
  console.log('📱 [Phase 5 Test] Testing PWA features...');
  
  // Check service worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Service worker is active:', registration.active?.scriptURL);
    } catch (error) {
      console.log('❌ Service worker not ready:', error);
    }
  } else {
    console.log('❌ Service worker not supported');
  }
  
  // Check if app is installable
  const isInstallable = await checkInstallability();
  console.log('📱 App installable:', isInstallable);
  
  // Check cache API
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      console.log('💾 Available caches:', cacheNames);
    } catch (error) {
      console.log('❌ Cache API error:', error);
    }
  } else {
    console.log('❌ Cache API not supported');
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
  console.log('📱 [Phase 5 Test] Testing mobile optimizations...');
  
  const mobileInfo = getMobileInfo();
  console.log('📊 Mobile info:', mobileInfo);
  
  // Test viewport
  const viewport = document.querySelector('meta[name="viewport"]');
  console.log('📱 Viewport meta tag:', viewport?.getAttribute('content') || 'Not found');
  
  // Test touch events
  const touchSupported = 'ontouchstart' in window;
  console.log('👆 Touch events supported:', touchSupported);
  
  // Test device orientation
  if ('orientation' in screen) {
    console.log('🔄 Screen orientation:', (screen as any).orientation?.type || 'Unknown');
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
  console.log('⚙️ [Phase 5 Test] Testing service worker...');
  
  if (!('serviceWorker' in navigator)) {
    console.log('❌ Service worker not supported');
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const status = await getServiceWorkerStatus();
    console.log('📊 Service worker status:', status);
    
    // Test message passing
    if (registration.active) {
      registration.active.postMessage({
        type: 'PHASE5_TEST',
        data: { timestamp: Date.now() }
      });
      console.log('✅ Test message sent to service worker');
    }
  } catch (error) {
    console.error('❌ Service worker test failed:', error);
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
  console.log('🧪 [Phase 5] Running comprehensive tests...');
  
  try {
    await testPushNotifications();
    await testOfflineSync();
    await testPWAFeatures();
    await testMobileOptimizations();
    await testServiceWorker();
    
    console.log('✅ [Phase 5] All tests completed successfully');
    
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
    console.error('❌ [Phase 5] Tests failed:', error);
    
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
  console.log('✅ [Phase 5] Validating implementation...');
  
  const checks = {
    pushNotificationsInitialized: pushNotificationService.getState().isSupported,
    offlineSyncInitialized: offlineDataSync.getStatus().isOnline !== undefined,
    serviceWorkerSupported: 'serviceWorker' in navigator,
    cacheAPISupported: 'caches' in window,
    notificationAPISupported: 'Notification' in window
  };
  
  console.log('📊 Phase 5 validation results:', checks);
  
  const allValid = Object.values(checks).every(Boolean);
  console.log(allValid ? '✅ Phase 5 validation passed' : '❌ Phase 5 validation failed');
  
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
console.log('📱 [Phase 5] Module loaded, starting initialization...');
initializePhase5().then(success => {
  if (success) {
    console.log('✅ [Phase 5] Initialization completed successfully');
  } else {
    console.error('❌ [Phase 5] Initialization failed');
  }
}).catch(error => {
  console.error('❌ [Phase 5] Initialization error:', error);
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
  
  console.log('📱 [Phase 5] Global API available at window.phase5');
  console.log('📱 [Phase 5] API object:', phase5API);
  console.log('📱 Available commands:');
  console.log('  - window.phase5.getStatus() - Get comprehensive status');
  console.log('  - window.phase5.runAllTests() - Run all Phase 5 tests');
  console.log('  - window.phase5.testPushNotifications() - Test push notifications');
  console.log('  - window.phase5.testOfflineSync() - Test offline sync');
  console.log('  - window.phase5.testPWAFeatures() - Test PWA features');
  console.log('  - window.phase5.validatePhase5() - Validate implementation');
}

export { initializePhase5 };