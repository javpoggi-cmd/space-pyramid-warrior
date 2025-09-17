const CACHE_NAME = 'sp-warrior-cache-v2'; // <--- VERSIÓN ACTUALIZADA
// Lista de los archivos esenciales para que el juego inicie
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'game.js',
  'img/player.png'
  // Para una mejor experiencia offline, puedes agregar más imágenes y sonidos aquí.
];

// Instala el Service Worker y guarda los archivos en el caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto: ', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercepta las peticiones y responde con los archivos del caché si es posible
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
