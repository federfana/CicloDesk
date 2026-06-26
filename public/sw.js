// CicloDesk Service Worker — PWA Offline (#14)
const CACHE_NAME = 'ciclodesk-v1.12.0';
const API_CACHE  = 'ciclodesk-api-v1';
const API_MAX_AGE = 5 * 60 * 1000; // 5 minuti

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/db.js',
  '/js/lavorazioni.js',
  '/js/clienti.js',
  '/js/bici.js',
  '/js/ordini.js',
  '/js/componenti.js',
  '/js/ordiniFornitore.js',
  '/js/ui.js',
  '/js/app.js',
  '/img/logo.svg',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== API_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API GET, passthrough for mutations, cache-first for static
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Non intercettare richieste non-GET alle API (POST/PUT/DELETE)
  if (url.pathname.startsWith('/api/') && request.method !== 'GET') {
    return; // lascia passare direttamente al network
  }

  // API GET calls: network-first con fallback a cache (max 5 min)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (request.method === 'GET' && res.ok) {
            const clone = res.clone();
            caches.open(API_CACHE).then(cache => {
              // Salva risposta con timestamp nell'header custom
              const headers = new Headers(clone.headers);
              headers.set('sw-cached-at', Date.now().toString());
              clone.blob().then(body => {
                const cachedResponse = new Response(body, {
                  status: clone.status,
                  statusText: clone.statusText,
                  headers,
                });
                cache.put(request, cachedResponse);
              });
            });
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request, { cacheName: API_CACHE });
          if (!cached) return new Response(JSON.stringify({ error: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
          // Controlla scadenza
          const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0', 10);
          if (Date.now() - cachedAt > API_MAX_AGE) {
            // Cache scaduta — ritorna comunque ma con header warning
            const headers = new Headers(cached.headers);
            headers.set('X-Cache-Stale', 'true');
            return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });
          }
          return cached;
        })
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return res;
      });
    })
  );
});
