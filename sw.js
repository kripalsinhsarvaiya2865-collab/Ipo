/* બુક્સ ખાતાવહી - Service Worker */
const VERSION = 'v1';
const SHELL_CACHE = 'khatavahi-shell-' + VERSION;
const RUNTIME_CACHE = 'khatavahi-runtime-' + VERSION;

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Firebase Realtime Database / APIs: never cache (live data)
  if (url.hostname.endsWith('firebaseio.com') ||
      url.hostname.endsWith('firebasedatabase.app') ||
      url.hostname.endsWith('googleapis.com') && !url.hostname.startsWith('fonts')) {
    return;
  }

  // Page navigation: network first, fallback to cached app
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Same-origin files + fonts + Firebase SDK scripts: stale-while-revalidate
  const cacheable =
    url.origin === self.location.origin ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'www.gstatic.com';

  if (cacheable) {
    event.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req)
          .then(res => {
            if (res && (res.ok || res.type === 'opaque')) {
              const copy = res.clone();
              caches.open(RUNTIME_CACHE).then(c => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
