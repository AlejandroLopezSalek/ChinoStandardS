// ================================
// SERVICE WORKER - ChinoAmerica PWA
// Smart caching with quick updates
// ================================

const CACHE_VERSION = 'v1.0.28'; // ⚡ INCREMENTA ESTO CADA VEZ QUE DESPLIEGUES
const CACHE_NAMES = {
    static: `turkamerica-${CACHE_VERSION}-static`,
    dynamic: `turkamerica-${CACHE_VERSION}-dynamic`,
    images: `turkamerica-${CACHE_VERSION}-images`
};

// Cache duration times (in milliseconds)
const CACHE_DURATION = {
    HTML: 1 * 60 * 60 * 1000,        // 1 hour
    STATIC: 24 * 60 * 60 * 1000,     // 24 hours
    IMAGES: 7 * 24 * 60 * 60 * 1000  // 7 days
};

const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/Gramatica.html',
    '/Perfil.html',
    '/css/styles.css',
    '/css/darkmode.css',
    '/js/config.js',
    '/js/general.js',
    '/js/auth.js',
    '/manifest.json'
];

// ================================
// INSTALL - Cache static assets
// ================================
self.addEventListener('install', (event) => {


    event.waitUntil(
        caches.open(CACHE_NAMES.static)
            .then((cache) => {

                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                return globalThis.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Error caching static assets:', error);
            })
    );
});

// ================================
// ACTIVATE - Cleanup old caches
// ================================
self.addEventListener('activate', (event) => {


    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            // Delete ALL old turkamerica caches
                            return cacheName.startsWith('turkamerica-') &&
                                !Object.values(CACHE_NAMES).includes(cacheName);
                        })
                        .map((cacheName) => {

                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {

                return globalThis.clients.claim();
            })
    );
});

// ================================
// FETCH - Smart caching strategies
// ================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip non-http protocols (chrome-extension, etc)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        console.log('[SW] Skipping non-http protocol:', url.protocol);
        return;
    }

    //  Let the browser/adblocker handle these, don't crash SW
    if (url.hostname.includes('googlesyndication') ||
        url.hostname.includes('doubleclick') ||
        url.hostname.includes('adtrafficquality') ||
        url.hostname.includes('googleads')) {
        return;
    }

    // Skip API requests (always fetch fresh)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => response)
                .catch((error) => {
                    console.error('[SW] API request failed:', error);
                    return new Response(
                        JSON.stringify({
                            error: 'Network error',
                            message: 'Unable to reach server'
                        }),
                        {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
        return;
    }

    // Route requests based on type
    if (request.destination === 'image') {
        event.respondWith(cacheFirstWithExpiry(request, CACHE_NAMES.images, CACHE_DURATION.IMAGES));
    } else if (
        request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'font'
    ) {
        event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.static));
    } else if (request.destination === 'document') {
        event.respondWith(networkFirstWithExpiry(request, CACHE_NAMES.dynamic, CACHE_DURATION.HTML));
    } else {
        event.respondWith(networkFirstWithExpiry(request, CACHE_NAMES.dynamic, CACHE_DURATION.STATIC));
    }
});

// ================================
// CACHING STRATEGIES
// ================================

// Stale-while-revalidate: Return cache immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    // Fetch new version in background
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse?.status === 200) {
            // Add timestamp for expiration tracking
            const responseToCache = networkResponse.clone();
            const headers = new Headers(responseToCache.headers);
            headers.append('sw-cached-time', Date.now().toString());

            const modifiedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });

            cache.put(request, modifiedResponse);
        }
        return networkResponse;
    }).catch((error) => {
        console.warn('[SW] Network request failed:', request.url);
        return cachedResponse;
    });

    // Return cached version immediately if available
    const response = cachedResponse || await fetchPromise;

    // Fallback if both fail (prevents "Failed to convert value to Response" error)
    if (!response) {
        return new Response('', { status: 404, statusText: 'Not Found' });
    }

    return response;
}

