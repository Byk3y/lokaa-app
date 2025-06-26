/**
 * 📱 bfcache-Compatible Service Worker
 * 
 * Simple service worker designed for PWA functionality while preserving
 * browser's native Back/Forward Cache (bfcache) optimization.
 * 
 * Based on research: Complex service workers block bfcache.
 * This minimal implementation enables PWA features without reload issues.
 */

const CACHE_VERSION = '2.0.0';
const CACHE_NAME = `lokaa-pwa-v${CACHE_VERSION}`;

// Only cache essential offline resources
const ESSENTIAL_RESOURCES = [
  '/offline.html',
  '/manifest.json'
];

// URLs to never cache (preserve bfcache eligibility)
const NEVER_CACHE = [
  // Auth and real-time endpoints
  /\/auth\//,
  /\/realtime\//,
  /supabase\.co/,
  /\/rest\/v1\//,
  // Development resources
  /@vite/,
  /\.vite/,
  /__vite_ping/,
  /hot-update/
];

/**
 * Install Event - Minimal caching
 */
self.addEventListener('install', (event) => {
  console.log('📱 [ServiceWorker] Installing bfcache-compatible version');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ESSENTIAL_RESOURCES))
      .then(() => {
        console.log('📱 [ServiceWorker] Essential resources cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.warn('📱 [ServiceWorker] Install warning:', error);
      })
  );
});

/**
 * Activate Event - Clean old caches
 */
self.addEventListener('activate', (event) => {
  console.log('📱 [ServiceWorker] Activating bfcache-compatible version');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        const oldCaches = cacheNames.filter(name => 
          name.startsWith('lokaa-') && name !== CACHE_NAME
        );
        
        return Promise.all(
          oldCaches.map(name => {
            console.log('🗑️ [ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
        );
      })
      .then(() => clients.claim())
      .then(() => {
        console.log('📱 [ServiceWorker] Activated and claimed clients');
      })
      .catch(error => {
        console.warn('📱 [ServiceWorker] Activation warning:', error);
      })
  );
});

/**
 * Fetch Event - Minimal intervention for bfcache compatibility
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip URLs that should never be cached
  if (NEVER_CACHE.some(pattern => pattern.test(url.href))) {
    return;
  }
  
  // Only provide offline fallback for navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  
  // Let everything else go through normally for bfcache compatibility
});

/**
 * Handle navigation requests with offline fallback
 */
async function handleNavigation(request) {
  try {
    // Try network first
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Network failed, return offline page
    console.log('📱 [ServiceWorker] Network failed, showing offline page');
    const cache = await caches.open(CACHE_NAME);
    const offlinePage = await cache.match('/offline.html');
    
    if (offlinePage) {
      return offlinePage;
    }
    
    // Fallback if offline page not cached
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Lokaa</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0; padding: 20px; background: #f5f5f5; color: #333;
              display: flex; align-items: center; justify-content: center;
              min-height: 100vh; text-align: center;
            }
            .container { max-width: 400px; }
            h1 { color: #666; margin-bottom: 20px; }
            p { line-height: 1.5; margin-bottom: 20px; }
            button { 
              background: #007bff; color: white; border: none; 
              padding: 12px 24px; border-radius: 6px; cursor: pointer;
              font-size: 16px;
            }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📱 You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

/**
 * Message Event - Handle messages from main thread
 */
self.addEventListener('message', (event) => {
  console.log('📱 [ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('📱 [ServiceWorker] bfcache-compatible service worker loaded'); 