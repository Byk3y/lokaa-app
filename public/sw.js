/* Lokaa service worker kill switch.
 * The app no longer relies on a service worker. This file is intentionally
 * kept at /sw.js so browsers with an old registration can update to this
 * version, clear stale caches, unregister, and then reload from the network.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

    const registration = await self.registration.unregister();
    const clientsList = await self.clients.matchAll({
      includeUncontrolled: true,
      type: 'window',
    });

    await Promise.all(
      clientsList.map((client) => client.navigate(client.url))
    );

    return registration;
  })());
});

self.addEventListener('fetch', () => {
  return;
});
