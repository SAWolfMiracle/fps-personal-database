const CACHE="fps-db-v6-3";
const CORE=["./","./index.html","./manifest.webmanifest","./cloud-config.js","./ocr-import.js","./collection-catalog.js","./collection-catalog.json","./icon-192.png","./icon-512.png","./icon-180.png"];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET") return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  if(req.mode==="navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/manifest.webmanifest") || url.pathname.endsWith("/cloud-config.js") || url.pathname.endsWith("/ocr-import.js") || url.pathname.endsWith("/collection-catalog.js") || url.pathname.endsWith("/collection-catalog.json")){
    event.respondWith(
      fetch(req).then(resp=>{
        const copy=resp.clone();
        caches.open(CACHE).then(cache=>cache.put(req,copy));
        return resp;
      }).catch(()=>caches.match(req).then(hit=>hit||caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit=>{
      const fresh=fetch(req).then(resp=>{
        const copy=resp.clone();
        caches.open(CACHE).then(cache=>cache.put(req,copy));
        return resp;
      }).catch(()=>hit);
      return hit||fresh;
    })
  );
});