// Cache-first with expiry checking
async function cacheFirstWithExpiry(request, cacheName, maxAge) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            // Check if cache is expired
            const cachedTime = cachedResponse.headers.get('sw-cached-time');
            if (cachedTime && (Date.now() - Number.parseInt(cachedTime, 10)) < maxAge) {
                // Cache is still valid, update in background
                fetch(request).then((networkResponse) => {
                    if (networkResponse?.status === 200) {
                        const headers = new Headers(networkResponse.headers);
                        headers.append('sw-cached-time', Date.now().toString());

                        const modifiedResponse = new Response(networkResponse.body, {
                            status: networkResponse.status,
                            statusText: networkResponse.statusText,
                            headers: headers
                        });

                        cache.put(request, modifiedResponse);
                    }
                }).catch((err) => { console.debug('[SW] Cache update error', err) });

                return cachedResponse;
            }
        }

        // Not in cache or expired, fetch from network
        const networkResponse = await fetch(request);

        if (networkResponse?.status === 200) {
            const responseToCache = networkResponse.clone();
            const headers = new Headers(responseToCache.headers);
            headers.append('sw-cached-time', Date.now().toString());

            const modifiedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });

            cache.put(request, modifiedResponse);
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache-first error:', error);
        return new Response('Offline - Asset not cached', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Network-first with expiry (for HTML)
async function networkFirstWithExpiry(request, cacheName, maxAge) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse?.status === 200) {
            const cache = await caches.open(cacheName);

            // CLONE first to avoid body locking
            const responseToCache = networkResponse.clone();
            const headers = new Headers(responseToCache.headers);
            headers.append('sw-cached-time', Date.now().toString());

            const modifiedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });

            cache.put(request, modifiedResponse);
        }

        return networkResponse;
    } catch (error) {
        console.warn('[SW] Network failed, trying cache:', request.url, error.message);

        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            // Check expiry
            const cachedTime = cachedResponse.headers.get('sw-cached-time');
            if (!cachedTime || (Date.now() - Number.parseInt(cachedTime, 10)) > maxAge * 2) {
                console.log('[SW] Cached version is old');
            }
            return cachedResponse;
        }

        // Return offline page
        return new Response(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Offline - ChinoAmerica</title>
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-align: center;
                        padding: 20px;
                    }
                    .offline-container {
                        max-width: 500px;
                    }
                    h1 {
                        font-size: 3rem;
                        margin-bottom: 20px;
                    }
                    p {
                        font-size: 1.2rem;
                        opacity: 0.9;
                    }
                    .icon {
                        font-size: 5rem;
                        margin-bottom: 30px;
                    }
                    button {
                        margin-top: 30px;
                        padding: 12px 30px;
                        background: white;
                        color: #667eea;
                        border: none;
                        border-radius: 25px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <div class="offline-container">
                    <div class="icon">📡</div>
                    <h1>Sin Conexión</h1>
                    <p>No hay conexión a internet. Por favor, verifica tu conexión e intenta nuevamente.</p>
                    <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #666; margin-bottom: 20px;">Verifica tu conexión a internet</p>
                    <button onclick="globalThis.location.reload()">Reintentar</button>
                </div>
            </body>
            </html>
        `, {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'text/html; charset=utf-8'
            }
        });
    }
}

// ================================
// MESSAGE HANDLING
// ================================
globalThis.addEventListener('message', (event) => {
    // Verify message origin for security
    if (!event.origin || event.origin !== globalThis.location.origin) {
        console.warn('[SW] Message from untrusted origin:', event.origin);
        return;
    }

    if (event.data === 'skipWaiting') {
        console.log('[SW] Skip waiting message received');
        globalThis.skipWaiting();
    }

    if (event.data === 'clearCache') {
        console.log('[SW] Clear cache message received');
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});

// Background sync for failed requests
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    console.log('[SW] Syncing data...');
}

// Push notifications
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    const data = event.data ? event.data.json() : {};
    const title = data.title || 'ChinoAmerica';
    const options = {
        body: data.body || 'Nueva notificación',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        vibrate: [200, 100, 200],
        data: data.url || '/',
        actions: [
            {
                action: 'open',
                title: 'Abrir'
            },
            {
                action: 'close',
                title: 'Cerrar'
            }
        ]
    };

    event.waitUntil(
        globalThis.registration.showNotification(title, options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'open') {
        const urlToOpen = event.notification.data || '/';

        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((windowClients) => {
                    for (let client of windowClients) {
                        if (client.url === urlToOpen && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    if (clients.openWindow) {
                        return clients.openWindow(urlToOpen);
                    }
                })
        );
    }
});

