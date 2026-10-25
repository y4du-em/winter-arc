/**
 * Service worker: keeps the app shell cached so Winter Arc works offline.
 * Strategy is stale-while-revalidate: answer from cache instantly, then refresh
 * the cache in the background so the next launch picks up new versions.
 * Bump CACHE_VERSION when the list of files changes.
 */

const CACHE_VERSION = 'winter-arc-v1';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './vendor/chart.umd.min.js',
  './js/app.js',
  './js/backup.js',
  './js/charts.js',
  './js/config.js',
  './js/dates.js',
  './js/dom.js',
  './js/heatmap.js',
  './js/scoring.js',
  './js/storage.js',
  './js/streaks.js',
  './js/validation.js',
  './js/weight-stats.js',
  './js/views/progress.js',
  './js/views/settings.js',
  './js/views/today.js',
  './js/views/weight.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(caches.open(CACHE_VERSION).then(async (cache) => {
    const cacheKey = request.mode === 'navigate' ? './index.html' : request;
    const cached = await cache.match(cacheKey, { ignoreSearch: request.mode === 'navigate' });
    const refresh = fetch(request)
      .then((response) => {
        if (response.ok) cache.put(cacheKey, response.clone());
        return response;
      })
      .catch((error) => {
        if (!cached) throw error;
        return cached;
      });
    if (cached) event.waitUntil(refresh.catch(() => {}));
    return cached ?? refresh;
  }));
});
