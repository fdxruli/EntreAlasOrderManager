// ===== CONFIGURACIÓN PRINCIPAL ===== //
const APP_PREFIX = '/EntreAlasOrderManager';
const CACHE_NAME = 'entrealas-app-v2';
const OFFLINE_FALLBACK = `${APP_PREFIX}/index.html`;
const IMAGE_CACHE = 'entrealas-images-v1';
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

// ===== URLs PARA CACHEAR ===== //
const urlsToCache = [
  `${APP_PREFIX}/`,
  `${APP_PREFIX}/index.html`,
  `${APP_PREFIX}/css/styles.css`,
  `${APP_PREFIX}/libs/chart.js`,
  `${APP_PREFIX}/js/app.js`,
  `${APP_PREFIX}/js/pedidos.js`,
  `${APP_PREFIX}/js/combo.js`,
  `${APP_PREFIX}/js/descuentos.js`,
  `${APP_PREFIX}/js/dashboard.js`,
  `${APP_PREFIX}/js/storage.js`,
  `${APP_PREFIX}/js/whatsapp.js`,
  `${APP_PREFIX}/imagen-icono/safeimagekit-logo-entrealas-sep24-2-01_051032.png`
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
    })
    .then(() => {
      console.log('[Service Worker] Clients claim activado');
      return self.clients.claim();
    })
  );
});

// ===== ESTRATEGIA DE FETCH ===== //
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // 1. Ignorar solicitudes no-GET
  if (request.method !== 'GET') {
    return;
  }

  // 2. Manejo especial para imágenes
  if (request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // 3. Estrategia Cache First con Network Fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Devuelve caché si existe
        if (cachedResponse) {
          console.log(`[Service Worker] Sirviendo desde caché: ${request.url}`);
          return cachedResponse;
        }

        // Si no está en caché, busca en red
        return fetch(request)
          .then((networkResponse) => {
            // Clona la respuesta para guardar en caché
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log(`[Service Worker] Guardando en caché: ${request.url}`);
                cache.put(request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // Fallback offline
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
              // Verifica tamaño antes de cachear
              const contentLength = networkResponse.headers.get('content-length');
              
              if (contentLength && parseInt(contentLength) < MAX_IMAGE_SIZE) {
                const clone = networkResponse.clone();
                cache.put(request, clone)
                  .then(() => console.log(`[Service Worker] Imagen guardada en caché: ${request.url}`));
              }

              return networkResponse;
            })
            .catch(() => {
              // Puedes devolver una imagen placeholder si falla
              return new Response('<svg>...</svg>', {
                headers: { 'Content-Type': 'image/svg+xml' }
              });
            });
        });
    });
}

// ===== MANEJO DE ACTUALIZACIONES ===== //
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    console.log('[Service Worker] Saltando espera por mensaje');
    self.skipWaiting();
  }
});

// ===== BACKGROUND SYNC (OPCIONAL) ===== //
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[Service Worker] Sincronización en background');
    // Implementa tu lógica de sync aquí
  }
});
