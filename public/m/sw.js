/*
 * GuroAssist mobile service worker. It keeps only the app shell and the build files so the app opens
 * offline. It never touches /api or /sanctum, so student data and tokens are never stored in a cache.
 * Local attendance data lives in IndexedDB, managed by the app itself.
 */
const VERSION = 'v1';
const SHELL_CACHE = `guroassist-mobile-shell-${VERSION}`;
const ASSET_CACHE = `guroassist-mobile-assets-${VERSION}`;
const SHELL = ['/m/', '/m/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('guroassist-mobile-') && k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/sanctum')) return; // never cached

  // The app page: network first, last good copy when offline.
  if (request.mode === 'navigate' && url.pathname.startsWith('/m')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/m/', copy));
          }
          return response;
        })
        .catch(() => caches.match('/m/')),
    );
    return;
  }

  // Hashed build files and icons never change under the same name: cache first.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/m/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});
