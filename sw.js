// CasaMorf Service Worker — Offline-first caching
// IMPORTANT: Never cache data/store.json or API calls
const CACHE_NAME = 'casamorf-v4';
const ASSETS = [
    './',
    './index.html',
    './css/app.css',
    './js/crypto.js',
    './js/storage.js',
    './js/app.js',
    './manifest.json',
    './icons/favicon.svg'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // NEVER cache GitHub API calls or store.json
    if (url.hostname === 'api.github.com' || url.pathname.includes('store.json')) {
        return; // Let the browser handle it normally (no cache)
    }

    e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request))
    );
});
