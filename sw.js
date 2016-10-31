/* global caches, self */
var debug = 1;
var log = debug ? console.log.bind(console) : function () {};

var CURRENT_CACHES_HASHES = {
  static: '-v-b9fef8460e18d025367eac4a66302be28fcf82bc2f9557038870b75647c9a558'  // {STATIC_HASH}
};

var CURRENT_CACHES = {
  static: 'static-cache' + CURRENT_CACHES_HASHES.static
};

self.addEventListener('activate', function (event) {
  console.log('WORKER: activate event in progress.');

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
            log('Deleting out-of-date cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      ).then(function() {
        log('WORKER: activate completed');
      });
    })
  );
});

self.addEventListener('fetch', function (event) {
  log('WORKER: fetch event in progress.');

  /* We should only cache GET requests, and deal with the rest of method in the
     client-side, by handling failed POST,PUT,PATCH,etc. requests.
  */
  var path = new URL(event.request.url).pathname;
  var invalidPathMatches = path.match('/browser-sync/');
  if (event.request.method !== 'GET' || (invalidPathMatches && invalidPathMatches.length)) {
    /* If we don't block the event as shown below, then the request will go to
       the network as usual.
    */
    log('WORKER: fetch event ignored:', event.request.method, event.request.url);
    return;
  }
  /* Similar to event.waitUntil in that it blocks the fetch event on a promise.
     Fulfillment result will be used as the response, and rejection will end in a
     HTTP response indicating failure.
  */
  event.respondWith(
    caches
      /* This method returns a promise that resolves to a cache entry matching
         the request. Once the promise is settled, we can then provide a response
         to the fetch request.
      */
      .match(event.request)
      .then(function(cached) {
        /* Even if the response is in our cache, we go to the network as well.
           This pattern is known for producing "eventually fresh" responses,
           where we return cached responses immediately, and meanwhile pull
           a network response and store that in the cache.
           Read more:
           https://ponyfoo.com/articles/progressive-networking-serviceworker
        */
        var networked = fetch(event.request)
          // We handle the network request with success and failure scenarios.
          .then(fetchedFromNetwork, unableToResolve)
          // We should catch errors on the fetchedFromNetwork handler as well.
          .catch(unableToResolve);

        /* We return the cached response immediately if there is one, and fall
           back to waiting on the network as usual.
        */
        log('WORKER: fetched from', (cached ? 'cache' : 'network') + ':', event.request.url);

        return cached || networked;

        function fetchedFromNetwork (response) {
          /* We copy the response before replying to the network request.
             This is the response that will be stored on the ServiceWorker cache.
          */
          var cacheCopy = response.clone();

          log('WORKER: fetch response from network:', event.request.url);

          if (response.type !== 'basic') {
            log('WORKER: fetch response *not* stored in cache (cross-origin request:', event.request.url);
            return response;
          }

          caches
            // We open a cache to store the response for this request.
            .open(CURRENT_CACHES.static)
            .then(function add (cache) {
              /* We store the response for this request. It'll later become
                 available to caches.match(event.request) calls, when looking
                 for cached responses.
              */
              return cache.put(event.request, cacheCopy);
            })
            .then(function() {
              log('WORKER: fetch response stored in cache:', event.request.url);
            });

          // Return the response so that the promise is settled in fulfillment.
          return response;
        }

        /* When this method is called, it means we were unable to produce a response
           from either the cache or the network. This is our opportunity to produce
           a meaningful response even when all else fails. It's the last chance, so
           you probably want to display a "Service Unavailable" view or a generic
           error response.
        */
        function unableToResolve () {
          /* There's a couple of things we can do here.
             - Test the Accept header and then return one of the `offlineFundamentals`
               e.g: `return caches.match('/some/cached/image.png')`
             - You should also consider the origin. It's easier to decide what
               "unavailable" means for requests against your origins than for requests
               against a third party, such as an ad provider
             - Generate a Response programmaticaly, as shown below, and return that
          */

          log('WORKER: fetch request failed in both cache and network.');

          /* Here we're creating a response programmatically. The first parameter is the
             response body, and the second one defines the options for the response.
          */
          return new Response('<h1>Service Unavailable</h1>', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/html'
            })
          });
        }
      })
  );
});

// self.addEventListener('fetch', function (event) {
//   log('Handling fetch event for URL:', event.request.url);

//   event.respondWith(
//     caches.open(CURRENT_CACHES.static).then(function (cache) {
//       return cache.match(event.request).then(function (response) {
//         if (response) {
//           // If there is an entry in the cache for `event.request`, then `response` will be defined
//           // and we can just return it. Notice that only `static` resources are cached.
//           log(' Found response in cache:', response);

//           return response;
//         }

//         // Otherwise, if there is no entry in the cache for `event.request`, `response` will be
//         // `undefined`, and we need to `fetch()` the resource.
//         log(' No response for %s found in cache. About to fetch ' +
//           'from network:', event.request.url);

//         // We call `.clone()` on the request since we might use it in a call to `cache.put()` later on.
//         // Both `fetch()` and `cache.put()` "consume" the request, so we need to make a copy
//         // (https://fetch.spec.whatwg.org/#dom-request-clone).
//         return fetch(event.request.clone()).then(function (response) {
//           log('  Response for %s from network: %O',
//             event.request.url, event.request.url);
//           if (response.status < 400 &&
//               response.type === 'basic') {
//             // This avoids caching responses that we know are errors (i.e., 4xx/5xx HTTP status codes).
//             // Note that for opaque filtered responses (https://fetch.spec.whatwg.org/#concept-filtered-response-opaque),
//             // we can't access to the response headers, so this check will always fail and the resource won't be cached.
//             // (Reminder: cross-origin requests must serve CORS headers.)
//             // We call `.clone()` on the response to save a copy of it to the cache. By doing so, we get to keep
//             // the original response object which we will return back to the controlled page.
//             // (https://fetch.spec.whatwg.org/#dom-response-clone).
//             log('  Caching the response for URL:', event.request.url);
//             cache.put(event.request, response.clone());
//           } else {
//             console.log('  Not caching the response URL:', event.request.url);
//           }

//           // Return the original response object, which will be used to fulfill the resource request.
//           return response;
//         });
//       }).catch(function (err) {
//         // This `catch()` will handle exceptions that arise from the `match()` or `fetch()` operations.
//         // Note that a HTTP error response (e.g., 404) will *not* trigger an exception.
//         // It will return a normal response object that has the appropriate error code set.
//         console.error('  Error in fetch handler:', err);

//         throw err;
//       });
//     })
//   );
// });
