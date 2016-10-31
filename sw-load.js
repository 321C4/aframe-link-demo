(function () {
  if ('serviceWorker' in navigator) {
    var debug = false;
    var log = debug ? console.log.bind(console) : function () {};

    var data = document.currentScript.dataset;
    log('CLIENT: service worker registration in progress');
    navigator.serviceWorker.register(data.serviceWorker, {
      scope: data.serviceWorkerScope
    }).then(function () {
      log('CLIENT: service worker registration complete');
      return navigator.serviceWorker.ready;
    }, function () {
      log('CLIENT: service worker registration failure');
    }).then(function () {
      log('CLIENT: service worker ready');
    });
  } else {
    log('CLIENT: service worker is not supported');
  }
})();
