const CACHE='dd2-companion-v2';
const ASSETS=['./','./index.html','./manifest.webmanifest','./assets/world-map.png','./assets/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
