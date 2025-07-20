const CACHE_NAME = 'atlas-farma-v1.1.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/src/index.css',
    '/src/main.jsx',
    '/public/pwa-192x192.png',
    '/public/pwa-512x512.png'
];

// Instalar service worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[SW] Skip waiting');
                return self.skipWaiting();
            })
    );
});

// Activar service worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Claiming clients');
                return self.clients.claim();
            })
            .then(() => {
                // Notificar a todos los clientes que hay una nueva versión
                return self.clients.matchAll();
            })
            .then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'SW_UPDATE',
                        message: 'Nueva versión disponible'
                    });
                });
            })
    );
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Devolver de caché si está disponible
                if (response) {
                    return response;
                }
                
                // Hacer petición y cachear para assets estáticos
                return fetch(event.request).then((response) => {
                    // No cachear si no es una respuesta exitosa
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Cachear recursos estáticos
                    if (event.request.destination === 'script' || 
                        event.request.destination === 'style' ||
                        event.request.destination === 'image') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    
                    return response;
                });
            })
    );
});

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Detectar cuando hay una nueva versión disponible
self.addEventListener('message', (event) => {
    if (event.data === 'checkForUpdate') {
        event.ports[0].postMessage({
            hasUpdate: self.registration.waiting !== null
        });
    }
});

console.log('[SW] Service Worker loaded');
