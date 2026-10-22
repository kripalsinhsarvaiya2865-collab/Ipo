// બુક્સ ખાતાવહી - Service Worker
// નવું વર્ઝન મૂકો ત્યારે CACHE નંબર વધારો (v1 -> v2)
const CACHE = 'books-ledger-v1';
const SHELL = [
  './books-ledger.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firebase ડેટા/લાઇવ સિંક ક્યારેય cache નહીં થાય
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('firebasedatabase.app')) return;

  // એપ પેજ: પહેલા નેટવર્ક (હંમેશા નવું), ઓફલાઇન હોય તો cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./books-ledger.html', copy));
        return res;
      }).catch(() => caches.match('./books-ledger.html'))
    );
    return;
  }

  // બાકી (ફોન્ટ, Firebase સ્ક્રિપ્ટ, આઇકન): cache પહેલા, સાથે અપડેટ
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
