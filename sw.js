const CACHE='dd2-companion-v1.0.0';
const ASSETS=['./','./index.html','./manifest.webmanifest','./sw.js','./assets/world-map.png','./assets/icon.svg','./data/markers.json','./data/vocations.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone(); if(e.request.url.startsWith(location.origin)) caches.open(CACHE).then(c=>c.put(e.request,copy)); return res;})).catch(()=>caches.match('./index.html'))));
