// Static shell is small; screenshots, recognition templates and JSON catalogs are loaded on demand.
const CACHE="fps-db-v6-42-home-collections-4";
const CORE=[
  "./","./index.html","./fitness.css?rev=home-collections-4","./manifest.webmanifest","./cloud-config.js",
  "./collection-model.js","./collection-guides.js","./collection-catalog.js",
  "./inventory.js","./home-dashboard.js?rev=home-collections-4","./collection-duplicates.js",
  "./app-updates.js?rev=home-collections-4","./icon-192.png","./icon-512.png","./icon-180.png"
];
const OPTIONAL=["./ocr-import.js","./warehouse-import.js","./warehouse-templates.json","./collection-catalog.json"];
const MODEL_VIEWER_URL="https://ajax.googleapis.com/ajax/libs/model-viewer/4.3.1/model-viewer.min.js";
const pathname=path=>new URL(path,self.registration.scope).pathname;
const CORE_PATHS=new Set(CORE.map(pathname));
const OPTIONAL_PATHS=new Set(OPTIONAL.map(pathname));

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith("fps-db-")&&key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.href===MODEL_VIEWER_URL){
    event.respondWith(caches.open(CACHE).then(async cache=>{
      const hit=await cache.match(req);
      if(hit)return hit;
      const response=await fetch(req);
      if(response.ok)await cache.put(req,response.clone());
      return response;
    }));
    return;
  }
  if(url.origin!==self.location.origin)return;
  
  // Cache-first shell keeps repeat visits and offline launches responsive.
  if(req.mode==="navigate"||CORE_PATHS.has(url.pathname)){
    event.respondWith((async()=>{
      const cached=await caches.match(req,req.mode==="navigate"?{ignoreSearch:true}:undefined);
      if(cached)return cached;
      try{
        const response=await fetch(req);
        if(response.ok){
          const cache=await caches.open(CACHE);
          await cache.put(req,response.clone());
        }
        return response;
      }catch(err){
        if(req.mode==="navigate"){
          const offline=await caches.match("./index.html");
          if(offline)return offline;
        }
        throw err;
      }
    })());
    return;
  }

  // Optional tools/data are cached only after a user actually opens the feature.
  if(OPTIONAL_PATHS.has(url.pathname)){
    event.respondWith((async()=>{
      const cached=await caches.match(req);
      if(cached)return cached;
      const response=await fetch(req);
      if(response.ok){
        const cache=await caches.open(CACHE);
        await cache.put(req,response.clone());
      }
      return response;
    })());
  }
});

// Let a running page detect that its controller contains a newer interface.
self.addEventListener("message",event=>{
  if(event.data&&event.data.type==="GET_BUILD"&&event.ports&&event.ports[0])event.ports[0].postMessage({build:CACHE});
  if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting();
});
