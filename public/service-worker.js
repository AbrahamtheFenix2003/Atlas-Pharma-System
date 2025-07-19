self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('atlas-farma-cache').then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/src/index.css',
                '/src/main.jsx',
                '/src/pages/Login.jsx',
                '/public/pwa-192x192.png',
                '/public/pwa-512x512.png'
            ]);
        })
    );
    self.skipWaiting(); // Fuerza la activación inmediata del nuevo Service Worker
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== 'atlas-farma-cache') {
                        return caches.delete(cacheName); // Elimina cachés obsoletos
                    }
                })
            );
        })
    );
    self.clients.claim(); // Toma control de las páginas abiertas
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
