// CasaMorf Service Worker — Network-first for app files, skip API calls
// App files are always fetched fresh from network (falls back to cache if offline)
// This ensures updates are picked up immediately without manual cache clearing.

const CACHE_NAME = 'casamorf-v5';

self.addEventListener('install', () => {
    self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', e => {
    // Delete ALL old caches
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim(); // Take control immediately
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // NEVER intercept GitHub API calls or store.json
    if (url.hostname === 'api.github.com' || url.pathname.includes('store.json')) {
        return;
    }

    // NEVER intercept non-GET requests
    if (e.request.method !== 'GET') return;

    // Network-first: try network, fall back to cache (for offline support)
    e.respondWith(
        fetch(e.request)
            .then(response => {
                // Cache the fresh response for offline use
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return response;
            })
            .catch(() => caches.match(e.request)) // Offline fallback
    );
});
