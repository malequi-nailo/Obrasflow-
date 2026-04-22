var CACHE = "gestaoobras-v11";

self.addEventListener("install", function(e){
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        return caches.delete(key);
      }));
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// Network-only para HTML/JS/CSS — nunca serve versão antiga.
self.addEventListener("fetch", function(e){
  e.respondWith(fetch(e.request).catch(function(){
    return new Response("", { status: 504, statusText: "offline" });
  }));
});