/**
 * 🔧 Phase 6A: Service Worker Implementation
 * 
 * Comprehensive service worker with:
 * - Multi-layer caching strategies
 * - Offline fallback pages
 * - Background sync for critical operations
 * - Smart cache management with TTL
 * - Integration with error handling system
 * - Development-friendly port detection
 */

const CACHE_VERSION = '1.0.0';
const CACHE_PREFIX = 'lokaa-connect-spaces';

// Development mode detection
const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// Cache names for different strategies
const CACHES = {
  STATIC: `${CACHE_PREFIX}-static-v${CACHE_VERSION}`,
  DYNAMIC: `${CACHE_PREFIX}-dynamic-v${CACHE_VERSION}`,
  API: `${CACHE_PREFIX}-api-v${CACHE_VERSION}`,
  IMAGES: `${CACHE_PREFIX}-images-v${CACHE_VERSION}`,
  OFFLINE: `${CACHE_PREFIX}-offline-v${CACHE_VERSION}`
};

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/offline.html',
  // Core JS/CSS assets will be added dynamically
];

// API endpoints that should be cached
const CACHEABLE_API_PATTERNS = [
  /\/api\/spaces\/[^\/]+\/posts/,
  /\/api\/spaces\/[^\/]+\/members/,
  /\/api\/spaces\/[^\/]+$/,
  /\/api\/user\/profile/,
  /\/rest\/v1\/spaces/,
  /\/rest\/v1\/posts/,
  /\/rest\/v1\/space_members/
];

// URLs that should never be cached
const NEVER_CACHE_PATTERNS = [
  /\/auth\//,
  /\/api\/auth/,
  /\/rest\/v1\/auth/,
  /realtime/,
  /\/admin\//,
  /hot-update/,
  // RESEARCH FIX: Bypass all Supabase requests to prevent auth conflicts
  /nmddvthcsyppyjncqfsk\.supabase\.co/,
  /supabase\.co/,
  /\/rest\/v1\//,
  /\/realtime\/v1\//,
  /\/auth\/v1\//,
  /\/storage\/v1\//,
  // Development specific patterns
  ...(isDevelopment ? [
    /@vite/,
    /\.vite/,
    /__vite_ping/,
    /node_modules/
  ] : [])
];

// Maximum cache sizes to prevent storage overflow
const MAX_CACHE_SIZES = {
  [CACHES.STATIC]: 50,
  [CACHES.DYNAMIC]: 100,
  [CACHES.API]: 200,
  [CACHES.IMAGES]: 150,
  [CACHES.OFFLINE]: 10
};

// Cache TTL (Time To Live) in milliseconds
const CACHE_TTL = {
  STATIC: isDevelopment ? 5 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // 5 minutes in dev, 7 days in prod
  DYNAMIC: isDevelopment ? 1 * 60 * 1000 : 24 * 60 * 60 * 1000,    // 1 minute in dev, 1 day in prod  
  API: isDevelopment ? 30 * 1000 : 5 * 60 * 1000,                  // 30 seconds in dev, 5 minutes in prod
  IMAGES: 30 * 24 * 60 * 60 * 1000 // 30 days
};

/**
 * Install Event - Cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('🔧 [ServiceWorker] Installing...', isDevelopment ? '(Development Mode)' : '(Production Mode)');
  
  event.waitUntil(
    (async () => {
      try {
        // In development, don't cache as aggressively
        if (isDevelopment) {
          console.log('⚡ [ServiceWorker] Development mode - minimal caching');
          
          // Only cache the offline page in development
          const offlineCache = await caches.open(CACHES.OFFLINE);
          await offlineCache.add('/offline.html');
        } else {
          // Full caching in production
          const cache = await caches.open(CACHES.STATIC);
          await cache.addAll(STATIC_ASSETS);
          
          const offlineCache = await caches.open(CACHES.OFFLINE);
          await offlineCache.add('/offline.html');
        }
        
        console.log('✅ [ServiceWorker] Assets cached');
        
        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('❌ [ServiceWorker] Install failed:', error);
      }
    })()
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 [ServiceWorker] Activating...');
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name.startsWith(CACHE_PREFIX) && 
          !Object.values(CACHES).includes(name)
        );
        
        await Promise.all(
          oldCaches.map(cacheName => {
            console.log(`🗑️ [ServiceWorker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
        
        // Clean expired entries from current caches
        await cleanExpiredCacheEntries();
        
        // Claim all clients immediately
        await clients.claim();
        
        console.log('✅ [ServiceWorker] Activated and claimed clients');
      } catch (error) {
        console.error('❌ [ServiceWorker] Activation failed:', error);
      }
    })()
  );
});

/**
 * Fetch Event - Implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // RESEARCH FIX: Skip if URL should never be cached (check both pathname and full URL)
  if (NEVER_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname) || pattern.test(url.href))) {
    // No logging in development to reduce console noise
    return;
  }
  
  // In development mode, be less aggressive with caching
  if (isDevelopment) {
    // Only handle offline fallback for HTML requests in development
    if (isHtmlRequest(request)) {
      event.respondWith(handleFetchDevelopment(request));
    }
    return;
  }
  
  event.respondWith(handleFetch(request));
});

/**
 * Simplified fetch handling for development
 */
