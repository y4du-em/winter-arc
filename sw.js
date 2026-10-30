/**
 * Service worker: keeps the app shell cached so Winter Arc works offline.
 * Strategy is stale-while-revalidate: answer from cache instantly, then refresh
 * the cache in the background so the next launch picks up new versions.
 * Bump CACHE_VERSION when the list of files changes.
 */

const CACHE_VERSION = 'winter-arc-v2';

// Always revalidate with the server instead of trusting the browser's HTTP cache.
// GitHub Pages lets browsers reuse files for 10 minutes; without this, an update
// could cache a mix of old and new files. Unchanged files cost only a 304 reply.
const FRESH_FETCH = { cache: 'no-cache' };

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
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, FRESH_FETCH)))).then(() => self.skipWaiting()));
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
    // Built from the URL because a navigation request can't be re-sent with new options.
    const refresh = fetch(new Request(request.url, FRESH_FETCH))
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
