const CACHE_NAME = 'entrealas-app-v3.5'; // Versión de la PWA
const IMAGE_CACHE = 'entrealas-images-v3.2';
const APP_PREFIX = self.location.host.includes('localhost') ? '' : '/EntreAlasOrderManager';
const OFFLINE_FALLBACK = `${APP_PREFIX}/index.html`;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

const urlsToCache = [
  `${APP_PREFIX}/`,
  `${APP_PREFIX}/index.html`,
  `${APP_PREFIX}/manifest.json`,
  `${APP_PREFIX}/css/styles.css`,
  `${APP_PREFIX}/libs/chart.js`,
  `${APP_PREFIX}/libs/date-fns.js`,
  `${APP_PREFIX}/js/app.js`,
  `${APP_PREFIX}/js/pedidos.js`,
  `${APP_PREFIX}/js/combo.js`,
  `${APP_PREFIX}/js/descuentos.js`,
  `${APP_PREFIX}/js/dashboard.js`,
  `${APP_PREFIX}/js/storage.js`,
  `${APP_PREFIX}/js/whatsapp.js`,
  `${APP_PREFIX}/imagen-icono/logo-entrealas-192x192.png`,
  `${APP_PREFIX}/imagen-icono/logo-entrealas-512x512.png`,
  `${APP_PREFIX}/imagen-icono/logo-entrealas-96x96.png`,
  `${APP_PREFIX}/screenshots/screen1.webp`
];

// ===== INSTALACIÓN ===== //
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cacheando recursos críticos');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting activado');
        return self.skipWaiting();
      })
  );
});

// ===== ACTIVACIÓN ===== //
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE) {
            console.log('[Service Worker] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Clients claim activado');
      // Enviar la versión a todos los clientes al activarse
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'VERSION',
            version: CACHE_NAME
          });
        });
      });
      return self.clients.claim();
    })
  );
});

// ===== ESTRATEGIA DE FETCH ===== //
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  if (request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  let cacheKey = request.url;
  if (request.headers.get('accept').includes('text/html')) {
    const url = new URL(request.url);
    if (url.pathname === `${APP_PREFIX}/index.html`) {
      cacheKey = `${APP_PREFIX}/index.html`;
    }
  }

  event.respondWith(
    caches.match(cacheKey)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log(`[Service Worker] Sirviendo desde caché: ${cacheKey}`);
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log(`[Service Worker] Guardando en caché: ${request.url}`);
                cache.put(request, responseToCache);
              });
            return networkResponse;
          })
          .catch(() => {
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_FALLBACK);
            }
          });
      })
  );
});

// ===== MANEJO DE IMÁGENES ===== //
function handleImageRequest(request) {
  return caches.open(IMAGE_CACHE)
    .then((cache) => {
      return cache.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log(`[Service Worker] Imagen desde caché: ${request.url}`);
            return cachedResponse;
          }

          return fetch(request)
            .then((networkResponse) => {
              const contentLength = networkResponse.headers.get('content-length');
              if (contentLength && parseInt(contentLength) < MAX_IMAGE_SIZE) {
                const clone = networkResponse.clone();
                cache.put(request, clone)
                  .then(() => console.log(`[Service Worker] Imagen guardada en caché: ${request.url}`));
              }
              return networkResponse;
            })
            .catch(() => {
              return new Response('<svg>...</svg>', {
                headers: { 'Content-Type': 'image/svg+xml' }
              });
            });
        });
    });
}

// ===== MANEJO DE ACTUALIZACIONES Y MENSAJES ===== //
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    console.log('[Service Worker] Saltando espera por mensaje');
    self.skipWaiting();
  } else if (event.data === 'GET_VERSION') {
    // Responder con la versión cuando el cliente lo solicite
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'VERSION',
          version: CACHE_NAME
        });
      });
    });
  }
});

// ===== BACKGROUND SYNC (OPCIONAL) ===== //
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[Service Worker] Sincronización en background');
    // Implementa tu lógica de sync aquí
  }
});

/*
supabase
usuario github
contraseña:
aVKJTFGtIizzCwrg
*/




