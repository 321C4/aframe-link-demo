(function () {
  if ('serviceWorker' in navigator) {
    var data = document.currentScript.dataset;
    console.log('CLIENT: service worker registration in progress');
    navigator.serviceWorker.register(data.serviceWorker, {
      scope: data.serviceWorkerScope
    }).then(function () {
      console.log('CLIENT: service worker registration complete');
    }, function () {
      console.log('CLIENT: service worker registration failure');
    });
  } else {
    console.log('CLIENT: service worker is not supported');
  }
})();
