/* One-time migration worker: remove caches left by hexo-offline, then retire. */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    var cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(function (cacheName) {
      return caches.delete(cacheName);
    }));

    await self.clients.claim();
    var windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    await self.registration.unregister();
    await Promise.all(windows.map(function (client) {
      return client.navigate(client.url).catch(function () {});
    }));
  })());
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }));
});
