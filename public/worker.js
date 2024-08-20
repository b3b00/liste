

const CACHE_NAME = "liste-v0.0.2";

const urlsToCache = [
  "./",
  "./index.html",
  "./bundle.css",
  "./bundle.js",
  "./images/icons/icon-48x48.png",
  "./images/icons/icon-72x72.png",
  "./images/icons/icon-96x96.png",  
  "./images/icons/icon-144x144.png",  
  "./images/icons/icon-192x192.png",  
  "./images/icons/icon-512x512.png",
  "./images/screenshot.png",
  "https://fonts.googleapis.com/icon?family=Material+Icons",
  "https://fonts.gstatic.com/s/materialicons/v50/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2",
  "https://cdn.jsdelivr.net/npm/svelte-material-ui@7.0.0/bare.min.css",
  ];

self.addEventListener('install', function(event) {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) { 
        console.log('Opened cache',cache,urlsToCache);
        return cache.addAll(urlsToCache).then(function() {
          console.log('urls have been added to cache');
        }).catch(function(reason) {
          console.log(`beuahah cache failed ; ${reason}`)
        });
      })
  );
});


self.addEventListener('fetch', async function(event) {  
  event.respondWith(
    caches.match(event.request)
    .then(function(response) {            
      return response || fetchAndCache(event.request);
    })
  );
});


function fetchAndCache(url) {    
  return fetch(url)
  .then(function(response) {
    // Check if we received a valid response
    if (!response.ok) {
      throw Error(response.statusText);
    }
    return caches.open(CACHE_NAME)
    .then(function(cache) {
      cache.put(url, response.clone());
      return response;
    });
  })
  .catch(function(error) {
    console.log('Request failed:', url, error);
    console.log('redirect to /');
    return(Response.redirect('/'));
    // You could return a custom offline 404 page here
  });
}



self.addEventListener('activate', function(event) {
  console.log('Updating Service Worker... : deleting stale caches => '+CACHE_NAME);
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {          
          return cacheName != CACHE_NAME;
        }).map(function(cacheName) {
          console.log(`delete cache ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    })
  );
});




