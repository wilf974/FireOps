/**
 * FireOps Service Worker
 * Cache-first strategy : l'app reste 100% utilisable hors-ligne après la 1ʳᵉ visite.
 * Bumpez CACHE pour forcer le renouvellement à chaque release.
 */

const CACHE = 'fireops-v1.2';

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.svg',
  './icon-512.svg',
  './icon-maskable.svg',
];

// Polices Google : on les met en cache à la 1ʳᵉ requête (stale-while-revalidate)
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navigation : toujours servir index.html depuis le cache si dispo
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(
        (cached) => cached || fetch(req).catch(() => caches.match('./index.html'))
      )
    );
    return;
  }

  // Polices : stale-while-revalidate
  if (FONT_HOSTS.includes(url.host)) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req)
            .then((res) => {
              if (res && res.status === 200) cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // Assets locaux : cache-first
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res && res.status === 200 && url.origin === self.location.origin) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        }).catch(() => cached)
    )
  );
});

// Permet à la page de demander un skipWaiting() pour rafraîchir
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
