// Versión del cache
const CACHE_NAME = 'entrealas-app-v1';
const urlsToCache = [
  '/', // Página principal
  '/index.html',
  '/css/styles.css',
  '/libs/chart.js', // Asegúrate de tener Chart.js localmente
  '/js/pedidos.js',
  '/js/combo.js',
  '/js/descuentos.js',
  '/js/dashboard.js',
  '/js/storage.js',
  '/js/whatsapp.js',
  '/js/app.js',
  '/imagen-icono/safeimagekit-logo-entrealas-sep24-2-01_051032.png'
];

// Evento de instalación: cachear los archivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de activación: limpiar cachés antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

// Evento de fetch: servir archivos desde el cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el recurso está en el cache, devolverlo
        if (response) {
          return response;
        }
        // Si no está en el cache, intentar obtenerlo de la red
        return fetch(event.request).catch(() => {
          // Si falla la red, devolver la página principal como fallback
          return caches.match('/index.html');
        });
      })
  );
});