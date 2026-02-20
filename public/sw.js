const CACHE_NAME = 'conexao-arq-v1';
const ASSETS = [
    '/card.html',
    '/manifest.json',
    '/css/card.css',
    '/js/card.js'
];

self.addEventListener('install', evt => {
    evt.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', evt => {
    evt.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', evt => {
    // Para API, sempre buscar da rede
    if (evt.request.url.includes('/api/')) {
        evt.respondWith(fetch(evt.request));
        return;
    }
    evt.respondWith(
        caches.match(evt.request).then(cached => cached || fetch(evt.request))
    );
});
