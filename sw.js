/**
 * Score Cekih Service Worker - Premium Cache Core Management Engine
 * Total Offline Execution Support Architecture
 */

const CACHE_NAME = 'score-cekih-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './cekih-icon-192.png',
  './cekih-icon-512.png'
];

// Install Event Execution Phase
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Mencatat aset statis ke dalam system cache.');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Phase & Storage Cleaners
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Menghapus cache usang:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network Fetch Interceptors Interception Routine Pipeline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then((networkResponse) => {
          if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
             return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
             cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      }).catch(() => {
         console.log('[Service Worker] Request fetch gagal dieksekusi secara offline.');
      })
  );
});
