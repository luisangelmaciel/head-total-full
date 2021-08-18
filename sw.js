var cdn = {
  unpkg: 'https://unpkg.com',
  max: 'https://maxcdn.bootstrapcdn.com'
}

var vendor = {
  bootstrap: 'https://unpkg.com/bootstrap@4.0.0-alpha.2',
  fontAwesome: 'https://maxcdn.bootstrapcdn.com/font-awesome/4.6.3',
  raven: 'https://unpkg.com/raven-js@3.7.0'
};

var URLS = {
  app: [
    './',
    './index.js',
    './index.html',
    './manifest.json',
    './res/icon_hi_res_512.png',
    './res/icon_xxxhdpi_192.png',
    './res/icon_xxhdpi_144.png',
    './res/icon_xhdpi_96.png',
    './res/icon_hdpi_72.png',
    './res/icon_mdpi_48.png'
  ],
  vendor: [
    `${vendor.bootstrap}/dist/css/bootstrap.min.css`,
    `${vendor.fontAwesome}/css/font-awesome.min.css`,
    `${vendor.fontAwesome}/fonts/fontawesome-webfont.woff2`, // browsers that support sw support woff2
    `${vendor.raven}/dist/raven.min.js`
  ]
}

var CACHE_NAMES = {
  app: 'app-cache-v5',
  vendor: 'vendor-cache-v5'
};

function isVendor(url) {
  return url.startsWith(cdn.unpkg) || url.startsWith(cdn.max);
}

function cacheAll(cacheName, urls) {
  return caches.open(cacheName).then((cache) => cache.addAll(urls));
}

function addToCache(cacheName, request, response) {
  if (response.ok) {
    var clone = response.clone()
    caches.open(cacheName).then((cache) => cache.put(request, clone));
  }
  return response;
}

function lookupCache(request) {
  return caches.match(request).then(function(cachedResponse) {
    if (!cachedResponse) {
      throw Error(`${request.url} not found in cache`);
    }
    return cachedResponse;
  });
}

function fetchThenCache(request, cacheName) {
  var fetchRequest = fetch(request);
  // add to cache, but don't block resolve of this promise on caching
  fetchRequest.then((response) => addToCache(cacheName, request, response));
  return fetchRequest;
}

function raceRequest(request, cacheName) {
  var attempts = [
    fetchThenCache(request, cacheName),
    lookupCache(request)
  ];
  return new Promise(function(resolve, reject) {
    // resolve this promise once one resolves
    attempts.forEach((attempt) => attempt.then(resolve));
    // reject if all promises reject
    attempts.reduce((verdict, attempt) => verdict.catch(() => attempt))
      .catch(() => reject(Error('Unable to resolve request from network or cache.')));
  })
}

function cleanupCache() {
  var validKeys = Object.keys(CACHE_NAMES).map((key) => CACHE_NAMES[key]);
  return caches.keys().then((localKeys) => Promise.all(
    localKeys.map((key) => {
      if (validKeys.indexOf(key) === -1) { // key no longer in our list
        return caches.delete(key);
      }
    })
  ));
}

self.addEventListener('install', function(evt) {
  var cachingCompleted = Promise.all([
    cacheAll(CACHE_NAMES.app, URLS.app),
    cacheAll(CACHE_NAMES.vendor, URLS.vendor)
  ]).then(() => self.skipWaiting())

  evt.waitUntil(cachingCompleted);
});

self.addEventListener('activate', function(evt) {
  evt.waitUntil(Promise.all([
    cleanupCache(),
    self.clients.claim() // claim immediately so the page can be controlled by the sw immediately
  ]));
});

self.addEventListener('fetch', function(evt) {
  var request = evt.request;
  var response;

  // only handle GET requests
  if (request.method !== 'GET') return;

  if (isVendor(request.url)) {
    // vendor requests: check cache first, fallback to fetch
    response = lookupCache(request)
      .catch(() => fetchThenCache(request, CACHE_NAMES.vendor));
  } else {
    // app request: race cache/fetch (bonus: update in background)
    response = raceRequest(request, CACHE_NAMES.app);
  }
  evt.respondWith(response);
});
