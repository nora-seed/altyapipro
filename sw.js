/* AltyapıPro service worker — çevrimdışı kabuk */
const CACHE = 'altyapipro-v6';
const TILE_CACHE = 'altyapipro-tiles-v1';
const TILE_HOSTS = ['tile.openstreetmap.org', 'server.arcgisonline.com'];
const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/data.js',
  './js/app.js',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/layers-2x.png',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png',
  './manifest.webmanifest',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './assets/city.svg',
  './assets/canal.svg',
  './assets/rain.svg',
  './assets/telecom.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key !== TILE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isTile = TILE_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
  );

  if (isTile) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(TILE_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh && (fresh.ok || fresh.type === 'opaque')) cache.put(request, fresh.clone());
          return fresh;
        } catch (error) {
          if (cached) return cached;
          throw error;
        }
      })()
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const shell = await cache.match('./index.html');
          if (shell) return shell;
        }
        throw error;
      }
    })()
  );
});