async function handleFetchDevelopment(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('🔧 [ServiceWorker] Development mode - network failed, showing offline page');
    return await getOfflineFallback(request);
  }
}

/**
 * Handle fetch requests with appropriate caching strategy
 */
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // 1. Static assets - Cache First
    if (isStaticAsset(url)) {
      return await cacheFirst(request, CACHES.STATIC);
    }
    
    // 2. API requests - Network First with cache fallback
    if (isApiRequest(url)) {
      return await networkFirst(request, CACHES.API);
    }
    
    // 3. Images - Cache First with network fallback
    if (isImageRequest(request)) {
      return await cacheFirst(request, CACHES.IMAGES);
    }
    
    // 4. HTML pages - Stale While Revalidate
    if (isHtmlRequest(request)) {
      return await staleWhileRevalidate(request, CACHES.DYNAMIC);
    }
    
    // 5. Everything else - Network First
    return await networkFirst(request, CACHES.DYNAMIC);
    
  } catch (error) {
    console.error('❌ [ServiceWorker] Fetch failed:', error);
    
    // Return offline fallback
    return await getOfflineFallback(request);
  }
}

/**
 * Cache First Strategy - Check cache first, then network
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && !isExpired(cachedResponse)) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Add timestamp header for TTL tracking
      const responseToCache = networkResponse.clone();
      responseToCache.headers.set('sw-cache-timestamp', Date.now().toString());
      
      await cache.put(request, responseToCache);
      await limitCacheSize(cache, MAX_CACHE_SIZES[cacheName]);
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached response even if expired
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Network First Strategy - Try network first, fallback to cache
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const responseToCache = networkResponse.clone();
      responseToCache.headers.set('sw-cache-timestamp', Date.now().toString());
      
      await cache.put(request, responseToCache);
      await limitCacheSize(cache, MAX_CACHE_SIZES[cacheName]);
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy - Return cache immediately, update in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background (don't await)
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      responseToCache.headers.set('sw-cache-timestamp', Date.now().toString());
      cache.put(request, responseToCache);
    }
    return networkResponse;
  }).catch(error => {
    console.warn('Background fetch failed:', error);
  });
  
  // Return cached response immediately if available
  if (cachedResponse && !isExpired(cachedResponse)) {
    return cachedResponse;
  }
  
  // Wait for network if no cache available
  return await fetchPromise;
}

/**
 * Get offline fallback response
 */
async function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  // For HTML requests, return offline page
  if (isHtmlRequest(request)) {
    const offlineCache = await caches.open(CACHES.OFFLINE);
    const offlinePage = await offlineCache.match('/offline.html');
    
    if (offlinePage) {
      return offlinePage;
    }
  }
  
  // For API requests, return structured offline response
  if (isApiRequest(url)) {
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This request requires an internet connection',
        offline: true,
        timestamp: Date.now()
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
  
  // Generic offline response
  return new Response(
    'Offline - Please check your internet connection',
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    }
  );
}

/**
 * Check if cached response is expired
 */
function isExpired(response) {
  const timestamp = response.headers.get('sw-cache-timestamp');
  if (!timestamp) return false;
  
  const cacheTime = parseInt(timestamp, 10);
  const now = Date.now();
  const age = now - cacheTime;
  
  // Determine TTL based on response type
  let ttl = CACHE_TTL.DYNAMIC;
  const url = new URL(response.url);
  
  if (isStaticAsset(url)) ttl = CACHE_TTL.STATIC;
  else if (isApiRequest(url)) ttl = CACHE_TTL.API;
  else if (isImageRequest({ url: response.url })) ttl = CACHE_TTL.IMAGES;
  
  return age > ttl;
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cache, maxSize) {
  const keys = await cache.keys();
  
  if (keys.length <= maxSize) return;
  
  // Sort by timestamp (oldest first)
  const entries = await Promise.all(
    keys.map(async (key) => {
      const response = await cache.match(key);
      const timestamp = response.headers.get('sw-cache-timestamp') || '0';
      return { key, timestamp: parseInt(timestamp, 10) };
    })
  );
  
  entries.sort((a, b) => a.timestamp - b.timestamp);
  
  // Remove oldest entries
  const toDelete = entries.slice(0, keys.length - maxSize);
  await Promise.all(toDelete.map(entry => cache.delete(entry.key)));
}

