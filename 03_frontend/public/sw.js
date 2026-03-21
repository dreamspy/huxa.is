var APP_VERSION = "0.1.9";
var CACHE_NAME = "mnemo-" + APP_VERSION;
var SHELL_FILES = [
  ".",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "icons/icon-192.svg",
  "icons/icon-512.svg",
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; })
          .map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;

  // Don't intercept API requests — only cache app shell files
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first: try fresh content, fall back to cache when offline
  e.respondWith(
    fetch(e.request).then(function (response) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(e.request, clone);
      });
      return response;
    }).catch(function () {
      return caches.match(e.request).then(function (cached) {
        return cached || new Response("Offline", { status: 503 });
      });
    })
  );
});
