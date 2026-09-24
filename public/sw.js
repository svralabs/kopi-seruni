// Minimal Service Worker for Kopi Seruni POS
// Offline fallback only for full-page navigation.

// Naikkan versi ini setiap kali public/offline.html diubah, supaya cache offline ter-refresh.
const CACHE_NAME = 'kopi-seruni-offline-v2';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Hanya tangani navigasi halaman (HTML document) dengan metode GET.
  // Jangan sentuh Server Actions, API routes, POST requests, atau asset streaming.
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(OFFLINE_URL);
      if (cached) {
        return cached;
      }
      return new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    })
  );
});
