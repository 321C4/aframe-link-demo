/* global caches, self */
var CURRENT_CACHES = {
  static: 'static-cache-v-d040c9ffcd5bfdda05fc378d22b5d63b379a4da9985ce846c7a71888680ac21e'  // {STATIC_HASH}
};

self.addEventListener('activate', function (event) {
  // Delete all caches that aren't named in CURRENT_CACHES.
  // While there is only one cache in this example, the same logic will handle the case where
  // there are multiple versioned caches.
  var expectedCacheNames = Object.keys(CURRENT_CACHES).map(function (key) {
    return CURRENT_CACHES[key];
  });

  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (expectedCacheNames.indexOf(cacheName) === -1) {
            // If this cache name isn't present in the array of "expected" cache names, then delete it.
            console.log('Deleting out-of-date cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', function (event) {
  console.log('Handling fetch event for URL:', event.request.url);

  event.respondWith(
    caches.open(CURRENT_CACHES.static).then(function (cache) {
      return cache.match(event.request).then(function (response) {
        if (response) {
          // If there is an entry in the cache for `event.request`, then `response` will be defined
          // and we can just return it. Notice that only `static` resources are cached.
          console.log(' Found response in cache:', response);

          return response;
        }

        // Otherwise, if there is no entry in the cache for `event.request`, `response` will be
        // `undefined`, and we need to `fetch()` the resource.
        console.log(' No response for %s found in cache. About to fetch ' +
          'from network:', event.request.url);

        // We call `.clone()` on the request since we might use it in a call to `cache.put()` later on.
        // Both `fetch()` and `cache.put()` "consume" the request, so we need to make a copy
        // (https://fetch.spec.whatwg.org/#dom-request-clone).
        return fetch(event.request.clone()).then(function (response) {
          console.log('  Response for %s from network: %O',
            event.request.url, response);

          if (response.status < 400 &&
              event.request.url &&
              event.request.url.toLowerCase().indexOf('/sw.js') > -1) {
            // This avoids caching responses that we know are errors (i.e., 4xx/5xx HTTP status codes).
            // Note that for opaque filtered responses (https://fetch.spec.whatwg.org/#concept-filtered-response-opaque),
            // we can't access to the response headers, so this check will always fail and the resource won't be cached.
            // (Reminder: cross-origin requests must serve CORS headers.)
            // We call `.clone()` on the response to save a copy of it to the cache. By doing so, we get to keep
            // the original response object which we will return back to the controlled page.
            // (https://fetch.spec.whatwg.org/#dom-response-clone).
            console.log('  Caching the response for URL:', event.request.url);
            cache.put(event.request, response.clone());
          } else {
            console.log('  Not caching the response URL:', event.request.url);
          }

          // Return the original response object, which will be used to fulfill the resource request.
          return response;
        });
      }).catch(function (err) {
        // This `catch()` will handle exceptions that arise from the `match()` or `fetch()` operations.
        // Note that a HTTP error response (e.g., 404) will *not* trigger an exception.
        // It will return a normal response object that has the appropriate error code set.
        console.error('  Error in fetch handler:', err);

        throw err;
      });
    })
  );
});
