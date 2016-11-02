/* global caches, self */
var debug = false;
var log = debug ? console.log.bind(console) : function () {};

var CURRENT_CACHES_HASHES = {
  static: '-v-794863fa1e6a8ff07adc0322a614cf8a55a1681eea24f4e5e7157b352de20679'  // {STATIC_HASH}
};

var CURRENT_CACHES = {
  static: 'static-cache' + CURRENT_CACHES_HASHES.static
};

self.addEventListener('activate', function (event) {
  log('WORKER: activate event in progress');

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
