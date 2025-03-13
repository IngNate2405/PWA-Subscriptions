const CACHE_NAME = 'suscripciones-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/manifest.json',
  '/default-logo.png',
  '/default-receipt.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Enviar mensaje a todos los clientes
const sendMessageToClients = async (message) => {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
  // Notificar que hay una nueva versión disponible
  sendMessageToClients({ type: 'UPDATE_AVAILABLE' });
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar el control inmediatamente
      self.clients.claim()
    ])
  );
  // Notificar que la nueva versión está activa
  sendMessageToClients({ type: 'UPDATE_ACTIVATED' });
});

self.addEventListener('fetch', event => {
  // No cachear solicitudes a la API/IndexedDB
  if (event.request.url.includes('indexedDB') || 
      event.request.url.includes('api')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Siempre ir a la red para archivos críticos
        if (event.request.url.includes('main.js') || 
            event.request.url.includes('sw.js') || 
            event.request.url.includes('styles.css')) {
          return fetch(event.request)
            .then(networkResponse => {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              return networkResponse;
            })
            .catch(() => response);
        }

        // Si está en caché, devolver la respuesta cacheada
        if (response) {
          return response;
        }

        // Si no está en caché, intentar obtenerlo de la red
        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          });
      })
  );
}); 