/**
 * Clean expired entries from all caches
 */
async function cleanExpiredCacheEntries() {
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    if (!cacheName.startsWith(CACHE_PREFIX)) continue;
    
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    for (const key of keys) {
      const response = await cache.match(key);
      if (response && isExpired(response)) {
        await cache.delete(key);
      }
    }
  }
}

/**
 * Utility functions for request classification
 */
function isStaticAsset(url) {
  return /\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/i.test(url.pathname) ||
         url.pathname === '/' ||
         url.pathname === '/index.html';
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.pathname.startsWith('/rest/') ||
         url.pathname.startsWith('/functions/') ||
         CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isImageRequest(request) {
  return /\.(png|jpg|jpeg|gif|svg|webp|avif)$/i.test(new URL(request.url).pathname) ||
         request.headers.get('accept')?.includes('image/');
}

function isHtmlRequest(request) {
  return request.headers.get('accept')?.includes('text/html') ||
         request.mode === 'navigate';
}

/**
 * Background Sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('🔄 [ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'background-sync-posts') {
    event.waitUntil(syncOfflinePosts());
  } else if (event.tag === 'background-sync-comments') {
    event.waitUntil(syncOfflineComments());
  }
});

/**
 * Sync offline posts when connection is restored
 */
async function syncOfflinePosts() {
  try {
    // Get offline posts from IndexedDB
    const offlinePosts = await getOfflineData('pending_posts');
    
    for (const post of offlinePosts) {
      try {
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(post.data)
        });
        
        if (response.ok) {
          await removeOfflineData('pending_posts', post.id);
          console.log('✅ [ServiceWorker] Synced offline post:', post.id);
        }
      } catch (error) {
        console.error('❌ [ServiceWorker] Failed to sync post:', error);
      }
    }
  } catch (error) {
    console.error('❌ [ServiceWorker] Background sync failed:', error);
  }
}

/**
 * Sync offline comments when connection is restored
 */
async function syncOfflineComments() {
  try {
    const offlineComments = await getOfflineData('pending_comments');
    
    for (const comment of offlineComments) {
      try {
        const response = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(comment.data)
        });
        
        if (response.ok) {
          await removeOfflineData('pending_comments', comment.id);
          console.log('✅ [ServiceWorker] Synced offline comment:', comment.id);
        }
      } catch (error) {
        console.error('❌ [ServiceWorker] Failed to sync comment:', error);
      }
    }
  } catch (error) {
    console.error('❌ [ServiceWorker] Comment sync failed:', error);
  }
}

/**
 * IndexedDB utilities for offline data storage
 */
async function getOfflineData(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lokaa-offline-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
}

async function removeOfflineData(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lokaa-offline-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

/**
 * Message handling for communication with main thread
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_INFO':
      getCacheInfo().then(info => {
        event.ports[0].postMessage({ type: 'CACHE_INFO', payload: info });
      });
      break;
      
    case 'CLEAR_CACHES':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ type: 'CACHES_CLEARED' });
      });
      break;
      
    case 'QUEUE_OFFLINE_ACTION':
      queueOfflineAction(payload).then(() => {
        event.ports[0].postMessage({ type: 'ACTION_QUEUED' });
      });
      break;
  }
});

/**
 * Get cache information for debugging
 */
async function getCacheInfo() {
  const cacheNames = await caches.keys();
  const info = {};
  
  for (const cacheName of cacheNames) {
    if (cacheName.startsWith(CACHE_PREFIX)) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      info[cacheName] = {
        count: keys.length,
        maxSize: MAX_CACHE_SIZES[cacheName] || 'unlimited',
        urls: keys.slice(0, 5).map(key => key.url) // First 5 for debugging
      };
    }
  }
  
  return info;
}

/**
 * Clear all application caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const deletionPromises = cacheNames
    .filter(name => name.startsWith(CACHE_PREFIX))
    .map(name => caches.delete(name));
  
  await Promise.all(deletionPromises);
  console.log('🗑️ [ServiceWorker] All caches cleared');
}

/**
 * Queue offline action for background sync
 */
async function queueOfflineAction(payload) {
  const { type, data } = payload;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lokaa-offline-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const storeName = type === 'post' ? 'pending_posts' : 'pending_comments';
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const actionData = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now()
      };
      
      const addRequest = store.add(actionData);
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = () => reject(addRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending_posts')) {
        db.createObjectStore('pending_posts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_comments')) {
        db.createObjectStore('pending_comments', { keyPath: 'id' });
      }
    };
  });
}

console.log('🚀 [ServiceWorker] Loaded and ready for Phase 6A PWA features!'); 