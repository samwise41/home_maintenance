const CACHE_NAME = 'home-tracker-v1';

// Install the service worker
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Network-first approach: Always try the network so GitHub Sync works perfectly.
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});