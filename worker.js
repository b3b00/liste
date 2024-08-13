

const CACHE_NAME = "recetteo-v1.1.2";

const urlsToCache = [
  "./",
  "./index.html",
  "./dist/bundle.css",
  "./dist/bundle.js",
  "./dist/share.html",
  "./images/icons/icon-72x72.png",
  "./images/icons/icon-96x96.png",
  "./images/icons/icon-128x128.png",
  "./images/icons/icon-144x144.png",
  "./images/icons/icon-152x152.png",
  "./images/icons/icon-192x192.png",
  "./images/icons/icon-384x384.png",
  "./images/icons/icon-512x512.png",
  "./images/marmiton.ico",
  "https://fonts.googleapis.com/icon?family=Material+Icons",
  "https://fonts.gstatic.com/s/materialicons/v50/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2",
  "/share",
  "/toto"
];

function getId(url) {
  let id = url.replace(".aspx","").replace(".html","").replace('https://www.marmiton.org/recettes/','');
  return id;
}


function getParemeter(url, paramName) {
  const purl = new URL(url);
  let it = purl.searchParams.get('text');
  let param = it.next();  
  return param;
}


async function getIt(url) {  
  
  let marmurl = getParemeter(url,"text");
  if (!marmurl)  {
    return null;
  }
  id = getId(marmurl);
        
  //let apiurl = `http://localhost:5002/marmiton/${id}`;
  let apiurl = `https://marmiton-api.herokuapp.com/marmiton/${id}`;        
  try {
      var res = await fetch(apiurl,{method:'GET'});
      var j = await res.json();
      return j;
  }
  catch(e) {
  }
  return null;
}

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

function notNullOrUndefined(value) {
  return value !== null && value !== undefined;
}

function storeIt(recipe) {
  // TODO : compute id
  // TODO : 
  let recipes = localStorage.getItem('recipes');  
  let recipeId = 1;
  if (recipes.length > 0) {
    let ids = recipes.map(x => x.id);
    let max = Math.max(...ids);    
    recipeId = max+1;
  }  
  localStorage.setItem('test',recipe);
}

self.addEventListener('fetch', async function(event) {  
  if (notNullOrUndefined(event) && notNullOrUndefined(event.request) && notNullOrUndefined(event.request.url)  && event.request.url.includes('/share')  && !event.request.url.includes('#/share')) {    
    let p = getParemeter(event.request.url,'text');
    //let rec = await getIt(event.request.url);
    //storeIt(rec);
    return event.respondWith(Response.redirect('/#/share?text='+p,302));
  }
  if (event)
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




