/**
 * Service Worker Cleanup Utility
 * 
 * Aggressively cleans up any existing service workers and caches
 * to prevent cached content from causing issues.
 */

export const forceCleanupServiceWorkers = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    console.log('🧹 [ServiceWorkerCleanup] Starting aggressive cleanup...');

    // 1. Unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(async (registration) => {
        console.log('🗑️ [ServiceWorkerCleanup] Unregistering:', registration.scope);
        return registration.unregister();
      })
    );

    // 2. Clear all caches
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(async (cacheName) => {
        console.log('🗑️ [ServiceWorkerCleanup] Deleting cache:', cacheName);
        return caches.delete(cacheName);
      })
    );

    // 3. Clear any workbox caches specifically
    const workboxCaches = cacheNames.filter(name => 
      name.includes('workbox') || 
      name.includes('lokaa') || 
      name.includes('precache') ||
      name.includes('runtime')
    );
    
    await Promise.all(
      workboxCaches.map(async (cacheName) => {
        console.log('🗑️ [ServiceWorkerCleanup] Deleting workbox cache:', cacheName);
        return caches.delete(cacheName);
      })
    );

    console.log('✅ [ServiceWorkerCleanup] Cleanup completed successfully');
  } catch (error) {
    console.error('❌ [ServiceWorkerCleanup] Cleanup failed:', error);
  }
};

// Auto-run cleanup when this module is imported
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Run cleanup immediately
  forceCleanupServiceWorkers();
}