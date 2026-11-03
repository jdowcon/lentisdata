const CACHE='lentisdata-0.1.0';const ASSETS=['./','./index.html','./styles.css','./manifest.webmanifest','./assets/icon.svg','./src/domain.mjs','./src/storage.mjs','./src/sync.mjs','./src/app.mjs'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const req=e.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;if(url.pathname.includes('/api/'))return;e.respondWith(caches.match(req).then(cached=>cached||fetch(req)));});
