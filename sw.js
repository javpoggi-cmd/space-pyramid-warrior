const CACHE_NAME = 'sp-warrior-cache-v1';
// Lista de todos los archivos que componen tu juego
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'game.js',
  // ¡No olvides agregar tus imágenes y sonidos más importantes!
  // Es una buena práctica cachear los assets principales.
  'img/player.png',
  'img/enemy1.png',
  'audio/background_music.mp3',
  'audio/player_shoot.wav'
];

// Evento de instalación: se abre el caché y se guardan los archivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de fetch: responde con los archivos del caché si están disponibles
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el archivo está en el caché, lo devuelve. Si no, lo busca en la red.
        return response || fetch(event.request);
      })
  );
});