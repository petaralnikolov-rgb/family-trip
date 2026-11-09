/* Офлайн кеш. Версията и списъкът се попълват при сглобяване. */
const CACHE = 'pv5-web-ba28317b80';
const PRECACHE = ["./","./app.bin","./fonts/onest-cyrillic-wght-normal.woff2","./fonts/onest-latin-wght-normal.woff2","./fonts/unbounded-cyrillic-wght-normal.woff2","./fonts/unbounded-latin-wght-normal.woff2","./icons/apple-touch-icon.png","./icons/favicon-64.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon.svg","./index.html","./lock.js","./manifest.webmanifest","./styles.css","./vendor/pdf.min.mjs","./vendor/pdf.worker.min.mjs"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('pv5-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // прогнозата и курсът се кешират от самото приложение
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html', { ignoreSearch: true }).then(hit => hit || fetch(req)).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(resp => {
    if (resp.ok) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return resp;
  })));
});
