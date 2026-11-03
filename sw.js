// LentisData 0.1: first load online, subsequent loads offline.
// Network-first avoids keeping an outdated statistics UI after deployment.
const CACHE = 'lentisdata-shell-0.1.1';
const ASSETS = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './assets/icon.svg', './src/domain.mjs', './src/storage.mjs',
  './src/sync.mjs', './src/app.mjs'
];
const shellURLs = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));
const offlineHome = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys
      .filter(key => key.startsWith('lentisdata-') && key !== CACHE)
      .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(self.registration.scope)) return;
  if (!request.mode || (!shellURLs.has(url.href) && request.mode !== 'navigate')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok && response.type !== 'opaque') {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const fallback = await cache.match(request) ||
        (request.mode === 'navigate' ? await cache.match(offlineHome) : undefined);
      if (fallback) return fallback;
      throw error;
    }
  })());
});
