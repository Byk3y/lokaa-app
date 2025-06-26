/**
 * 📱 bfcache-Compatible Service Worker
 * 
 * Minimal service worker optimized for bfcache eligibility.
 * Based on industry research: Complex service workers block bfcache.
 * 
 * This implementation enables PWA features while preserving browser optimization.
 */

const CACHE_VERSION = 'lokaa-bfcache-v1.0.0';
const CACHE_NAME = `lokaa-pwa-${CACHE_VERSION}`;

// Only cache essential offline resources (minimal approach)
const ESSENTIAL_CACHE = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// URLs to NEVER cache (preserve bfcache eligibility)
const NEVER_CACHE_PATTERNS = [
  // Auth and real-time endpoints that need fresh data
  /\/auth\//,
  /\/realtime\//,
  /supabase\.co/,
  /\/rest\/v1\//,
  
  // Development resources
  /@vite/,
  /\.vite/,
  /__vite_ping/,
  
  // API endpoints that need fresh data
  /\/api\//,
  /\/socket\./,
  
  // User-generated content
  /\/uploads\//,
  /\/media\//
];

// Service Worker Install
self.addEventListener('install', event => {
  console.log('📱 [ServiceWorker] Installing bfcache-compatible SW...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📱 [ServiceWorker] Caching essential resources only');
        return cache.addAll(ESSENTIAL_CACHE);
      })
      .then(() => {
        console.log('✅ [ServiceWorker] Installation complete - bfcache preserved');
        return self.skipWaiting();
      })
      .catch(error => {
        console.warn('⚠️ [ServiceWorker] Install failed:', error);
      })
  );
});

// Service Worker Activate
self.addEventListener('activate', event => {
  console.log('📱 [ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ [ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ [ServiceWorker] Activated - taking control');
        return self.clients.claim();
      })
  );
});

// Fetch Handler - Minimal intervention for bfcache
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip URLs that should NEVER be cached
  if (NEVER_CACHE_PATTERNS.some(pattern => pattern.test(url.href))) {
    return; // Let browser handle normally
  }
  
  // Only handle essential offline resources
  if (ESSENTIAL_CACHE.some(resource => url.pathname === resource)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            console.log('📱 [ServiceWorker] Serving from cache:', url.pathname);
            return response;
          }
          
          // Fetch and cache for offline
          return fetch(event.request)
            .then(response => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, responseClone));
              }
              return response;
            });
        })
        .catch(() => {
          // Offline fallback for essential resources
          if (url.pathname === '/' || url.pathname.includes('.html')) {
            return caches.match('/offline.html');
          }
        })
    );
  }
  
  // For all other requests, let browser handle normally
  // This preserves bfcache eligibility by not intercepting everything
});

// Background Sync (minimal)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('📱 [ServiceWorker] Background sync triggered');
    // Minimal background sync to preserve bfcache
  }
});

// Push Notifications (if needed)
self.addEventListener('push', event => {
  console.log('📱 [ServiceWorker] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'lokaa-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification('Lokaa', options)
  );
});

// Notification Click
self.addEventListener('notificationclick', event => {
  console.log('📱 [ServiceWorker] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

console.log('✅ [ServiceWorker] bfcache-compatible service worker loaded'); 